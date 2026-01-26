import React, { useState } from 'react';
import { Text, TextInput, View, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '../../common/BottomModal';
import { Button } from '../../index';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { saveAIConfig } from '../../../services/core/storageService';
import { SPACING } from '../../../styles/theme';

interface GeminiSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    hasApiKey: boolean;
    onApiKeySaved: () => void;
}

const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
    visible,
    onClose,
    hasApiKey,
    onApiKeySaved
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showApiKeyHelp, setShowApiKeyHelp] = useState(false);

    const handleSaveKey = async () => {
        if (apiKey.trim()) {
            await saveAIConfig({ apiKey: apiKey.trim() });
            showAlert('Success', 'API Key saved securely.');
            setApiKey('');
            onApiKeySaved();
            onClose();
        } else {
            showAlert('Error', 'Please enter a valid API key.');
        }
    };

    return (
        <>
            <BottomModal visible={visible} onClose={onClose}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
                    🤖 Gemini AI Settings
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                    {hasApiKey
                        ? "✅ Custom API Key is configured. Enter a new key to update it."
                        : "Configure your own Google Gemini API key for AI-powered features."}
                </Text>

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    marginBottom: 15,
                    backgroundColor: colors.surface
                }}>
                    <TextInput
                        style={{
                            flex: 1,
                            padding: 12,
                            color: colors.text,
                            fontSize: 14
                        }}
                        placeholder="Enter Gemini API Key"
                        placeholderTextColor={colors.gray500}
                        value={apiKey}
                        onChangeText={setApiKey}
                        secureTextEntry={!showApiKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        onPressIn={() => setShowApiKey(true)}
                        onPressOut={() => setShowApiKey(false)}
                        style={{ padding: 10 }}
                    >
                        <Ionicons name={showApiKey ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Button
                    title="Save API Key"
                    onPress={handleSaveKey}
                    style={{ marginBottom: 10 }}
                />

                <Button
                    variant="outline"
                    title="How to Get API Key 🔑"
                    onPress={() => setShowApiKeyHelp(true)}
                    style={{ marginBottom: 10 }}
                />

                <Button
                    variant="outline"
                    title="Cancel"
                    onPress={onClose}
                />
            </BottomModal>

            {/* API Key Help Modal */}
            <BottomModal
                visible={showApiKeyHelp}
                onClose={() => setShowApiKeyHelp(false)}
                title="How to Get Your API Key 🔑"
                maxHeight="70%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[styles.helpIntro, { color: colors.text }]}>
                        Follow these simple steps to get your free API key from Google:
                    </Text>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.helpStepNumberText}>1</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Open Google AI Studio</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Go to{' '}
                                <Text
                                    style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }}
                                    onPress={() => Linking.openURL('https://aistudio.google.com')}
                                >
                                    aistudio.google.com
                                </Text>
                                {' '}in your web browser (Chrome, Safari, etc.)
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.helpStepNumberText}>2</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Sign in with Google</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Use your Google account (the same one you use for Gmail or YouTube) to sign in.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.helpStepNumberText}>3</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Click &quot;Get API Key&quot;</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Look for a button that says &quot;Get API Key&quot; or &quot;Create API Key&quot;. It&apos;s usually at the top or in the menu.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.helpStepNumberText}>4</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Create a New Key</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Click &quot;Create API Key in new project&quot; or select an existing project. A long code will appear - this is your API key!
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.helpStepNumberText}>5</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Copy Your Key</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Click the copy button next to your key. It looks like two overlapping squares 📋
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpStep, { backgroundColor: colors.background }]}>
                        <View style={[styles.helpStepNumber, { backgroundColor: colors.success }]}>
                            <Text style={styles.helpStepNumberText}>✓</Text>
                        </View>
                        <View style={styles.helpStepContent}>
                            <Text style={[styles.helpStepTitle, { color: colors.text }]}>Paste in WealthSnap</Text>
                            <Text style={[styles.helpStepDesc, { color: colors.textSecondary }]}>
                                Come back to this app, tap the Save button, and paste your key in the API Key field above!
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.helpTip, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
                        <Ionicons name="bulb-outline" size={20} color={colors.info} />
                        <Text style={[styles.helpTipText, { color: colors.text }]}>
                            <Text style={{ fontWeight: 'bold' }}>Tip:</Text> The API has a generous free tier! You can make many requests per day at no cost. Check Google&apos;s pricing page for current limits.
                        </Text>
                    </View>

                    <Text style={[styles.helpReminder, { color: colors.textSecondary }]}>
                        📌 <Text style={{ fontWeight: '600' }}>Reminder:</Text> If prompted, you may need to create a Google Cloud project first — just follow the on-screen instructions, it only takes a few clicks!
                    </Text>

                    <TouchableOpacity
                        style={[styles.openLinkButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            Linking.openURL('https://aistudio.google.com/apikey');
                        }}
                    >
                        <Ionicons name="open-outline" size={20} color="#FFF" />
                        <Text style={styles.openLinkButtonText}>Open Google AI Studio</Text>
                    </TouchableOpacity>

                    <View style={{ height: SPACING.xl }} />
                </ScrollView>
            </BottomModal>
        </>
    );
};

const styles = {
    helpIntro: {
        fontSize: 15,
        marginBottom: SPACING.md,
        lineHeight: 22,
    },
    helpStep: {
        flexDirection: 'row' as const,
        padding: SPACING.md,
        borderRadius: 12,
        marginBottom: SPACING.sm,
    },
    helpStepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: SPACING.sm,
    },
    helpStepNumberText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
    helpStepContent: {
        flex: 1,
    },
    helpStepTitle: {
        fontSize: 16,
        fontWeight: '600' as const,
        marginBottom: 4,
    },
    helpStepDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    helpTip: {
        flexDirection: 'row' as const,
        padding: SPACING.md,
        borderRadius: 12,
        borderWidth: 1,
        marginVertical: SPACING.md,
        alignItems: 'flex-start' as const,
    },
    helpTipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        marginLeft: SPACING.sm,
    },
    helpReminder: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: SPACING.md,
        fontStyle: 'italic' as const,
    },
    openLinkButton: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        padding: SPACING.md,
        borderRadius: 12,
        marginTop: SPACING.sm,
    },
    openLinkButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600' as const,
        marginLeft: SPACING.sm,
    },
};

export default GeminiSettingsModal;
