import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import PinCreationScreen from '@screens/security/PinCreationScreen';
import GeminiSettingsModal from '@components/profile/settings/GeminiSettingsModal';
import GeminiUsageModal from '@components/profile/settings/GeminiUsageModal';
import { Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { getAIConfig } from '@services/core/storageService';
import * as Security from '@services/core/securityService';

const SecurityCard = () => {
    const { colors } = useTheme();
    const [hasPin, setHasPin] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [timeoutSetting, setTimeoutSetting] = useState<Security.TimeoutOption>('daily');
    const [showPinModal, setShowPinModal] = useState(false);
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);

    // Gemini State
    const [showGeminiSettings, setShowGeminiSettings] = useState(false);
    const [showGeminiUsage, setShowGeminiUsage] = useState(false);

    const checkSecuritySettings = async () => {
        const pinSet = await Security.isPinSet();
        setHasPin(pinSet);
        const timeout = await Security.getTimeoutSetting();
        setTimeoutSetting(timeout);

        const config = await getAIConfig();
        setHasApiKey(!!config?.apiKey);
    };

    useFocusEffect(
        useCallback(() => {
            checkSecuritySettings();
        }, [])
    );

    const handleSetTimeout = async (option: Security.TimeoutOption) => {
        await Security.saveTimeoutSetting(option);
        setTimeoutSetting(option);
        setShowTimeoutModal(false);
    };

    const getTimeoutLabel = (value: Security.TimeoutOption) => {
        const option = Security.TIMEOUT_OPTIONS.find(o => o.value === value);
        return option ? option.label : 'Select';
    };

    return (
        <>
            <SectionHeader title="Security and intelligence" />
            <Row
                icon="lock-closed-outline"
                title="App lock"
                subtitle={hasPin ? 'PIN on · tap to change' : 'Off · secure the app with a PIN'}
                chevron
                onPress={() => setShowPinModal(true)}
            />
            {hasPin && (
                <Row
                    icon="timer-outline"
                    title="Auto-lock timeout"
                    subtitle={getTimeoutLabel(timeoutSetting)}
                    chevron
                    onPress={() => setShowTimeoutModal(true)}
                />
            )}
            <Row
                icon="sparkles-outline"
                title="Google Gemini"
                subtitle={hasApiKey ? 'API key configured' : 'Configure AI provider'}
                chevron
                onPress={() => setShowGeminiSettings(true)}
                last={!hasApiKey}
            />
            {hasApiKey && (
                <Row
                    icon="bar-chart-outline"
                    title="Usage statistics"
                    subtitle="Track token usage and costs"
                    chevron
                    onPress={() => setShowGeminiUsage(true)}
                    last
                />
            )}

            {/* PIN Modal */}
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

            {/* Timeout Selection Modal */}
            <BottomModal
                visible={showTimeoutModal}
                onClose={() => setShowTimeoutModal(false)}
                title="Auto-Lock Timeout"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                        {Security.TIMEOUT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => handleSetTimeout(opt.value)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 14,
                                    paddingHorizontal: 4,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border
                                }}
                            >
                                <Text style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontWeight: timeoutSetting === opt.value ? '600' : '400'
                                }}>
                                    {opt.label}
                                </Text>
                                {timeoutSetting === opt.value && (
                                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </BottomModal>

            {/* Gemini Settings Modal */}
            <GeminiSettingsModal
                visible={showGeminiSettings}
                onClose={() => setShowGeminiSettings(false)}
                hasApiKey={hasApiKey}
                onApiKeySaved={checkSecuritySettings}
            />

            {/* Gemini Usage Modal */}
            <GeminiUsageModal
                visible={showGeminiUsage}
                onClose={() => setShowGeminiUsage(false)}
            />
        </>
    );
};

export default SecurityCard;
