import React, { useState, useEffect } from 'react';
import { Text, View, Alert, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { clearAllData, saveGeminiConfig, getGeminiConfig } from '../services/storageService';
import * as Sharing from 'expo-sharing'; // For backup (mock)
import { CommonActions } from '@react-navigation/native';

const ProfileScreen = ({ navigation }: any) => {
    const { colors, setMode, mode } = useTheme();
    const [apiKey, setApiKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        checkApiKey();
    }, []);

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
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Support</Text>
                <Button variant="secondary" title="Buy me a coffee ☕" onPress={() => Alert.alert('Thanks!', 'Link to buy coffee coming soon.')} />
            </Card>
        </ScreenWrapper>
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
