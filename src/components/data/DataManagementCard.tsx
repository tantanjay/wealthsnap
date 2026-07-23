import React, { useState } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, NavigationProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import BackupRestoreModal from '@components/data/BackupRestoreModal';
import CsvImportFlow from '@components/data/CsvImportFlow';
import SettingItem from '@components/common/SettingItem';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { useSecurity } from '@context/SecurityContext';
import { clearAllData, getUserProfile, saveLastBackupDate } from '@services/core/storageService';
import { createBackup, restoreFromBackup, BackupProgress } from '@services/integrations/backupService';
import { exportToExcel } from '@services/integrations/exportService';

interface DataManagementCardProps {
    navigation: NavigationProp<any>;
}

type ModalMode = 'backup' | 'restore';

const DataManagementCard: React.FC<DataManagementCardProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const { temporarilyDisableLock } = useSecurity();

    // Backup/Restore State
    const [modalMode, setModalMode] = useState<ModalMode | null>(null);
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<BackupProgress | null>(null);

    // Import State
    const [showImportFlow, setShowImportFlow] = useState(false);

    // Export State
    const [isExporting, setIsExporting] = useState(false);

    const { showAlert } = useAlert();

    /**
     * Wipes all data (SQLite + AsyncStorage) and resets the app state.
     */
    const handleClearData = async () => {
        showAlert(
            'Clear Data',
            'Are you sure you want to delete all data? This cannot be undone. The app will restart automatically.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        await clearAllData();
                        // Reset navigation to Welcome screen (simulates app restart)
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Onboarding' }],
                            })
                        );
                    }
                }
            ]
        );
    };

    /**
     * Creates a secure backup of all user data.
     * Encrypts the payload with the provided password.
     */
    const handleCreateBackup = async (password: string) => {
        if (!password) {
            showAlert('Error', 'Password is required to encrypt your backup.');
            return;
        }

        try {
            setIsProcessing(true);
            const uri = await createBackup(password, setProgress);
            setIsProcessing(false);
            setProgress(null);
            setModalMode(null);

            if (await Sharing.isAvailableAsync()) {
                temporarilyDisableLock();
                await Sharing.shareAsync(uri);
            } else {
                showAlert('Success', 'Backup created at ' + uri);
            }
        } catch (error) {
            setIsProcessing(false);
            setProgress(null);
            showAlert('Error', 'Failed to create backup: ' + (error as Error).message);
        }
    };

    const handleSelectRestoreFile = async () => {
        try {
            temporarilyDisableLock();
            const result = await DocumentPicker.getDocumentAsync({
                // Accept multiple MIME types for zip files since different sources
                // (cloud storage, messaging apps, etc.) may report different types
                type: [
                    'application/zip',
                    'application/x-zip',
                    'application/x-zip-compressed',
                    'application/octet-stream',
                    '*/*'  // Fallback to allow any file if needed
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                setRestoreFileUri(result.assets[0].uri);
                setModalMode('restore');
            }
        } catch {
            showAlert('Error', 'Failed to pick file');
        }
    };

    /**
     * Restores data from the selected backup file.
     * Decrypts using the password and replaces current data.
     */
    const handleRestore = async (password: string) => {
        if (!restoreFileUri) return;
        if (!password) {
            showAlert('Error', 'Password is required.');
            return;
        }

        try {
            setIsProcessing(true);
            await restoreFromBackup(restoreFileUri, password, setProgress);
            setIsProcessing(false);
            setProgress(null);
            setModalMode(null);

            await saveLastBackupDate(new Date().toISOString());

            showAlert('Success', 'Data restored successfully. The app will reload.', [
                {
                    text: 'OK', onPress: async () => {
                        // Verify the restore set the proper flags
                        const profile = await getUserProfile();
                        if (profile && profile.isOnboardingComplete) {
                            // Reset to Main to refresh everything
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                        } else {
                            // If backup was from a state before onboarding completion (unlikely but possible)
                            // or if restore failed silently.
                            showAlert('Notice', 'Restore complete, but user profile is incomplete. Redirecting to setup.');
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Onboarding' }],
                            });
                        }
                    }
                }
            ]);
        } catch (error) {
            setIsProcessing(false);
            setProgress(null);
            const msg = (error as Error).message;
            if (msg === 'INVALID_PASSWORD') {
                showAlert('Error', 'Incorrect password.');
            } else {
                showAlert('Error', 'Failed to restore: ' + msg);
            }
        }
    };

    /**
     * Exports all data to a plain (unencrypted) multi-sheet .xlsx file for viewing in Excel.
     */
    const handleExport = async () => {
        try {
            setIsExporting(true);
            const uri = await exportToExcel();
            setIsExporting(false);

            if (await Sharing.isAvailableAsync()) {
                temporarilyDisableLock();
                await Sharing.shareAsync(uri);
            } else {
                showAlert('Success', 'Export created at ' + uri);
            }
        } catch (error) {
            setIsExporting(false);
            showAlert('Error', 'Failed to export: ' + (error as Error).message);
        }
    };

    return (
        <>
            <Card style={{ marginBottom: 16 }}>
                <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: colors.info + '20' }]}>
                        <Ionicons name="shield-checkmark" size={22} color={colors.info} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Data Management</Text>
                </View>

                <SettingItem
                    icon="cloud-upload"
                    title="Backup Data"
                    subtitle="Create encrypted backup file"
                    onPress={() => setModalMode('backup')}
                    iconBg={colors.success + '20'}
                    iconColor={colors.success}
                />
                <SettingItem
                    icon="cloud-download"
                    title="Restore Data"
                    subtitle="Import from backup file"
                    onPress={handleSelectRestoreFile}
                    iconBg={colors.primary + '20'}
                    iconColor={colors.primary}
                />
                <SettingItem
                    icon="download-outline"
                    title="Import Transactions"
                    subtitle="Load from CSV or TSV file"
                    onPress={() => setShowImportFlow(true)}
                    iconBg={colors.accent + '20'}
                    iconColor={colors.accent}
                />
                <SettingItem
                    icon="grid-outline"
                    title="Export to Excel"
                    subtitle="Save transactions, investments & debts as .xlsx"
                    onPress={isExporting ? undefined : handleExport}
                    iconBg={colors.accent + '20'}
                    iconColor={colors.accent}
                    rightElement={isExporting ? <ActivityIndicator size="small" color={colors.accent} /> : undefined}
                />
                <SettingItem
                    icon="sync-circle"
                    title="Sync from Device"
                    subtitle="Merge data with a nearby device over WiFi"
                    onPress={() => navigation.navigate('LiveSync')}
                    iconBg={colors.primary + '20'}
                    iconColor={colors.primary}
                />
                <SettingItem
                    icon="trash"
                    title="Clear All Data"
                    subtitle="Delete everything and restart"
                    onPress={handleClearData}
                    iconBg={colors.error + '20'}
                    iconColor={colors.error}
                    isLast={true}
                />
            </Card>

            <CsvImportFlow
                visible={showImportFlow}
                onRequestClose={() => setShowImportFlow(false)}
            />

            <BackupRestoreModal
                visible={modalMode !== null}
                mode={modalMode ?? 'backup'}
                onClose={() => setModalMode(null)}
                onSubmit={modalMode === 'restore' ? handleRestore : handleCreateBackup}
                isProcessing={isProcessing}
                progress={progress}
            />
        </>
    );
};

const styles = StyleSheet.create({
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
});

export default DataManagementCard;
