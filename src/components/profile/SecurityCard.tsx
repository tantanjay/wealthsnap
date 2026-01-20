import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components';
import { isPinSet, getTimeoutSetting, saveTimeoutSetting, TimeoutOption, TIMEOUT_OPTIONS } from '../../services/securityService';
import PinCreationScreen from '../../screens/PinCreationScreen';

const SecurityCard = () => {
    const { colors } = useTheme();
    const [hasPin, setHasPin] = useState(false);
    const [timeoutSetting, setTimeoutSetting] = useState<TimeoutOption>('daily');
    const [showPinModal, setShowPinModal] = useState(false);

    const checkSecuritySettings = async () => {
        const pinSet = await isPinSet();
        setHasPin(pinSet);
        const timeout = await getTimeoutSetting();
        setTimeoutSetting(timeout);
    };

    useFocusEffect(
        useCallback(() => {
            checkSecuritySettings();
        }, [])
    );

    const handleSetTimeout = async (option: TimeoutOption) => {
        await saveTimeoutSetting(option);
        setTimeoutSetting(option);
    };

    return (
        <>
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
        </>
    );
};

export default SecurityCard;
