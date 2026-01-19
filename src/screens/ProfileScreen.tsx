import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Alert, TouchableOpacity, StyleSheet, Modal, FlatList, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import BackupModal from '../components/modals/BackupModal';
import RestoreModal from '../components/modals/RestoreModal';
import { RecurringRulesListModal } from '../components/modals/RecurringRulesListModal';
import BudgetManagementModal from '../components/modals/BudgetManagementModal';
import SupportModal from '../components/modals/SupportModal';
import GeminiSettingsModal from '../components/modals/GeminiSettingsModal';
import { clearAllData, saveGeminiConfig, getGeminiConfig, getAllRecurrenceRules, saveRecurrenceRule, deleteRecurrenceRule, getUserProfile } from '../services/storageService';
import { RecurrenceRule } from '../types';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { createBackup, restoreFromBackup } from '../services/backupService';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { isPinSet, getTimeoutSetting, saveTimeoutSetting, TimeoutOption, TIMEOUT_OPTIONS } from '../services/securityService';
import PinCreationScreen from './PinCreationScreen';
import OnboardingGuide from './Onboarding/OnboardingGuide';


const ProfileScreen = ({ navigation }: any) => {
    const { colors, setMode, mode } = useTheme();
    const [hasApiKey, setHasApiKey] = useState(false);

    // Security State
    const [hasPin, setHasPin] = useState(false);
    const [timeoutSetting, setTimeoutSetting] = useState<TimeoutOption>('daily');
    const [showPinModal, setShowPinModal] = useState(false);

    // Backup/Restore State
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    // passwords are now managed inside the modals
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Recurring Rules State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [currency, setCurrency] = useState('USD');

    // Budget State
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    // Support Modal State
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showGeminiModal, setShowGeminiModal] = useState(false);


    useFocusEffect(
        useCallback(() => {
            checkApiKey();
            checkSecuritySettings();
        }, [])
    );

    const checkSecuritySettings = async () => {
        const pinSet = await isPinSet();
        setHasPin(pinSet);
        const timeout = await getTimeoutSetting();
        setTimeoutSetting(timeout);

        const profile = await getUserProfile();
        if (profile?.currency) {
            setCurrency(profile.currency);
        }
    };

    const handleSetTimeout = async (option: TimeoutOption) => {
        await saveTimeoutSetting(option);
        setTimeoutSetting(option);
    };

    const checkApiKey = async () => {
        const config = await getGeminiConfig();
        if (config && config.apiKey) {
            setHasApiKey(true);
        }
    };

    const handleClearData = async () => {
        Alert.alert(
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



    const handleCreateBackup = async (password: string) => {
        if (!password) {
            Alert.alert('Error', 'Password is required to encrypt your backup.');
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
                Alert.alert('Success', 'Backup created at ' + uri);
            }
        } catch (error) {
            setIsProcessing(false);
            Alert.alert('Error', 'Failed to create backup: ' + (error as Error).message);
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
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleRestore = async (password: string) => {
        if (!restoreFileUri) return;
        if (!password) {
            Alert.alert('Error', 'Password is required.');
            return;
        }

        try {
            setIsProcessing(true);
            await restoreFromBackup(restoreFileUri, password);
            setIsProcessing(false);
            setShowRestoreModal(false);

            Alert.alert('Success', 'Data restored successfully. The app will reload.', [
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
                            Alert.alert('Notice', 'Restore complete, but user profile is incomplete. Redirecting to setup.');
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
                Alert.alert('Error', 'Incorrect password.');
            } else {
                Alert.alert('Error', 'Failed to restore: ' + msg);
            }
        }
    };

    const handleManageRecurring = async () => {
        const rules = await getAllRecurrenceRules();
        setRecurrenceRules(rules);
        setShowRecurringModal(true);
    };

    const handleToggleRule = async (rule: RecurrenceRule) => {
        try {
            const updatedRule = { ...rule, isActive: !rule.isActive };
            await saveRecurrenceRule(updatedRule);
            // Refresh list
            const rules = await getAllRecurrenceRules();
            setRecurrenceRules(rules);
        } catch (error) {
            Alert.alert('Error', 'Failed to update rule');
        }
    };

    const handleDeleteRule = (id: string) => {
        Alert.alert(
            "Delete Rule",
            "Stop this recurring transaction? Past transactions will remain.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteRecurrenceRule(id);
                        const rules = await getAllRecurrenceRules();
                        setRecurrenceRules(rules);
                    }
                }
            ]
        );
    };

    const ThemeOption = ({ title, value, current }: { title: string, value: 'light' | 'dark' | 'system', current: string }) => (
        <TouchableOpacity
            style={[
                styles.themeButton,
                {
                    backgroundColor: current === value ? colors.primary : 'transparent',
                    borderColor: current === value ? colors.primary : colors.border,
                }
            ]}
            onPress={() => setMode(value)}
        >
            <Text style={{
                color: current === value ? '#fff' : colors.text,
                fontWeight: current === value ? '600' : '400'
            }}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Profile & Settings</Text>



            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 15 }}>Appearance</Text>
                <View style={styles.themeContainer}>
                    <ThemeOption title="Light" value="light" current={mode} />
                    <ThemeOption title="Dark" value="dark" current={mode} />
                    <ThemeOption title="System" value="system" current={mode} />
                </View>
            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Transactions</Text>
                <Button variant="outline" title="Manage Recurring" onPress={handleManageRecurring} style={{ marginBottom: 10 }} />
                <Button variant="outline" title="Manage Budgets" onPress={() => setShowBudgetModal(true)} />
            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Data Management</Text>
                <Button variant="outline" title="Backup Data" onPress={() => setShowBackupModal(true)} style={{ marginBottom: 10 }} />
                <Button variant="outline" title="Restore Data" onPress={handleSelectRestoreFile} style={{ marginBottom: 10 }} />
                <Button variant="ghost" title="Clear All Data" onPress={handleClearData} />
            </Card>



            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Gemini AI Settings</Text>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>
                    {hasApiKey
                        ? "✅ Custom API Key is configured."
                        : "Use your own API key for smart insights."}
                </Text>
                <Button
                    variant="outline"
                    title={hasApiKey ? "Change API Key" : "Configure API Key"}
                    onPress={() => setShowGeminiModal(true)}
                />
            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 15 }}>Security</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ color: colors.text }}>App PIN</Text>
                    <Button
                        variant="outline"
                        title={hasPin ? "Change PIN" : "Set PIN"}
                        onPress={() => setShowPinModal(true)}
                        style={{ minWidth: 100, paddingVertical: 5 }}
                    />
                </View>

                {hasPin && (
                    <View>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Auto-Lock Timeout</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {TIMEOUT_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => handleSetTimeout(opt.value)}
                                    style={{
                                        backgroundColor: timeoutSetting === opt.value ? colors.primary : 'transparent',
                                        paddingVertical: 6,
                                        paddingHorizontal: 12,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: timeoutSetting === opt.value ? colors.primary : colors.border
                                    }}
                                >
                                    <Text style={{
                                        color: timeoutSetting === opt.value ? '#fff' : colors.text,
                                        fontSize: 12
                                    }}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </Card>

            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <View style={{
                        width: 40, height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.primary + '20', // 20% opacity primary
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 12
                    }}>
                        <Ionicons name="book" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Help & Guide</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Master your personal finance</Text>
                    </View>
                </View>

                <Button variant="primary" title="View Onboarding Guide" onPress={() => setShowGuide(true)} />

            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>About</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 15 }}>
                    WealthSnap is a free, ad-free personal finance tracker with AI-powered receipt scanning. Your data stays private and secure on your device.
                </Text>

                <TouchableOpacity
                    onPress={() => setShowSupportModal(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}
                >
                    <Ionicons name="heart-outline" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                        Support Developer
                    </Text>
                </TouchableOpacity>

                <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 15 }}>
                    Version 1.0.0
                </Text>
            </Card>

            <Modal visible={showPinModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPinModal(false)}>
                <View style={{ flex: 1, backgroundColor: colors.background, paddingVertical: 40, paddingHorizontal: 20 }}>
                    <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                        <TouchableOpacity onPress={() => setShowPinModal(false)} style={{ padding: 10 }}>
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <PinCreationScreen
                        onSuccess={() => {
                            setShowPinModal(false);
                            checkSecuritySettings();
                        }}
                        onCancel={() => setShowPinModal(false)}
                    />
                </View>
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

            {/* Recurring Rules Modal */}
            <RecurringRulesListModal
                visible={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
                rules={recurrenceRules}
                onToggleRule={handleToggleRule}
                onDeleteRule={handleDeleteRule}
                currency={currency}
            />

            {/* Budget Management Modal */}
            <BudgetManagementModal
                visible={showBudgetModal}
                onClose={() => setShowBudgetModal(false)}
                currency={currency}
            />

            {/* Support Modal */}
            <SupportModal
                visible={showSupportModal}
                onClose={() => setShowSupportModal(false)}
            />

            {/* Gemini Settings Modal */}
            <GeminiSettingsModal
                visible={showGeminiModal}
                onClose={() => setShowGeminiModal(false)}
                hasApiKey={hasApiKey}
                onApiKeySaved={checkApiKey}
            />

            {/* Guide Modal */}
            <Modal visible={showGuide} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGuide(false)}>
                <OnboardingGuide onFinish={() => setShowGuide(false)} mode="view" />
            </Modal>
        </ScreenWrapper >

    );
};

const styles = StyleSheet.create({
    themeContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    themeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
    }
});

export default ProfileScreen;
