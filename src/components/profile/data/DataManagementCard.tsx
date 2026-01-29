import React, { useState, useCallback } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Modal, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions, NavigationProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import BackupModal from '@components/profile/data/BackupModal';
import RestoreModal from '@components/profile/data/RestoreModal';
import ImportDataModal from '@components/profile/data/ImportDataModal';
import ImportProcessScreen from '@components/profile/data/ImportProcessScreen';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { useSecurity } from '@context/SecurityContext';
import { Transaction } from '@types';
import { clearAllData, getUserProfile } from '@services/core/storageService';
import { createBackup, restoreFromBackup } from '@services/integrations';
import { bulkSaveTransactions, getAllTransactions } from '@services/domain';
import * as Import from '@services/integrations';

interface DataManagementCardProps {
    navigation: NavigationProp<any>;
}

const DataManagementCard: React.FC<DataManagementCardProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const { temporarilyDisableLock } = useSecurity();

    // Backup/Restore State
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [showImportProcess, setShowImportProcess] = useState(false);
    const [isImportProcessing, setIsImportProcessing] = useState(false);
    const [isImportSaving, setIsImportSaving] = useState(false);
    const [importSummary, setImportSummary] = useState<Import.ImportSummary | null>(null);
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [currency, setCurrency] = useState('PHP');

    const { showAlert } = useAlert();

    // Fetch currency on focus
    useFocusEffect(
        useCallback(() => {
            const fetchCurrency = async () => {
                const profile = await getUserProfile();
                if (profile?.currency) {
                    setCurrency(profile.currency);
                }
            };
            fetchCurrency();
        }, [])
    );

    // Handle back button during import process
    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                if (showImportProcess) {
                    // Block back during import process
                    return true;
                }
                return false;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [showImportProcess])
    );

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
                temporarilyDisableLock();
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

    /**
     * Handle file selection for import
     */
    const handleSelectImportFile = async () => {
        try {
            temporarilyDisableLock();
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/tab-separated-values', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                setShowImportModal(false);
                setShowImportProcess(true);
                setIsImportProcessing(true);
                setImportSummary(null);
                setPendingTransactions([]);

                await processImportFile(result.assets[0].uri);
            }
        } catch {
            showAlert('Error', 'Failed to pick file');
        }
    };

    /**
     * Process the import file
     */
    const processImportFile = async (fileUri: string) => {
        try {
            // Read file content
            const content = await FileSystem.readAsStringAsync(fileUri);

            // Parse CSV/TSV
            const { headers, rows } = Import.parseCSV(content);

            // Validate headers
            const headerError = Import.validateHeaders(headers);
            if (headerError) {
                setIsImportProcessing(false);
                setShowImportProcess(false);
                showAlert('Invalid File Format', headerError);
                return;
            }

            if (rows.length === 0) {
                setIsImportProcessing(false);
                setShowImportProcess(false);
                showAlert('Empty File', 'The file contains no data rows to import.');
                return;
            }

            // Get existing transactions for duplicate detection
            const existingTransactions = await getAllTransactions();

            // Validate data
            const validationResult = Import.validateImportData(rows, existingTransactions);

            if (!validationResult.isValid) {
                setIsImportProcessing(false);
                setShowImportProcess(false);

                const errorDetails = Import.formatValidationErrors(validationResult.errors);
                const errorCount = validationResult.errors.length;

                showAlert(
                    'Validation Errors',
                    `Found ${errorCount} error${errorCount > 1 ? 's' : ''} in your file.`,
                    [{ text: 'OK' }],
                    { details: errorDetails }
                );
                return;
            }

            // Prepare transactions
            const transactions = Import.prepareTransactions(validationResult.validRows);
            const summary = Import.calculateImportSummary(transactions);

            setPendingTransactions(transactions);
            setImportSummary(summary);
            setIsImportProcessing(false);

        } catch (error) {
            setIsImportProcessing(false);
            setShowImportProcess(false);
            showAlert('Error', 'Failed to process file: ' + (error as Error).message);
        }
    };

    /**
     * Confirm and save imported transactions
     */
    const handleConfirmImport = async () => {
        setIsImportSaving(true);

        // Short delay to allow the UI to render the loading state before heavy processing begins
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            await bulkSaveTransactions(pendingTransactions);

            setIsImportSaving(false);
            setShowImportProcess(false);
            setPendingTransactions([]);
            setImportSummary(null);

            showAlert(
                'Import Successful',
                `Successfully imported ${pendingTransactions.length} transactions!`
            );

        } catch (error) {
            setIsImportSaving(false);
            showAlert('Error', 'Failed to save transactions: ' + (error as Error).message);
        }
    };

    /**
     * Cancel import
     */
    const handleCancelImport = () => {
        setShowImportProcess(false);
        setPendingTransactions([]);
        setImportSummary(null);
        setIsImportProcessing(false);
        setIsImportSaving(false);
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
                    icon="download-outline"
                    title="Import Transactions"
                    subtitle="Load from CSV or TSV file"
                    onPress={() => setShowImportModal(true)}
                    iconBg={colors.accent + '20'}
                    iconColor={colors.accent}
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

            {/* Import Modal */}
            <ImportDataModal
                visible={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSelectFile={handleSelectImportFile}
            />

            {/* Import Process Screen (Full Screen Modal) */}
            <Modal
                visible={showImportProcess}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    // Block back during processing/saving
                    if (!isImportProcessing && !isImportSaving) {
                        handleCancelImport();
                    }
                }}
            >
                <ImportProcessScreen
                    isProcessing={isImportProcessing}
                    isSaving={isImportSaving}
                    summary={importSummary}
                    currency={currency}
                    onConfirm={handleConfirmImport}
                    onCancel={handleCancelImport}
                />
            </Modal>

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


