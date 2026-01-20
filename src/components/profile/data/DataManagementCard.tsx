import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { Card, Button } from '../../index';

import BackupModal from './BackupModal';
import RestoreModal from './RestoreModal';
import { clearAllData, getUserProfile } from '../../../services/storageService';
import { createBackup, restoreFromBackup } from '../../../services/backupService';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { CommonActions, NavigationProp } from '@react-navigation/native';

interface DataManagementCardProps {
    navigation: NavigationProp<any>;
}

const DataManagementCard: React.FC<DataManagementCardProps> = ({ navigation }) => {
    const { colors } = useTheme();

    // Backup/Restore State
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

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
            const uri = await createBackup(password);
            setIsProcessing(false);
            setShowBackupModal(false);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                showAlert('Success', 'Backup created at ' + uri);
            }
        } catch (error) {
            setIsProcessing(false);
            showAlert('Error', 'Failed to create backup: ' + (error as Error).message);
        }
    };

    const handleSelectRestoreFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/zip',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                setRestoreFileUri(result.assets[0].uri);
                setShowRestoreModal(true);
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
            await restoreFromBackup(restoreFileUri, password);
            setIsProcessing(false);
            setShowRestoreModal(false);

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
            const msg = (error as Error).message;
            if (msg === 'INVALID_PASSWORD') {
                showAlert('Error', 'Incorrect password.');
            } else {
                showAlert('Error', 'Failed to restore: ' + msg);
            }
        }
    };

    return (
        <>
            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Data Management</Text>
                <Button variant="outline" title="Backup Data" onPress={() => setShowBackupModal(true)} style={{ marginBottom: 10 }} />
                <Button variant="outline" title="Restore Data" onPress={handleSelectRestoreFile} style={{ marginBottom: 10 }} />
                <Button variant="ghost" title="Clear All Data" onPress={handleClearData} />
            </Card>

            {/* Backup Modal */}
            <BackupModal
                visible={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                onBackup={handleCreateBackup}
                isProcessing={isProcessing}
            />

            {/* Restore Modal */}
            <RestoreModal
                visible={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                onRestore={handleRestore}
                isProcessing={isProcessing}
            />
        </>
    );
};

export default DataManagementCard;
