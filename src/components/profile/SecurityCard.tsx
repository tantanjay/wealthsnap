import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import SettingItem from '@components/common/SettingItem';
import PinCreationScreen from '@screens/security/PinCreationScreen';
import GeminiSettingsModal from '@components/profile/settings/GeminiSettingsModal';
import GeminiUsageModal from '@components/profile/settings/GeminiUsageModal';
import { Card } from '@components/index';
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
            <Card style={{ marginBottom: 16 }}>
                <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: colors.error + '20' }]}>
                        <Ionicons name="shield" size={22} color={colors.error} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Security & Intelligence</Text>
                </View>

                <SettingItem
                    icon="lock-closed"
                    title="App Lock"
                    subtitle={hasPin ? "Tap to change your PIN" : "Secure your app with a PIN"}
                    onPress={() => setShowPinModal(true)}
                    iconBg={colors.error + '20'}
                    iconColor={colors.error}
                />

                {hasPin && (
                    <SettingItem
                        icon="timer"
                        title="Auto-Lock Timeout"
                        subtitle={getTimeoutLabel(timeoutSetting)}
                        onPress={() => setShowTimeoutModal(true)}
                        iconBg={colors.warning + '20'}
                        iconColor={colors.warning}
                    />
                )}

                {/* AI Section */}
                <SettingItem
                    icon="sparkles"
                    title="Google Gemini"
                    subtitle={hasApiKey ? "API Key configured" : "Configure AI provider"}
                    onPress={() => setShowGeminiSettings(true)}
                    iconBg={colors.primary + '20'}
                    iconColor={colors.primary}
                    isLast={!hasApiKey}
                />

                {hasApiKey && (
                    <SettingItem
                        icon="bar-chart"
                        title="Usage Statistics"
                        subtitle="Track token usage and costs"
                        onPress={() => setShowGeminiUsage(true)}
                        iconBg={colors.info + '20'}
                        iconColor={colors.info}
                        isLast={true}
                    />
                )}
            </Card>

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
});

export default SecurityCard;
