import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import * as Network from 'expo-network';
import { File, Paths } from 'expo-file-system';

import { createSyncPackage, applySyncPackage, SyncProgressCallback, SyncSummary } from '@services/integrations/syncService';

export interface QrPayload {
    ip: string;
    port: number;
    key: string;
}

export interface LiveSyncCallbacks {
    onProgress?: SyncProgressCallback;
    onDone?: (summary: SyncSummary) => void;
    onError?: (error: Error) => void;
}

export interface HostCallbacks extends LiveSyncCallbacks {
    onQrReady: (payload: QrPayload, expiresInSeconds: number) => void;
    onExpired: () => void;
    /** A peer connected and passed the key check; the exchange is starting. */
    onPeerConnected?: () => void;
}

export interface LiveSyncSession {
    cancel: () => void;
}

const HOST_TIMEOUT_SECONDS = 60;
const CONTROL_FRAME = 0;
const PACKAGE_FRAME = 1;

const generateSessionKey = (): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hashKey = (key: string): string => CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex);

/**
 * Reassembles length-prefixed frames from a raw TCP byte stream: `data` events can arrive
 * split mid-frame or with several frames coalesced into one chunk, so incoming bytes are
 * buffered until a complete `[1-byte type][4-byte BE length][payload]` frame is available.
 */
class FrameReader {
    private buffer: Buffer = Buffer.alloc(0);
    onFrame: ((type: number, payload: Buffer) => void) | null = null;

    feed(chunk: Buffer | string): void {
        const incoming = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
        this.buffer = Buffer.concat([this.buffer, incoming]);

        for (; ;) {
            if (this.buffer.length < 5) return;
            const type = this.buffer.readUInt8(0);
            const length = this.buffer.readUInt32BE(1);
            if (this.buffer.length < 5 + length) return;

            const payload = this.buffer.subarray(5, 5 + length);
            this.buffer = this.buffer.subarray(5 + length);
            this.onFrame?.(type, Buffer.from(payload));
        }
    }
}

const writeFrame = (socket: Socket, type: number, payload: Buffer): void => {
    const header = Buffer.alloc(5);
    header.writeUInt8(type, 0);
    header.writeUInt32BE(payload.length, 1);
    socket.write(Buffer.concat([header, payload]));
};

const writeControlFrame = (socket: Socket, message: object): void => {
    writeFrame(socket, CONTROL_FRAME, Buffer.from(JSON.stringify(message), 'utf8'));
};

/**
 * Runs after the handshake succeeds, identically on both the hosting and joining device:
 * each side sends its own encrypted sync package and applies whatever it receives from the
 * other. `createSyncPackage`/`applySyncPackage` are the same file-in/file-out functions the
 * old file-based sync UI used - here they're pointed at throwaway temp files instead of a
 * user-facing share sheet/document picker, and cleaned up immediately after use.
 */
const runExchange = async (
    socket: Socket,
    reader: FrameReader,
    sessionKey: string,
    onProgress?: SyncProgressCallback
): Promise<SyncSummary> => {
    const received = new Promise<SyncSummary>((resolve, reject) => {
        reader.onFrame = async (type, payload) => {
            if (type !== PACKAGE_FRAME) return;
            const tempFile = new File(Paths.cache, `live_sync_recv_${Date.now()}.zip`);
            try {
                tempFile.write(new Uint8Array(payload));
                const summary = await applySyncPackage(tempFile.uri, sessionKey, onProgress);
                resolve(summary);
            } catch (err) {
                reject(err as Error);
            } finally {
                try { tempFile.delete(); } catch { /* best effort */ }
            }
        };
    });

    const send = (async () => {
        const uri = await createSyncPackage(sessionKey, onProgress);
        const file = new File(uri);
        try {
            const bytes = await file.bytes();
            writeFrame(socket, PACKAGE_FRAME, Buffer.from(bytes));
        } finally {
            try { file.delete(); } catch { /* best effort */ }
        }
    })();

    const [summary] = await Promise.all([received, send]);
    writeControlFrame(socket, { type: 'DONE' });
    return summary;
};

/**
 * Device A's role: generates a one-time session key, starts a local TCP server, and hands
 * back the QR payload to display. Stops listening (single-use) the instant one peer
 * completes a full exchange, and independently on a 60s timeout if nobody connects.
 */
export const hostSyncSession = (callbacks: HostCallbacks): LiveSyncSession => {
    const sessionKey = generateSessionKey();
    const expectedKeyHash = hashKey(sessionKey);
    let settled = false;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;

    const server = TcpSocket.createServer((socket: Socket) => {
        if (settled) {
            socket.destroy();
            return;
        }

        const reader = new FrameReader();
        socket.on('data', (chunk: Buffer | string) => reader.feed(chunk));
        socket.on('error', (err: Error) => {
            if (!settled) callbacks.onError?.(err);
        });

        reader.onFrame = async (type, payload) => {
            // Guards against two peers connecting in the same tick (e.g. the QR scanned
            // twice): both sockets attach a reader before either's HELLO is processed, so
            // `settled` must be re-checked here, not just in the connection listener above.
            if (settled) {
                socket.destroy();
                return;
            }
            if (type !== CONTROL_FRAME) return;
            let message: any;
            try {
                message = JSON.parse(payload.toString('utf8'));
            } catch {
                return;
            }
            if (message?.type !== 'HELLO') return;

            if (message.keyHash !== expectedKeyHash) {
                writeControlFrame(socket, { type: 'REJECTED' });
                socket.destroy();
                return;
            }

            settled = true;
            if (expiryTimer) clearTimeout(expiryTimer);
            server.close();
            callbacks.onPeerConnected?.();
            writeControlFrame(socket, { type: 'ACCEPTED' });

            try {
                const summary = await runExchange(socket, reader, sessionKey, callbacks.onProgress);
                callbacks.onDone?.(summary);
            } catch (err) {
                callbacks.onError?.(err as Error);
            } finally {
                socket.end();
            }
        };
    });

    server.on('error', (err: Error) => {
        if (!settled) callbacks.onError?.(err);
    });

    (async () => {
        try {
            const ip = await Network.getIpAddressAsync();
            server.listen({ port: 0, host: '0.0.0.0' }, () => {
                const address = server.address();
                if (!address) {
                    callbacks.onError?.(new Error('Failed to start local server'));
                    return;
                }
                callbacks.onQrReady({ ip, port: address.port, key: sessionKey }, HOST_TIMEOUT_SECONDS);

                expiryTimer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    server.close();
                    callbacks.onExpired();
                }, HOST_TIMEOUT_SECONDS * 1000);
            });
        } catch (err) {
            callbacks.onError?.(err as Error);
        }
    })();

    return {
        cancel: () => {
            settled = true;
            if (expiryTimer) clearTimeout(expiryTimer);
            server.close();
        },
    };
};

/**
 * Device B's role: connects to the host's advertised IP:port from a scanned QR payload,
 * proves it knows the session key (without ever sending the key itself over the network),
 * and runs the same symmetric exchange as the host once accepted.
 */
export const joinSyncSession = (qrPayload: QrPayload, callbacks: LiveSyncCallbacks): LiveSyncSession => {
    let settled = false;
    const reader = new FrameReader();

    const socket = TcpSocket.createConnection(
        { port: qrPayload.port, host: qrPayload.ip, connectTimeout: 8000 },
        () => {
            writeControlFrame(socket, { type: 'HELLO', keyHash: hashKey(qrPayload.key) });
        }
    );

    socket.on('data', (chunk: Buffer | string) => reader.feed(chunk));

    socket.on('error', (err: Error) => {
        if (!settled) {
            settled = true;
            callbacks.onError?.(err);
        }
    });

    reader.onFrame = async (type, payload) => {
        if (type !== CONTROL_FRAME) return;
        let message: any;
        try {
            message = JSON.parse(payload.toString('utf8'));
        } catch {
            return;
        }

        if (message?.type === 'REJECTED') {
            settled = true;
            callbacks.onError?.(new Error('PAIRING_REJECTED'));
            socket.destroy();
            return;
        }

        if (message?.type === 'ACCEPTED') {
            try {
                const summary = await runExchange(socket, reader, qrPayload.key, callbacks.onProgress);
                settled = true;
                callbacks.onDone?.(summary);
            } catch (err) {
                settled = true;
                callbacks.onError?.(err as Error);
            } finally {
                socket.end();
            }
        }
    };

    return {
        cancel: () => {
            settled = true;
            socket.destroy();
        },
    };
};
