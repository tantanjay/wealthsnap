import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as securityService from '../../services/securityService';

// This screen should be rendered conditionally via Context or a Modal
interface PinEntryScreenProps {
    onSuccess: () => void;
}

const PIN_LENGTH = 6;

const PinEntryScreen: React.FC<PinEntryScreenProps> = ({ onSuccess }) => {
    const { colors } = useTheme();
    const [pin, setPinState] = useState('');
    const [error, setError] = useState(false);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS' | 'UNKNOWN'>('UNKNOWN');

    const triggerBiometricAuth = useCallback(async () => {
        const success = await securityService.authenticateBiometrics();
        if (success) {
            onSuccess();
        }
    }, [onSuccess]);

    const checkBiometrics = useCallback(async () => {
        const available = await securityService.hasBiometrics();
        setBiometricsAvailable(available);

        if (available) {
            const type = await securityService.getBiometricType();
            setBiometricType(type);
            triggerBiometricAuth(); // Still auto-trigger
        }
    }, [triggerBiometricAuth]);

    useEffect(() => {
        checkBiometrics();
    }, [checkBiometrics]);

    const handlePress = (num: string) => {
        if (pin.length < PIN_LENGTH) {
            setPinState(prev => prev + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPinState(prev => prev.slice(0, -1));
        setError(false);
    };

    const checkPin = useCallback(async (currentPin: string) => {
        const isValid = await securityService.verifyPin(currentPin);
        if (isValid) {
            onSuccess();
        } else {
            setError(true);
            Vibration.vibrate();
            setTimeout(() => {
                setPinState('');
                // Keep error state briefly
            }, 500);
        }
    }, [onSuccess]);

    useEffect(() => {
        if (pin.length === PIN_LENGTH) {
            checkPin(pin);
        }
    }, [pin, checkPin]);

    const renderDots = () => {
        return (
            <View style={styles.dotsContainer}>
                {[...Array(PIN_LENGTH)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            {
                                borderColor: error ? 'red' : colors.primary,
                                backgroundColor: pin.length > i ? (error ? 'red' : colors.primary) : 'transparent',
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
                    if (key === '') {
                        if (biometricsAvailable) {
                            return (
                                <TouchableOpacity key={index} style={styles.key} onPress={triggerBiometricAuth}>
                                    <Ionicons
                                        name={biometricType === 'FACIAL_RECOGNITION' ? "scan" : "finger-print"}
                                        size={32}
                                        color={colors.primary}
                                    />
                                </TouchableOpacity>
                            );
                        }
                        return <View key={index} style={styles.key} />;
                    }
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
            backgroundColor: colors.background,
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
            marginBottom: 50,
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
        errorText: {
            color: 'red',
            marginTop: 20,
            height: 20,
        }
    });

    return (
        <View style={styles.container}>
            <View style={{ marginBottom: 40 }}>
                <Ionicons name="lock-closed" size={50} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 20 }} />
                <Text style={styles.title}>WealthSnap Locked</Text>
                <Text style={styles.subtitle}>Enter your PIN to access</Text>
            </View>

            {renderDots()}
            {renderKeypad()}

            <Text style={styles.errorText}>{error ? 'Incorrect PIN' : ''}</Text>
        </View>
    );
};

export default PinEntryScreen;
