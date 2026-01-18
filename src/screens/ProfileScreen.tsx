import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, Alert, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { clearAllData, saveGeminiConfig, getGeminiConfig } from '../services/storageService';
import * as Sharing from 'expo-sharing'; // For backup (mock)
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

    const handleBackup = async () => {
        // Mock backup logic
        Alert.alert('Backup', 'Backup feature coming soon!');
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
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Data Management</Text>
                <Button variant="secondary" title="Backup Data" onPress={handleBackup} style={{ marginBottom: 10 }} />
                <Button variant="outline" title="Restore Data" onPress={() => Alert.alert('Restore', 'Feature coming soon')} style={{ marginBottom: 10 }} />
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

            <Modal visible={showPinModal} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ padding: 20, alignItems: 'flex-end' }}>
                        <TouchableOpacity onPress={() => setShowPinModal(false)}>
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
