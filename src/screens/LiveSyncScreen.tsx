import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { useSecurity } from '@context/SecurityContext';
import { Button } from '@components/index';
import { hostSyncSession, joinSyncSession, QrPayload, LiveSyncSession } from '@services/integrations/liveSyncTransport';
import { SyncSummary } from '@services/integrations/syncService';
import { SEVERITY_ICON } from '@utils/severity';
import { type, space, radius } from '@styles/theme';

type ScreenState = 'choice' | 'hosting' | 'scanning' | 'connecting' | 'result' | 'error';

const LiveSyncScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();
    const [permission, requestPermission] = useCameraPermissions();

    const [state, setState] = useState<ScreenState>('choice');
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [progressLabel, setProgressLabel] = useState('Connecting…');
    const [summary, setSummary] = useState<SyncSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [hasScanned, setHasScanned] = useState(false);

    const sessionRef = useRef<LiveSyncSession | null>(null);
    // Guards handleBarcodeScanned against firing twice for the same code. `hasScanned`
    // (state) is what disables the CameraView's onBarcodeScanned prop, but React state
    // updates aren't synchronous - the camera can fire another scan event in the gap
    // before the re-render actually removes the prop. This ref is checked and set
    // synchronously, so a near-simultaneous second call is caught immediately.
    const hasScannedRef = useRef(false);

    useEffect(() => {
        return () => {
            sessionRef.current?.cancel();
        };
    }, []);

    useEffect(() => {
        if (state !== 'hosting') return;
        const timer = setInterval(() => {
            setSecondsLeft(s => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [state]);

    const goToChoice = () => {
        sessionRef.current?.cancel();
        sessionRef.current = null;
        setState('choice');
    };

    const startHosting = () => {
        temporarilyDisableLock();
        sessionRef.current?.cancel();
        setQrValue(null);
        setSecondsLeft(60);
        setState('hosting');

        sessionRef.current = hostSyncSession({
            onQrReady: (payload: QrPayload, expiresInSeconds) => {
                setQrValue(JSON.stringify(payload));
                setSecondsLeft(expiresInSeconds);
            },
            onPeerConnected: () => {
                setProgressLabel('Device found — starting sync…');
                setState('connecting');
            },
            onProgress: (p) => setProgressLabel(p.label),
            onDone: (result) => {
                setSummary(result);
                setState('result');
            },
            onExpired: () => {
                setErrorMessage('This code expired without a device connecting.');
                setState('error');
            },
            onError: (err) => {
                setErrorMessage(err.message || 'Something went wrong while hosting.');
                setState('error');
            },
        });
    };

    const startScanning = async () => {
        temporarilyDisableLock();
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                showAlert('Permission needed', 'Camera access is required to scan a sync code.');
                return;
            }
        }
        hasScannedRef.current = false;
        setHasScanned(false);
        setState('scanning');
    };

    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;

        let payload: QrPayload;
        try {
            const parsed = JSON.parse(result.data);
            if (!parsed?.ip || !parsed?.port || !parsed?.key) throw new Error('malformed');
            payload = parsed;
        } catch {
            hasScannedRef.current = false; // not a real scan - let the camera keep trying
            setErrorMessage("That code isn't a WealthSnap sync code.");
            setState('error');
            return;
        }

        setHasScanned(true);
        setProgressLabel('Connecting…');
        setState('connecting');

        sessionRef.current = joinSyncSession(payload, {
            onProgress: (p) => setProgressLabel(p.label),
            onDone: (result2) => {
                setSummary(result2);
                setState('result');
            },
            onError: (err) => {
                setErrorMessage(
                    err.message === 'PAIRING_REJECTED'
                        ? 'The other device rejected this code. Generate a new one and try again.'
                        : 'Could not connect. Make sure both devices are on the same WiFi network.'
                );
                setState('error');
            },
        });
    };

    const renderChoice = () => (
        <View style={styles.centerContent}>
            <Ionicons name="sync-outline" size={56} color={ds.text2} style={styles.bigIcon} />
            <Text style={[type.title, styles.bigTitle, { color: ds.text }]}>Sync from Device</Text>
            <Text style={[type.body, styles.subtitle, { color: ds.text2 }]}>
                Both devices need to be on the same WiFi network. One shows a code, the other scans it.
            </Text>
            <View style={styles.buttonWrapper}>
                <Button title="Show My Code" onPress={startHosting} style={styles.button} />
                <Button title="Scan a Code" onPress={startScanning} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    const renderHosting = () => (
        <View style={styles.centerContent}>
            <Text style={[type.title, styles.bigTitle, { color: ds.text }]}>Show this to your other device</Text>
            <View style={[styles.qrCard, { backgroundColor: ds.qrSurface }]}>
                {qrValue ? (
                    <QRCode value={qrValue} size={220} />
                ) : (
                    <ActivityIndicator size="large" color={ds.accent} />
                )}
            </View>
            <Text style={[type.bodyNum, styles.subtitle, { color: ds.text2 }]}>
                {qrValue ? `Expires in ${secondsLeft}s` : 'Starting local server…'}
            </Text>
            <View style={styles.buttonWrapper}>
                <Button title="Cancel" onPress={goToChoice} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    const renderScanning = () => (
        <View style={styles.cameraContainer}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scanOverlay} pointerEvents="none">
                <View style={[styles.scanFrame, { borderColor: ds.onMedia }]} />
            </View>
            <View style={[styles.scanFooter, { paddingBottom: insets.bottom + space[4] }]}>
                <Button title="Cancel" onPress={goToChoice} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    const renderConnecting = () => (
        <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={ds.accent} />
            <Text style={[type.body, styles.subtitle, { color: ds.text2, marginTop: space[5] }]}>{progressLabel}</Text>
        </View>
    );

    const renderResult = () => {
        const hasFailures = !!summary?.failures.length;
        return (
            <View style={styles.centerContent}>
                <Ionicons
                    name={hasFailures ? SEVERITY_ICON.warning : SEVERITY_ICON.success}
                    size={56}
                    color={hasFailures ? ds.warning : ds.success}
                    style={styles.bigIcon}
                />
                <Text style={[type.title, styles.bigTitle, { color: ds.text }]}>
                    {hasFailures ? 'Sync Partially Completed' : 'Sync Complete'}
                </Text>
                <Text style={[type.bodyNum, styles.subtitle, { color: ds.text2 }]}>
                    {summary ? `${summary.added} added, ${summary.updated} updated, ${summary.removed} removed.` : ''}
                </Text>
                {hasFailures && (
                    <Text style={[type.body, styles.subtitle, { color: ds.danger }]}>
                        {summary!.failures.length} failed to sync: {summary!.failures.join(', ')}. Try again to retry these.
                    </Text>
                )}
                <View style={styles.buttonWrapper}>
                    <Button title="Done" onPress={() => navigation.goBack()} style={styles.button} />
                </View>
            </View>
        );
    };

    const renderError = () => (
        <View style={styles.centerContent}>
            <Ionicons name={SEVERITY_ICON.error} size={56} color={ds.danger} style={styles.bigIcon} />
            <Text style={[type.title, styles.bigTitle, { color: ds.text }]}>Sync Failed</Text>
            <Text style={[type.body, styles.subtitle, { color: ds.text2 }]}>{errorMessage}</Text>
            <View style={styles.buttonWrapper}>
                <Button title="Try Again" onPress={goToChoice} style={styles.button} />
                <Button title="Close" onPress={() => navigation.goBack()} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: ds.canvas, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back" hitSlop={space[2]}>
                    <Ionicons name="chevron-back" size={22} color={ds.text2} />
                </Pressable>
                <Text style={[type.title, { color: ds.text }]}>Sync from Device</Text>
            </View>

            {state === 'choice' && renderChoice()}
            {state === 'hosting' && renderHosting()}
            {state === 'scanning' && renderScanning()}
            {state === 'connecting' && renderConnecting()}
            {state === 'result' && renderResult()}
            {state === 'error' && renderError()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingTop: space[1],
        paddingHorizontal: space[5],
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: space[6],
    },
    bigIcon: {
        marginBottom: space[5],
    },
    bigTitle: {
        marginBottom: space[3],
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: space[6],
    },
    buttonWrapper: {
        width: '100%',
        gap: space[3],
    },
    button: {
        width: '100%',
    },
    qrCard: {
        width: 260,
        height: 260,
        borderRadius: radius.md,
        // ds.qrSurface (white in every theme) is applied inline: scanners need dark on light.
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[5],
    },
    cameraContainer: {
        flex: 1,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 240,
        height: 240,
        borderRadius: radius.md,
        borderWidth: 3,
        // ds.onMedia (white in every theme) is applied inline: drawn over the camera feed.
    },
    scanFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: space[6],
        paddingTop: space[4],
    },
});

export default LiveSyncScreen;
