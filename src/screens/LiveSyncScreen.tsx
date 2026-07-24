import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

type ScreenState = 'choice' | 'hosting' | 'scanning' | 'connecting' | 'result' | 'error';

const LiveSyncScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
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
            <View style={[styles.bigIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="sync-circle" size={72} color={colors.primary} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.text }]}>Sync from Device</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
            <Text style={[styles.bigTitle, { color: colors.text, fontSize: 22 }]}>Show this to your other device</Text>
            <View style={styles.qrCard}>
                {qrValue ? (
                    <QRCode value={qrValue} size={220} />
                ) : (
                    <ActivityIndicator size="large" color={colors.primary} />
                )}
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scanOverlay} pointerEvents="none">
                <View style={styles.scanFrame} />
            </View>
            <View style={[styles.scanFooter, { paddingBottom: insets.bottom + 16 }]}>
                <Button title="Cancel" onPress={goToChoice} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    const renderConnecting = () => (
        <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.subtitle, { color: colors.textSecondary, marginTop: 20 }]}>{progressLabel}</Text>
        </View>
    );

    const renderResult = () => {
        const hasFailures = !!summary?.failures.length;
        return (
            <View style={styles.centerContent}>
                <View style={[styles.bigIconContainer, { backgroundColor: (hasFailures ? colors.error : colors.success) + '20' }]}>
                    <Ionicons name={hasFailures ? 'alert-circle' : 'checkmark-circle'} size={72} color={hasFailures ? colors.error : colors.success} />
                </View>
                <Text style={[styles.bigTitle, { color: colors.text }]}>
                    {hasFailures ? 'Sync Partially Completed' : 'Sync Complete'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {summary ? `${summary.added} added, ${summary.updated} updated, ${summary.removed} removed.` : ''}
                </Text>
                {hasFailures && (
                    <Text style={[styles.subtitle, { color: colors.error }]}>
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
            <View style={[styles.bigIconContainer, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="close-circle" size={72} color={colors.error} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.text }]}>Sync Failed</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{errorMessage}</Text>
            <View style={styles.buttonWrapper}>
                <Button title="Try Again" onPress={goToChoice} style={styles.button} />
                <Button title="Close" onPress={() => navigation.goBack()} variant="outline" style={styles.button} />
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Ionicons name="chevron-back" size={24} color={colors.text} onPress={() => navigation.goBack()} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Sync from Device</Text>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    bigIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    bigTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 30,
    },
    buttonWrapper: {
        width: '100%',
        gap: 10,
    },
    button: {
        width: '100%',
    },
    qrCard: {
        width: 260,
        height: 260,
        borderRadius: 16,
        // Intentionally not theme-aware: QR scanners need high contrast (dark modules on a
        // light background) to read reliably, regardless of whether the app is in dark mode.
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    cameraContainer: {
        flex: 1,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 240,
        height: 240,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    scanFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 30,
        paddingTop: 16,
    },
});

export default LiveSyncScreen;
