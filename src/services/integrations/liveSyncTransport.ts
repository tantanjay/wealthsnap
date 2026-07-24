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
// A sync package is JSON+zip of a personal finance history - generous but not unbounded,
// so a peer (or anything else that connects to the host's port) can't claim an arbitrary
// frame length and force unbounded buffering while we wait for bytes that never arrive.
const MAX_FRAME_SIZE = 200 * 1024 * 1024;

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
    private rejected = false;
    onFrame: ((type: number, payload: Buffer) => void) | null = null;
    // Caller-supplied: an oversized frame is a protocol violation, not just "wait for more
    // data", so the caller (who owns the socket) decides how to react - e.g. silently drop
    // an unauthenticated pre-handshake connection and keep listening, vs. treat it as fatal
    // once a peer has passed the key check. Setting onFrame=null alone wouldn't be enough:
    // feed() still concats every incoming chunk into `buffer` before this check runs, so the
    // buffer would keep growing on subsequent chunks even with no frame handler attached.
    onOversizedFrame: (() => void) | null = null;

    feed(chunk: Buffer | string): void {
        if (this.rejected) return;
        const incoming = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
        this.buffer = Buffer.concat([this.buffer, incoming]);

        for (; ;) {
            if (this.buffer.length < 5) return;
            const type = this.buffer.readUInt8(0);
            const length = this.buffer.readUInt32BE(1);
            if (length > MAX_FRAME_SIZE) {
                this.rejected = true;
                this.buffer = Buffer.alloc(0);
                this.onOversizedFrame?.();
                return;
            }
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
    // createSyncPackage (sending) and applySyncPackage (receiving) run concurrently below and
    // would otherwise both drive the same onProgress callback, interleaving "Encrypting..."
    // and "Decrypting..." labels unpredictably. Prefix each side so the UI shows which phase
    // a given label actually belongs to.
    const onSendProgress: SyncProgressCallback | undefined = onProgress
        ? (p) => onProgress({ ...p, label: `Sending: ${p.label}` })
        : undefined;
    const onReceiveProgress: SyncProgressCallback | undefined = onProgress
        ? (p) => onProgress({ ...p, label: `Receiving: ${p.label}` })
        : undefined;

    // A dropped connection (peer backgrounds the app, WiFi drops, etc.) must not leave either
    // side waiting forever on a frame that will never arrive - reject the exchange if the
    // socket dies, racing it against the actual send/receive work below. But a 'close' isn't
    // always a failure: whichever side finishes first calls socket.end() in its own cleanup,
    // and TCP's ordering guarantees the peer will have already received that side's frame
    // (and already sent its own, since receiving requires the sender to have sent first)
    // before the resulting close reaches them - so once both frames have actually changed
    // hands, a close is just normal teardown, not a signal that anything went wrong. Only the
    // local finishing touch (applying the received package, which is pure disk/DB work and
    // doesn't need the socket) may still be in flight at that point, and it should be allowed
    // to complete on its own rather than being aborted by the peer hanging up right on cue.
    let frameArrived = false;
    let ownFrameSent = false;
    let failExchange: (err: Error) => void = () => { };
    const socketFailure = new Promise<never>((_, reject) => { failExchange = reject; });
    const failIfIncomplete = (err: Error) => {
        if (frameArrived && ownFrameSent) return;
        failExchange(err);
    };
    const onSocketError = (err: Error) => failIfIncomplete(err);
    const onSocketClose = () => failIfIncomplete(new Error('CONNECTION_CLOSED'));
    socket.once('error', onSocketError);
    socket.once('close', onSocketClose);
    reader.onOversizedFrame = () => {
        failIfIncomplete(new Error('FRAME_TOO_LARGE'));
        socket.destroy();
    };

    try {
        const received = new Promise<SyncSummary>((resolve, reject) => {
            reader.onFrame = async (type, payload) => {
                if (type !== PACKAGE_FRAME) return;
                frameArrived = true;
                const tempFile = new File(Paths.cache, `live_sync_recv_${Date.now()}.zip`);
                try {
                    tempFile.write(new Uint8Array(payload));
                    const summary = await applySyncPackage(tempFile.uri, sessionKey, onReceiveProgress);
                    resolve(summary);
                } catch (err) {
                    reject(err as Error);
                } finally {
                    try { tempFile.delete(); } catch { /* best effort */ }
                }
            };
        });

        const send = (async () => {
            const uri = await createSyncPackage(sessionKey, onSendProgress);
            const file = new File(uri);
            try {
                const bytes = await file.bytes();
                writeFrame(socket, PACKAGE_FRAME, Buffer.from(bytes));
                ownFrameSent = true;
            } finally {
                try { file.delete(); } catch { /* best effort */ }
            }
        })();

        const [summary] = await Promise.race([
            Promise.all([received, send]),
            socketFailure,
        ]);

        // Best-effort only - by this point the exchange has already succeeded regardless
        // of whether the peer's socket is still around to receive this.
        try { writeControlFrame(socket, { type: 'DONE' }); } catch { /* best effort */ }
        return summary;
    } finally {
        socket.off('error', onSocketError);
        socket.off('close', onSocketClose);
        reader.onOversizedFrame = null;
    }
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
    // Sockets that have connected but not yet completed the HELLO handshake - closed
    // sockets remove themselves; anything left over is force-closed on expiry/cancel/timeout
    // so a stalled or bogus connection can't keep a listening socket alive indefinitely.
    const pendingSockets = new Set<Socket>();
    const HANDSHAKE_TIMEOUT_MS = 10 * 1000;

    const server = TcpSocket.createServer((socket: Socket) => {
        if (settled) {
            socket.destroy();
            return;
        }

        pendingSockets.add(socket);
        const handshakeTimer = setTimeout(() => socket.destroy(), HANDSHAKE_TIMEOUT_MS);
        const forgetPending = () => {
            clearTimeout(handshakeTimer);
            pendingSockets.delete(socket);
        };
        socket.on('close', forgetPending);

        const reader = new FrameReader();
        socket.on('data', (chunk: Buffer | string) => reader.feed(chunk));
        socket.on('error', (err: Error) => {
            if (!settled) callbacks.onError?.(err);
        });
        // Pre-handshake, an oversized frame just means this particular connection is bogus
        // (or not our intended peer) - drop it and keep listening for the real one, same as
        // an unrecognized key hash below. runExchange installs its own handler for the
        // post-handshake case, where it's treated as fatal instead.
        reader.onOversizedFrame = () => socket.destroy();

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

            forgetPending(); // handshake succeeded - this socket is now the active exchange, not pending
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
                    pendingSockets.forEach(s => s.destroy());
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
            pendingSockets.forEach(s => s.destroy());
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
    // Unlike the host (which may see bogus connections from other devices on the network),
    // the join side only ever talks to the one host it deliberately connected to - so an
    // oversized frame at any point is treated as fatal, not silently dropped.
    reader.onOversizedFrame = () => {
        settled = true;
        socket.destroy();
        callbacks.onError?.(new Error('FRAME_TOO_LARGE'));
    };

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
            // Settle now, before the exchange starts: runExchange installs its own
            // error/close listeners for the exchange phase, so this generic listener
            // (registered above) must go inert here rather than double-firing onError
            // alongside it - same timing the host side already uses.
            settled = true;
            try {
                const summary = await runExchange(socket, reader, qrPayload.key, callbacks.onProgress);
                callbacks.onDone?.(summary);
            } catch (err) {
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
