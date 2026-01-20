import React, { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import BottomModal from '../../common/BottomModal';
import { Button } from '../../index';
import { saveAIConfig } from '../../../services/storageService';
import { useAlert } from '../../../context/AlertContext';

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
        <BottomModal visible={visible} onClose={onClose}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
                🤖 Gemini AI Settings
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                {hasApiKey
                    ? "✅ Custom API Key is configured. Enter a new key to update it."
                    : "Configure your own Google Gemini API key for AI-powered features."}
            </Text>

            <TextInput
                style={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 15,
                    fontSize: 14
                }}
                placeholder="Enter Gemini API Key"
                placeholderTextColor={colors.gray500}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
            />

            <Button
                title="Save API Key"
                onPress={handleSaveKey}
                style={{ marginBottom: 10 }}
            />

            <Button
                variant="outline"
                title="Cancel"
                onPress={onClose}
            />
        </BottomModal>
    );
};

export default GeminiSettingsModal;
