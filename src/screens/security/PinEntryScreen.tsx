import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { authenticateBiometrics, getBiometricType, getPinLockoutRemainingMs, hasBiometrics, verifyPin } from '@services/core/securityService';

interface PinEntryScreenProps {
    onSuccess: () => void;
}

const PIN_LENGTH = 6;

const PinEntryScreen: React.FC<PinEntryScreenProps> = ({ onSuccess }) => {
    const { colors } = useTheme();
    const [pin, setPinState] = useState('');
    const [error, setError] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS' | 'UNKNOWN'>('UNKNOWN');

    const triggerBiometricAuth = useCallback(async () => {
        const success = await authenticateBiometrics();
        if (success) {
            onSuccess();
        }
    }, [onSuccess]);

    const checkBiometrics = useCallback(async () => {
        const available = await hasBiometrics();
        setBiometricsAvailable(available);

        if (available) {
            const type = await getBiometricType();
            setBiometricType(type);
            triggerBiometricAuth(); // Still auto-trigger
        }
    }, [triggerBiometricAuth]);

    useEffect(() => {
        checkBiometrics();
    }, [checkBiometrics]);

    // Catches the case where the app was killed and reopened while still mid-lockout.
    useEffect(() => {
        getPinLockoutRemainingMs().then(ms => {
            if (ms > 0) setLockoutRemainingMs(ms);
        });
    }, []);

    // Countdown ticker while locked out
    useEffect(() => {
        if (lockoutRemainingMs <= 0) return;

        const interval = setInterval(() => {
            setLockoutRemainingMs(prev => {
                const next = prev - 1000;
                if (next <= 0) {
                    setMessage(null);
                    return 0;
                }
                setMessage(`Too many attempts. Try again in ${Math.ceil(next / 1000)}s`);
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [lockoutRemainingMs > 0]);

    const isLockedOut = lockoutRemainingMs > 0;

    const handlePress = (num: string) => {
        if (isLockedOut) return;
        if (pin.length < PIN_LENGTH) {
            setPinState(prev => prev + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        if (isLockedOut) return;
        setPinState(prev => prev.slice(0, -1));
        setError(false);
    };

    const checkPin = useCallback(async (currentPin: string) => {
        const result = await verifyPin(currentPin);
        if (result.success) {
            setMessage(null);
            onSuccess();
            return;
        }

        setError(true);
        Vibration.vibrate();

        if (result.lockedOutMs) {
            setMessage(`Too many attempts. Try again in ${Math.ceil(result.lockedOutMs / 1000)}s`);
            setLockoutRemainingMs(result.lockedOutMs);
        } else if (result.remainingAttempts !== undefined) {
            setMessage(`Incorrect PIN - ${result.remainingAttempts} attempt${result.remainingAttempts === 1 ? '' : 's'} left`);
        } else {
            setMessage('Incorrect PIN');
        }

        setTimeout(() => {
            setPinState('');
            // Keep error state briefly
        }, 500);
    }, [onSuccess]);

    useEffect(() => {
        if (pin.length === PIN_LENGTH && !isLockedOut) {
            checkPin(pin);
        }
    }, [pin, checkPin, isLockedOut]);

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
                        <TouchableOpacity key={index} style={styles.key} disabled={isLockedOut} onPress={() => handlePress(key)}>
                            <Text style={[styles.keyText, { color: isLockedOut ? colors.textSecondary : colors.text }]}>{key}</Text>
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
            minHeight: 20,
            textAlign: 'center',
            paddingHorizontal: 20,
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

            <Text style={styles.errorText}>{error || message ? (message || 'Incorrect PIN') : ''}</Text>
        </View>
    );
};

export default PinEntryScreen;
