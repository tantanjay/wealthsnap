import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { setPin } from '@services/core/securityService';

interface PinCreationScreenProps {
    onSuccess: () => void;
    onCancel?: () => void; // Optional cancel for settings flow
}

const PIN_LENGTH = 6;

const PinCreationScreen: React.FC<PinCreationScreenProps> = ({ onSuccess, onCancel }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [pin, setPinState] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'create' | 'confirm'>('create');

    const handlePress = (num: string) => {
        if (step === 'create') {
            if (pin.length < PIN_LENGTH) setPinState(prev => prev + num);
        } else {
            if (confirmPin.length < PIN_LENGTH) setConfirmPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (step === 'create') {
            setPinState(prev => prev.slice(0, -1));
        } else {
            setConfirmPin(prev => prev.slice(0, -1));
        }
    };

    const reset = useCallback(() => {
        setPinState('');
        setConfirmPin('');
        setStep('create');
    }, []);

    const isValidating = React.useRef(false);

    const validatePin = useCallback(async () => {
        if (isValidating.current) return;

        if (pin === confirmPin) {
            isValidating.current = true;
            try {
                await setPin(pin);
                showAlert("Success", "Your PIN has been secured.", [
                    {
                        text: "OK",
                        onPress: () => {
                            isValidating.current = false;
                            onSuccess();
                        }
                    }
                ]);
            } catch {
                isValidating.current = false;
                showAlert("Error", "Failed to save PIN. Please try again.");
                reset();
            }
        } else {
            showAlert("Mismatch", "PINs did not match. Please try again.");
            reset();
        }
    }, [pin, confirmPin, onSuccess, reset, showAlert]);

    useEffect(() => {
        if (step === 'create' && pin.length === PIN_LENGTH) {
            setTimeout(() => setStep('confirm'), 500);
        } else if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
            validatePin();
        }
    }, [step, pin, confirmPin, validatePin]);

    const renderDots = (currentLength: number) => {
        return (
            <View style={styles.dotsContainer}>
                {[...Array(PIN_LENGTH)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            {
                                borderColor: colors.primary,
                                backgroundColor: i < currentLength ? colors.primary : 'transparent'
                            }
                        ]}
                    />
                ))}
            </View>
        );
    };

    const renderKeypad = () => {
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
        return (
            <View style={styles.keypad}>
                {keys.map((key, index) => {
                    if (key === '') return <View key={index} style={styles.key} />;
                    if (key === 'del') {
                        return (
                            <TouchableOpacity key={index} style={styles.key} onPress={handleDelete}>
                                <Ionicons name="backspace-outline" size={28} color={colors.text} />
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity key={index} style={styles.key} onPress={() => handlePress(key)}>
                            <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
            minHeight: 400, // Ensure it doesn't collapse in scroll views
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 10,
            textAlign: 'center',
            color: colors.text
        },
        subtitle: {
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 30,
            color: colors.textSecondary
        },
        dotsContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 50,
        },
        dot: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            marginHorizontal: 10,
        },
        keypad: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 300,
        },
        key: {
            width: '30%',
            height: 60,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
        },
        keyText: {
            fontSize: 28,
            fontWeight: '600',
        },
        disclaimer: {
            marginTop: 30,
            padding: 15,
            backgroundColor: 'rgba(255, 100, 100, 0.1)',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(255, 100, 100, 0.3)',
        },
        disclaimerText: {
            fontSize: 12,
            color: colors.text,
            textAlign: 'center',
        }
    });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {step === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
            </Text>
            <Text style={styles.subtitle}>
                {step === 'create'
                    ? 'Enhance your security with a 6-digit PIN'
                    : 'Please re-enter your PIN to confirm'}
            </Text>

            {renderDots(step === 'create' ? pin.length : confirmPin.length)}
            {renderKeypad()}

            {step === 'create' && (
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ⚠️ DISCLAIMER: If you forget this PIN, you may lose access to your data.
                        There is no password recovery option for local data.
                    </Text>
                </View>
            )}
            {onCancel && step === 'create' && (
                <TouchableOpacity onPress={onCancel} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Skip / Cancel</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default PinCreationScreen;
