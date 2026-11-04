import React, { useState } from 'react';
import { Text, TextInput, View, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { saveAIConfig } from '@services/core/storageService';
import { type, space, radius, layout } from '@styles/theme';

interface GeminiSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    hasApiKey: boolean;
    onApiKeySaved: () => void;
}

const HELP_STEPS: { title: string; description: string }[] = [
    { title: 'Sign in with Google', description: 'Use your Google account (the same one you use for Gmail or YouTube) to sign in.' },
    { title: 'Click "Get API Key"', description: 'Look for a button that says "Get API Key" or "Create API Key". It\'s usually at the top or in the menu.' },
    { title: 'Create a new key', description: 'Click "Create API Key in new project" or select an existing project. A long code will appear - this is your API key!' },
    { title: 'Copy your key', description: 'Click the copy button next to your key. It looks like two overlapping squares.' },
    { title: 'Paste in WealthSnap', description: 'Come back to this app, paste your key in the API key field above, and tap Save.' },
];

const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
    visible,
    onClose,
    hasApiKey,
    onApiKeySaved
}) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    // Collapsible in place of a second modal on top of this sheet.
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

    const stepNumber = (n: number) => (
        <Text style={[type.bodyNum, styles.stepNumber, { color: ds.text2 }]}>{n}</Text>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Gemini AI settings"
            maxHeight="85%"
            footer={
                <>
                    <Pressable onPress={handleSaveKey} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save API key</Text>
                    </Pressable>
                    <Pressable onPress={onClose} style={styles.textButton} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                </>
            }
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.status}>
                    {hasApiKey && <Ionicons name="checkmark-circle-outline" size={18} color={ds.success} />}
                    <Text style={[type.small, styles.statusText, { color: ds.text2 }]}>
                        {hasApiKey
                            ? 'Custom API key is configured. Enter a new key to update it.'
                            : 'Configure your own Google Gemini API key for AI-powered features.'}
                    </Text>
                </View>

                <Group padded>
                    <View style={[styles.field, { backgroundColor: ds.inset }]}>
                        <Ionicons name="key-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={[type.body, styles.input, { color: ds.text }]}
                            placeholder="Enter Gemini API key"
                            placeholderTextColor={ds.text3}
                            value={apiKey}
                            onChangeText={setApiKey}
                            secureTextEntry={!showApiKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            onPressIn={() => setShowApiKey(true)}
                            onPressOut={() => setShowApiKey(false)}
                            hitSlop={space[2]}
                        >
                            <Ionicons name={showApiKey ? 'eye-outline' : 'eye-off-outline'} size={20} color={ds.text2} />
                        </Pressable>
                    </View>
                </Group>

                <Group padded style={styles.help}>
                    <Pressable
                        onPress={() => setShowApiKeyHelp(v => !v)}
                        style={styles.helpToggle}
                        hitSlop={space[2]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showApiKeyHelp }}
                    >
                        <Ionicons name="help-circle-outline" size={16} color={ds.accent} />
                        <Text style={[type.smallMedium, { color: ds.accent }]}>How to get an API key?</Text>
                        <Ionicons name={showApiKeyHelp ? 'chevron-up' : 'chevron-down'} size={14} color={ds.accent} />
                    </Pressable>

                    {showApiKeyHelp && (
                        <View>
                            <Text style={[type.small, styles.helpIntro, { color: ds.text2 }]}>
                                Follow these simple steps to get your free API key from Google:
                            </Text>

                            <Row title="Open Google AI Studio" leading={stepNumber(1)}>
                                <Text style={[type.small, { color: ds.text2 }]}>
                                    Go to{' '}
                                    <Text
                                        style={[type.smallMedium, { color: ds.accent }]}
                                        onPress={() => Linking.openURL('https://aistudio.google.com')}
                                    >
                                        aistudio.google.com
                                    </Text>
                                    {' '}in your web browser (Chrome, Safari, etc.)
                                </Text>
                            </Row>
                            {HELP_STEPS.map((step, i) => (
                                <Row key={step.title} title={step.title} subtitle={step.description} leading={stepNumber(i + 2)} />
                            ))}
                            <Row
                                icon="open-outline"
                                title="Open Google AI Studio"
                                subtitle="aistudio.google.com/apikey"
                                chevron
                                onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
                                last
                            />

                            <View style={[styles.tip, { backgroundColor: ds.inset }]}>
                                <Text style={[type.small, { color: ds.text2 }]}>
                                    <Text style={[type.smallStrong, { color: ds.text }]}>Tip: </Text>
                                    The API has a generous free tier! You can make many requests per day at no cost. Check Google&apos;s pricing page for current limits.
                                </Text>
                                <Text style={[type.small, styles.tipLine, { color: ds.text2 }]}>
                                    <Text style={[type.smallStrong, { color: ds.text }]}>Reminder: </Text>
                                    If prompted, you may need to create a Google Cloud project first — just follow the on-screen instructions, it only takes a few clicks!
                                </Text>
                            </View>
                        </View>
                    )}
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    status: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
        marginBottom: space[3],
        paddingHorizontal: layout.groupPadding,
    },
    statusText: {
        flex: 1,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    input: {
        flex: 1,
        padding: 0,
    },
    helpToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: space[1],
    },
    help: {
        marginTop: space[4],
    },
    helpIntro: {
        marginTop: space[3],
    },
    stepNumber: {
        width: 20,
        textAlign: 'center',
    },
    tip: {
        borderRadius: radius.sm,
        padding: space[3],
        marginTop: space[3],
    },
    tipLine: {
        marginTop: space[2],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default GeminiSettingsModal;
