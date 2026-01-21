import React, { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { Card } from '../../index';
import { Ionicons } from '@expo/vector-icons';

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

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        iconBg,
        iconColor,
        isLast = false
    }: {
        icon: string,
        title: string,
        subtitle?: string,
        onPress: () => void,
        iconBg?: string,
        iconColor?: string,
        isLast?: boolean
    }) => (
        <TouchableOpacity
            style={[
                styles.settingItem,
                { borderBottomColor: colors.border },
                isLast && { borderBottomWidth: 0 }
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconBg || colors.primary + '20' }]}>
                <Ionicons name={icon as any} size={22} color={iconColor || colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

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
                    onPress={() => setShowBackupModal(true)}
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
                    icon="trash"
                    title="Clear All Data"
                    subtitle="Delete everything and restart"
                    onPress={handleClearData}
                    iconBg={colors.error + '20'}
                    iconColor={colors.error}
                    isLast={true}
                />
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
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
    },
});

export default DataManagementCard;

