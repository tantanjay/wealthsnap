import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { CommonActions, NavigationProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import BackupRestoreModal from '@components/data/BackupRestoreModal';
import CsvImportFlow from '@components/data/CsvImportFlow';
import { Group, Row, SectionHeader } from '@components/ds';
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
    const { ds } = useTheme();
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
            } else if (msg === 'RESTORE_FAILED_ROLLED_BACK') {
                showAlert('Restore Failed', 'The restore failed partway through, but your previous data has been restored - nothing was lost.');
            } else if (msg === 'RESTORE_FAILED_ROLLBACK_FAILED') {
                showAlert('Restore Failed', 'The restore failed and your data may be incomplete. Please check your data, and restore from a known-good backup if needed.');
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
            <SectionHeader grouped title="Backup" />
            <Group>
                <Row icon="cloud-upload-outline" title="Backup data" subtitle="Create an encrypted backup file" chevron onPress={() => setModalMode('backup')} />
                <Row icon="cloud-download-outline" title="Restore data" subtitle="Load from a backup file" chevron onPress={handleSelectRestoreFile} last />
            </Group>

            <SectionHeader grouped title="Import and export" />
            <Group>
                <Row icon="download-outline" title="Import transactions" subtitle="Load from a CSV or TSV file" chevron onPress={() => setShowImportFlow(true)} />
                <Row
                    icon="grid-outline"
                    title="Export to Excel"
                    subtitle="Transactions, investments and debts as .xlsx"
                    onPress={isExporting ? undefined : handleExport}
                    trailing={isExporting ? <ActivityIndicator size="small" color={ds.accent} /> : undefined}
                />
                <Row icon="sync-outline" title="Sync from device" subtitle="Merge data with a nearby device over WiFi" chevron onPress={() => navigation.navigate('LiveSync')} last />
            </Group>

            <SectionHeader grouped title="Reset" />
            <Group>
                <Row icon="trash-outline" title="Clear all data" subtitle="Delete everything and restart" onPress={handleClearData} last />
            </Group>

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

export default DataManagementCard;
