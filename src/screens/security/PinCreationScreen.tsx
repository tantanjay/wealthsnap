import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { useAlert } from '@context/AlertContext';
import { Disclaimer } from '@components/common/Disclaimer';
import { setPin } from '@services/core/securityService';

interface PinCreationScreenProps {
    onSuccess: () => void;
    onCancel?: () => void; // Optional cancel for settings flow
}

const PIN_LENGTH = 6;

const PinCreationScreen: React.FC<PinCreationScreenProps> = ({ onSuccess, onCancel }) => {
    const { ds } = useTheme();
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
                ], { cancelable: false });
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
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async secure-storage write (setPin); see FIXES.md
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
                                borderColor: ds.accent,
                                backgroundColor: i < currentLength ? ds.accent : 'transparent'
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
                                <Ionicons name="backspace-outline" size={28} color={ds.text2} />
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity key={index} style={styles.key} onPress={() => handlePress(key)}>
                            <Text style={[type.titleNum, { color: ds.text }]}>{key}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[type.title, styles.title, { color: ds.text }]}>
                {step === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
            </Text>
            <Text style={[type.small, styles.subtitle, { color: ds.text2 }]}>
                {step === 'create'
                    ? 'Enhance your security with a 6-digit PIN'
                    : 'Please re-enter your PIN to confirm'}
            </Text>

            {renderDots(step === 'create' ? pin.length : confirmPin.length)}
            {renderKeypad()}

            {step === 'create' && (
                <Disclaimer severity="warning" style={styles.disclaimer}>
                    If you forget this PIN, you may lose access to your data. There is no password recovery option for local data.
                </Disclaimer>
            )}
            {onCancel && step === 'create' && (
                <TouchableOpacity onPress={onCancel} style={styles.cancel} hitSlop={space[2]}>
                    <Text style={[type.smallMedium, { color: ds.accent }]}>Skip / Cancel</Text>
                </TouchableOpacity>
            )}
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
        padding: space[5],
    },
    title: {
        marginBottom: space[2],
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: space[7],
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: space[4],
        marginBottom: space[7] + space[4],
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: radius.full,
        borderWidth: 2,
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
        marginBottom: space[5],
    },
    disclaimer: {
        marginTop: space[7],
        alignSelf: 'stretch',
    },
    cancel: {
        marginTop: space[5],
    },
});

export default PinCreationScreen;
