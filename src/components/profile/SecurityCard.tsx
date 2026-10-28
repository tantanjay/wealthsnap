import React, { useState, useCallback } from 'react';
import { View, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import PinCreationScreen from '@screens/security/PinCreationScreen';
import GeminiSettingsModal from '@components/profile/settings/GeminiSettingsModal';
import GeminiUsageModal from '@components/profile/settings/GeminiUsageModal';
import { Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { getAIConfig } from '@services/core/storageService';
import * as Security from '@services/core/securityService';
import { space, radius } from '@styles/theme';

const SecurityCard = () => {
    const { ds } = useTheme();
    const { mode: privacyMode, revealForScreenshot } = usePrivacy();
    const { showAlert } = useAlert();
    // Hidden already allows screenshots.
    const showReveal = privacyMode !== 'hidden';
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

    const handleRevealForScreenshot = () => {
        showAlert(
            'Allow Screenshot?',
            "This will briefly allow a screenshot of what's on screen, then screenshot protection resumes automatically.",
            [
                { text: 'No', style: 'cancel' },
                { text: 'Yes', onPress: revealForScreenshot },
            ]
        );
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
                last={!hasApiKey && !showReveal}
            />
            {hasApiKey && (
                <Row
                    icon="bar-chart-outline"
                    title="Usage statistics"
                    subtitle="Track token usage and costs"
                    chevron
                    onPress={() => setShowGeminiUsage(true)}
                    last={!showReveal}
                />
            )}
            {showReveal && (
                <Row
                    icon="camera-outline"
                    title="Reveal for screenshot"
                    subtitle="Allow screenshots for 15 seconds"
                    onPress={handleRevealForScreenshot}
                    last
                />
            )}

            {/* PIN Modal */}
            <Modal visible={showPinModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPinModal(false)}>
                <View style={[styles.pinPage, { backgroundColor: ds.bg }]}>
                    <View style={styles.pinHeader}>
                        <Pressable onPress={() => setShowPinModal(false)} hitSlop={space[2]} accessibilityRole="button" accessibilityLabel="Close">
                            <Ionicons name="close" size={22} color={ds.text2} />
                        </Pressable>
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
                title="Auto-lock timeout"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {Security.TIMEOUT_OPTIONS.map((opt, i) => {
                        const selected = timeoutSetting === opt.value;
                        return (
                            <Row
                                key={opt.value}
                                title={opt.label}
                                leading={
                                    <View style={[styles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
                                        {selected && <View style={[styles.radioDot, { backgroundColor: ds.accent }]} />}
                                    </View>
                                }
                                onPress={() => handleSetTimeout(opt.value)}
                                last={i === Security.TIMEOUT_OPTIONS.length - 1}
                            />
                        );
                    })}
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
    pinPage: {
        flex: 1,
        paddingVertical: space[7],
        paddingHorizontal: space[5],
    },
    pinHeader: {
        alignItems: 'flex-end',
        marginBottom: space[5],
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: radius.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
});

export default SecurityCard;
