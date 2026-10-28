import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BackupRestoreModal from '@components/data/BackupRestoreModal';
import { ASYNC_KEYS } from '@constants/config';
import { useTheme } from '@context/ThemeContext';
import { BackupProgress, createBackup } from '@services/integrations/backupService';
import { generateUUID } from '@utils/uuid';
import { type, space, radius } from '@styles/theme';

interface Props {
    children: ReactNode;
}

// Lives inside the boundary's fallback, so it can't rely on providers that sit below the boundary.
const CrashBackupAction: React.FC = () => {
    const { ds } = useTheme();
    const [visible, setVisible] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<BackupProgress | null>(null);
    const [failure, setFailure] = useState<string | null>(null);

    const handleSubmit = async (password: string) => {
        if (!password) {
            setFailure('Password is required to encrypt your backup.');
            return;
        }

        setFailure(null);
        setIsProcessing(true);
        try {
            const uri = await createBackup(password, setProgress);
            setVisible(false);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                setFailure(`Backup created at ${uri}`);
            }
        } catch (e) {
            setFailure(`Failed to create backup: ${(e as Error).message}`);
        } finally {
            setIsProcessing(false);
            setProgress(null);
        }
    };

    return (
        <>
            <TouchableOpacity style={[styles.button, styles.secondaryButton, { backgroundColor: ds.inset }]} onPress={() => setVisible(true)}>
                <Text style={[type.bodyStrong, { color: ds.text }]}>Back up data</Text>
            </TouchableOpacity>
            {failure ? <Text style={[type.small, styles.backupMessage, { color: ds.danger }]}>{failure}</Text> : null}
            {/* The app-level SafeAreaProvider is below the boundary, so the modal needs its own. */}
            <SafeAreaProvider>
                <BackupRestoreModal
                    visible={visible}
                    mode="backup"
                    onClose={() => setVisible(false)}
                    onSubmit={handleSubmit}
                    isProcessing={isProcessing}
                    progress={progress}
                />
            </SafeAreaProvider>
        </>
    );
};

// ThemeProvider sits above the boundary, so the fallback can still read tokens.
const CrashScreen: React.FC<{ error: Error | null; onRestart: () => void }> = ({ error, onRestart }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.container, { backgroundColor: ds.bg }]}>
            <View style={styles.content}>
                <Ionicons name="alert-circle-outline" size={56} color={ds.danger} />
                <Text style={[type.title, styles.title, { color: ds.text }]}>Something went wrong</Text>
                <Text style={[type.small, styles.subtitle, { color: ds.text2 }]}>
                    We&apos;re sorry, but the app has encountered an unexpected error.
                </Text>

                <ScrollView style={[styles.errorContainer, { backgroundColor: ds.inset }]}>
                    <Text style={[type.caption, { color: ds.danger }]}>
                        {error && error.toString()}
                    </Text>
                </ScrollView>

                <TouchableOpacity style={[styles.button, { backgroundColor: ds.accent }]} onPress={onRestart}>
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Reload app</Text>
                </TouchableOpacity>
                <CrashBackupAction />
            </View>
        </View>
    );
};

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // PrivacyGuard unmounts with the crash and may leave screenshots blocked; the error is what users need to capture.
        ScreenCapture.allowScreenCaptureAsync().catch(() => { });

        // Save crash report for later analysis
        this.saveCrashReport(error, errorInfo);
    }

    saveCrashReport = async (error: Error, errorInfo: ErrorInfo) => {
        try {
            const report = {
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            };

            const existingData = await AsyncStorage.getItem(ASYNC_KEYS.CRASH_REPORT);
            let reports = [];

            if (existingData) {
                try {
                    const parsed = JSON.parse(existingData);
                    if (Array.isArray(parsed)) {
                        reports = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        // Migrate old single object structure to array
                        reports = [parsed];
                    }
                } catch (e) {
                    console.error('Failed to parse existing crash reports', e);
                }
            }

            // Add new report
            reports.push(report);

            // Retention strategy: Keep reports from the last 7 days
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            reports = reports.filter(r => {
                const reportTime = new Date(r.timestamp).getTime();
                return (now - reportTime) < SEVEN_DAYS_MS;
            });

            // Limit to last 20 reports total to prevent storage bloat
            if (reports.length > 20) {
                reports = reports.slice(-20);
            }

            await AsyncStorage.setItem(ASYNC_KEYS.CRASH_REPORT, JSON.stringify(reports));
        } catch (e) {
            console.error('Failed to save crash report', e);
        }
    }

    handleRestart = async () => {
        try {
            await Updates.reloadAsync();
        } catch {
            // Fallback if reloadAsync fails or not available in dev client sometimes
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return <CrashScreen error={this.state.error} onRestart={this.handleRestart} />;
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: space[5],
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        marginTop: space[5],
        marginBottom: space[2],
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: space[6],
    },
    errorContainer: {
        maxHeight: 200,
        width: '100%',
        padding: space[3],
        borderRadius: radius.sm,
        marginBottom: space[6],
    },
    button: {
        alignSelf: 'stretch',
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        marginTop: space[3],
    },
    backupMessage: {
        marginTop: space[3],
        textAlign: 'center',
    },
});
