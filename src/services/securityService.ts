import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const KEYS = {
    PIN_CODE: 'wealthsnap_security_pin', // SecureStore key
    TIMEOUT_SETTING: '@wealthsnap_security_timeout', // AsyncStorage key
    LAST_ACTIVE: '@wealthsnap_security_last_active', // AsyncStorage key
};

export type TimeoutOption = 'immediately' | 'daily' | 'weekly' | 'monthly';

export const TIMEOUT_OPTIONS: { label: string; value: TimeoutOption; durationMs: number }[] = [
    { label: 'Immediately', value: 'immediately', durationMs: 0 },
    { label: 'Daily (24h)', value: 'daily', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Weekly', value: 'weekly', durationMs: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Monthly (30d)', value: 'monthly', durationMs: 30 * 24 * 60 * 60 * 1000 },
];

export const setPin = async (pin: string): Promise<void> => {
    try {
        await SecureStore.setItemAsync(KEYS.PIN_CODE, pin);
    } catch (error) {
        console.error('Error setting PIN:', error);
        throw error;
    }
};

export const verifyPin = async (inputPin: string): Promise<boolean> => {
    try {
        const storedPin = await SecureStore.getItemAsync(KEYS.PIN_CODE);
        return storedPin === inputPin;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
};

export const isPinSet = async (): Promise<boolean> => {
    try {
        const pin = await SecureStore.getItemAsync(KEYS.PIN_CODE);
        return !!pin;
    } catch (error) {
        return false;
    }
};

export const deletePin = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(KEYS.PIN_CODE);
    } catch (error) {
        console.error('Error deleting PIN:', error);
    }
};

export const saveTimeoutSetting = async (option: TimeoutOption): Promise<void> => {
    await AsyncStorage.setItem(KEYS.TIMEOUT_SETTING, option);
};

export const getTimeoutSetting = async (): Promise<TimeoutOption> => {
    const setting = await AsyncStorage.getItem(KEYS.TIMEOUT_SETTING);
    return (setting as TimeoutOption) || 'daily'; // Default to daily as per request
};

export const updateLastActiveTime = async (): Promise<void> => {
    await AsyncStorage.setItem(KEYS.LAST_ACTIVE, Date.now().toString());
};

export const shouldLockApp = async (): Promise<boolean> => {
    // 1. Check if PIN is set
    const hasPin = await isPinSet();
    if (!hasPin) return false;

    // 2. Get Timeout Setting
    const timeoutOption = await getTimeoutSetting();
    if (timeoutOption === 'immediately') return true;

    // 3. Get Last Active Time
    const lastActiveStr = await AsyncStorage.getItem(KEYS.LAST_ACTIVE);
    if (!lastActiveStr) return true; // Safety fallback

    const lastActive = parseInt(lastActiveStr, 10);
    const now = Date.now();
    const elapsed = now - lastActive;

    // 4. Find duration
    const option = TIMEOUT_OPTIONS.find(o => o.value === timeoutOption);
    const maxDuration = option ? option.durationMs : 0;

    return elapsed > maxDuration;
};

// ============= Biometrics =============

import * as LocalAuthentication from 'expo-local-authentication';

export const hasBiometrics = async (): Promise<boolean> => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return hasHardware && isEnrolled;
    } catch (error) {
        return false;
    }
};

export const authenticateBiometrics = async (): Promise<boolean> => {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock WealthSnap',
            fallbackLabel: 'Use PIN',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false, // Allow device passcode if needed, typically we want our app PIN as fallback though. 
        });
        return result.success;
    } catch (error) {
        console.error('Biometric auth error:', error);
        return false;
    }
};
