import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';
import { authenticateBiometrics, getBiometricType, getPinLockoutRemainingMs, hasBiometrics, verifyPin } from '@services/core/securityService';

interface PinEntryScreenProps {
    onSuccess: () => void;
}

const PIN_LENGTH = 6;

const PinEntryScreen: React.FC<PinEntryScreenProps> = ({ onSuccess }) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async biometric hardware check on mount; see FIXES.md
        checkBiometrics();
    }, [checkBiometrics]);

    // Catches the case where the app was killed and reopened while still mid-lockout.
    useEffect(() => {
        getPinLockoutRemainingMs().then(ms => {
            if (ms > 0) setLockoutRemainingMs(ms);
        });
    }, []);

    const isLockedOut = lockoutRemainingMs > 0;

    // Countdown ticker while locked out
    useEffect(() => {
        if (!isLockedOut) return;

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
    }, [isLockedOut]);

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
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async verifyPin() security-service call; see FIXES.md
            checkPin(pin);
        }
    }, [pin, checkPin, isLockedOut]);

    const renderDots = () => {
        const tone = error ? ds.danger : ds.accent;
        return (
            <View style={styles.dotsContainer}>
                {[...Array(PIN_LENGTH)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            {
                                borderColor: tone,
                                backgroundColor: pin.length > i ? tone : 'transparent',
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
                                        color={ds.accent}
                                    />
                                </TouchableOpacity>
                            );
                        }
                        return <View key={index} style={styles.key} />;
                    }
                    if (key === 'del') {
                        return (
                            <TouchableOpacity key={index} style={styles.key} onPress={handleDelete}>
                                <Ionicons name="backspace-outline" size={28} color={ds.text2} />
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity key={index} style={styles.key} disabled={isLockedOut} onPress={() => handlePress(key)}>
                            <Text style={[type.titleNum, { color: isLockedOut ? ds.text3 : ds.text }]}>{key}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: ds.canvas,
                    paddingTop: Math.max(insets.top, space[5]),
                    paddingBottom: Math.max(insets.bottom, space[5]),
                },
            ]}
        >
            <View style={styles.header}>
                <View style={[styles.lockIcon, { backgroundColor: ds.accentSoft }]}>
                    <Ionicons name="lock-closed-outline" size={32} color={ds.accent} />
                </View>
                <Text style={[type.title, styles.center, { color: ds.text }]}>WealthSnap Locked</Text>
                <Text style={[type.small, styles.center, { color: ds.text2 }]}>Enter your PIN to access</Text>
            </View>

            {renderDots()}
            {renderKeypad()}

            <Text style={[type.small, styles.errorText, { color: ds.danger }]}>{error || message ? (message || 'Incorrect PIN') : ''}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: layout.groupInset,
    },
    header: {
        alignItems: 'center',
        gap: space[2],
        marginBottom: space[7],
    },
    lockIcon: {
        width: 72,
        height: 72,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: space[2],
    },
    center: {
        textAlign: 'center',
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
    errorText: {
        marginTop: space[5],
        minHeight: 18,
        textAlign: 'center',
        paddingHorizontal: space[5],
    },
});

export default PinEntryScreen;
