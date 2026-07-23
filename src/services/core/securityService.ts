import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import CryptoJS from 'crypto-js';

import { ASYNC_KEYS, SECURE_KEYS } from '@constants/config';

// ============= PIN =============

// A SHA-256 hex digest is always 64 hex chars - used to tell a hashed PIN apart from a
// legacy plaintext one (PINs are numeric-only and much shorter), so existing installs can
// be upgraded in place on their next successful unlock instead of needing a forced PIN reset.
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const hashPin = (pin: string): string => CryptoJS.SHA256(pin).toString();

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_DURATION_MS = 30 * 1000;

export interface PinVerifyResult {
    success: boolean;
    // > 0 while locked out - the attempt was rejected without even checking the PIN
    lockedOutMs?: number;
    // Only set on a wrong (non-lockout-triggering) attempt
    remainingAttempts?: number;
}

export type TimeoutOption = 'immediately' | 'daily' | 'weekly' | 'monthly';

export const TIMEOUT_OPTIONS: { label: string; value: TimeoutOption; durationMs: number }[] = [
    { label: 'Immediately', value: 'immediately', durationMs: 0 },
    { label: 'Daily (24h)', value: 'daily', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Weekly', value: 'weekly', durationMs: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Monthly (30d)', value: 'monthly', durationMs: 30 * 24 * 60 * 60 * 1000 },
];

export const setPin = async (pin: string): Promise<void> => {
    try {
        await SecureStore.setItemAsync(SECURE_KEYS.PIN_CODE, hashPin(pin));
    } catch (error) {
        console.error('Error setting PIN:', error);
        throw error;
    }
};

const clearPinLockoutState = async (): Promise<void> => {
    await AsyncStorage.multiRemove([ASYNC_KEYS.SECURITY.FAILED_PIN_ATTEMPTS, ASYNC_KEYS.SECURITY.PIN_LOCKOUT_UNTIL]);
};

/**
 * Remaining lockout time in ms, or 0 if not currently locked out. Exposed separately from
 * verifyPin so the UI can check on mount (e.g. app was killed and reopened mid-lockout)
 * without spending an attempt.
 */
export const getPinLockoutRemainingMs = async (): Promise<number> => {
    const lockoutUntilStr = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.PIN_LOCKOUT_UNTIL);
    if (!lockoutUntilStr) return 0;
    const remaining = parseInt(lockoutUntilStr, 10) - Date.now();
    return remaining > 0 ? remaining : 0;
};

export const verifyPin = async (inputPin: string): Promise<PinVerifyResult> => {
    try {
        const lockedOutMs = await getPinLockoutRemainingMs();
        if (lockedOutMs > 0) {
            return { success: false, lockedOutMs };
        }

        const stored = await SecureStore.getItemAsync(SECURE_KEYS.PIN_CODE);
        if (!stored) return { success: false };

        const isLegacyPlaintext = !HASH_PATTERN.test(stored);
        const isMatch = isLegacyPlaintext ? stored === inputPin : stored === hashPin(inputPin);

        if (isMatch) {
            // Upgrade a legacy plaintext PIN to a hash now that we've verified it, so this
            // device never has to fall back to plaintext comparison again.
            if (isLegacyPlaintext) await setPin(inputPin);
            await clearPinLockoutState();
            return { success: true };
        }

        const failedAttemptsStr = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.FAILED_PIN_ATTEMPTS);
        const failedAttempts = (failedAttemptsStr ? parseInt(failedAttemptsStr, 10) : 0) + 1;

        if (failedAttempts >= MAX_PIN_ATTEMPTS) {
            const lockoutUntil = Date.now() + PIN_LOCKOUT_DURATION_MS;
            await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.PIN_LOCKOUT_UNTIL, lockoutUntil.toString());
            await AsyncStorage.removeItem(ASYNC_KEYS.SECURITY.FAILED_PIN_ATTEMPTS);
            return { success: false, lockedOutMs: PIN_LOCKOUT_DURATION_MS };
        }

        await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.FAILED_PIN_ATTEMPTS, failedAttempts.toString());
        return { success: false, remainingAttempts: MAX_PIN_ATTEMPTS - failedAttempts };
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return { success: false };
    }
};

export const isPinSet = async (): Promise<boolean> => {
    try {
        const pin = await SecureStore.getItemAsync(SECURE_KEYS.PIN_CODE);
        return !!pin;
    } catch {
        return false;
    }
};

export const deletePin = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(SECURE_KEYS.PIN_CODE);
        await clearPinLockoutState();
    } catch (error) {
        console.error('Error deleting PIN:', error);
    }
};

export const saveTimeoutSetting = async (option: TimeoutOption): Promise<void> => {
    await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.TIMEOUT_SETTING, option);
};

export const getTimeoutSetting = async (): Promise<TimeoutOption> => {
    const setting = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.TIMEOUT_SETTING);
    return (setting as TimeoutOption) || 'daily'; // Default to daily as per request
};

export const updateLastActiveTime = async (): Promise<void> => {
    await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.LAST_ACTIVE, Date.now().toString());
};

export const shouldLockApp = async (): Promise<boolean> => {
    // 1. Check if PIN is set
    const hasPin = await isPinSet();
    if (!hasPin) return false;

    // 2. Get Timeout Setting
    const timeoutOption = await getTimeoutSetting();
    if (timeoutOption === 'immediately') return true;

    // 3. Get Last Active Time
    const lastActiveStr = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.LAST_ACTIVE);
    if (!lastActiveStr) return true; // Safety fallback

    const lastActive = parseInt(lastActiveStr, 10);
    const now = Date.now();
    const elapsed = now - lastActive;

    // 4. Find duration
    const option = TIMEOUT_OPTIONS.find(o => o.value === timeoutOption);
    const maxDuration = option ? option.durationMs : 0;

    return elapsed > maxDuration;
};

export const hasBiometrics = async (): Promise<boolean> => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return hasHardware && isEnrolled;
    } catch {
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

export const getBiometricType = async (): Promise<'FINGERPRINT' | 'FACIAL_RECOGNITION' | 'IRIS' | 'UNKNOWN'> => {
    try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'FACIAL_RECOGNITION';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'FINGERPRINT';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'IRIS';
        }
        return 'UNKNOWN';
    } catch {
        return 'UNKNOWN';
    }
};
