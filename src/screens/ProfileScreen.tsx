import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Alert, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { clearAllData, saveGeminiConfig, getGeminiConfig, getAllRecurrenceRules, saveRecurrenceRule, deleteRecurrenceRule } from '../services/storageService';
import { RecurrenceRule } from '../types';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { createBackup, restoreFromBackup } from '../services/backupService';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { isPinSet, getTimeoutSetting, saveTimeoutSetting, TimeoutOption, TIMEOUT_OPTIONS } from '../services/securityService';
import PinCreationScreen from './PinCreationScreen';

const ProfileScreen = ({ navigation }: any) => {
    const { colors, setMode, mode } = useTheme();
    const [apiKey, setApiKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    // Security State
    const [hasPin, setHasPin] = useState(false);
    const [timeoutSetting, setTimeoutSetting] = useState<TimeoutOption>('daily');
    const [showPinModal, setShowPinModal] = useState(false);

    // Backup/Restore State
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Recurring Rules State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);

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

    const handleSaveKey = async () => {
        if (apiKey) {
            await saveGeminiConfig({ apiKey });
            Alert.alert('Success', 'API Key saved securely.');
            setShowKeyInput(false);
            setApiKey('');
            setHasApiKey(true);
        }
    };

    const handleCreateBackup = async () => {
        if (!backupPassword) {
            Alert.alert('Error', 'Password is required to encrypt your backup.');
            return;
        }

        try {
            setIsProcessing(true);
            const uri = await createBackup(backupPassword);
            setIsProcessing(false);
            setShowBackupModal(false);
            setBackupPassword('');

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

    const handleRestore = async () => {
        if (!restoreFileUri) return;
        if (!restorePassword) {
            Alert.alert('Error', 'Password is required.');
            return;
        }

        try {
            setIsProcessing(true);
            await restoreFromBackup(restoreFileUri, restorePassword);
            setIsProcessing(false);
            setShowRestoreModal(false);
            setRestorePassword('');

            Alert.alert('Success', 'Data restored successfully. The app will reload.', [
                {
                    text: 'OK', onPress: () => {
                        // Reset to Main to refresh everything
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main' }],
                        });
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
                <Button variant="outline" title="Manage Recurring" onPress={handleManageRecurring} />
            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Data Management</Text>
                <Button variant="secondary" title="Backup Data" onPress={() => setShowBackupModal(true)} style={{ marginBottom: 10 }} />
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

                {showKeyInput ? (
                    <View>
                        <TextInput
                            style={{
                                color: colors.text,
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                padding: 10,
                                marginBottom: 10
                            }}
                            placeholder="Enter Gemini API Key"
                            placeholderTextColor={colors.gray500}
                            value={apiKey}
                            onChangeText={setApiKey}
                            secureTextEntry
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Button title="Save" onPress={handleSaveKey} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Button variant="outline" title="Cancel" onPress={() => setShowKeyInput(false)} />
                            </View>
                        </View>
                    </View>
                ) : (
                    <Button
                        variant={hasApiKey ? "outline" : "primary"}
                        title={hasApiKey ? "Change API Key" : "Configure API Key"}
                        onPress={() => setShowKeyInput(true)}
                    />
                )}
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
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Support</Text>
                <Button variant="secondary" title="Buy me a coffee ☕" onPress={() => Alert.alert('Thanks!', 'Link to buy coffee coming soon.')} />
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
            <Modal visible={showBackupModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Create Backup</Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>Enter a password to encrypt your backup file.</Text>

                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 8,
                                padding: 12,
                                color: colors.text,
                                marginBottom: 20
                            }}
                            placeholder="Password"
                            placeholderTextColor={colors.gray500}
                            secureTextEntry
                            value={backupPassword}
                            onChangeText={setBackupPassword}
                        />

                        <View style={{ gap: 10 }}>
                            <Button title={isProcessing ? "Creating..." : "Create & Share"} onPress={handleCreateBackup} disabled={isProcessing} />
                            <Button variant="ghost" title="Cancel" onPress={() => setShowBackupModal(false)} disabled={isProcessing} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Restore Modal */}
            <Modal visible={showRestoreModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Restore Backup</Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>Enter the password for this backup file.</Text>

                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 8,
                                padding: 12,
                                color: colors.text,
                                marginBottom: 20
                            }}
                            placeholder="Password"
                            placeholderTextColor={colors.gray500}
                            secureTextEntry
                            value={restorePassword}
                            onChangeText={setRestorePassword}
                        />

                        <View style={{ gap: 10 }}>
                            <Button title={isProcessing ? "Restoring..." : "Restore Data"} onPress={handleRestore} disabled={isProcessing} />
                            <Button variant="ghost" title="Cancel" onPress={() => setShowRestoreModal(false)} disabled={isProcessing} />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Recurring Rules Modal */}
            <Modal visible={showRecurringModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRecurringModal(false)}>
                <View style={{ flex: 1, backgroundColor: colors.background, paddingVertical: 20, paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Recurring Transactions</Text>
                        <TouchableOpacity onPress={() => setShowRecurringModal(false)} style={{ padding: 10 }}>
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    {recurrenceRules.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>No recurring rules found.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={recurrenceRules}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <Card style={{ marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{item.name || item.transactionTemplate.category}</Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity onPress={() => handleToggleRule(item)}>
                                                <Text style={{ color: item.isActive ? colors.success : colors.textSecondary, fontWeight: '600' }}>
                                                    {item.isActive ? 'Active' : 'Paused'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteRule(item.id)}>
                                                <Text style={{ color: colors.error, fontWeight: '600' }}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={{ color: colors.textSecondary }}>
                                        {item.frequency} • ${item.transactionTemplate.amount}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                        Next due: {new Date(item.nextDueDate).toLocaleDateString()}
                                    </Text>
                                </Card>
                            )}
                        />
                    )}
                </View>
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
