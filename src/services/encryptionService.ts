import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_ALIAS = 'wealthsnap_data_encryption_key';

/**
 * Generate or retrieve the device-specific encryption key from SecureStore.
 * This key is used for invisible local storage encryption.
 */
const getStorageKey = async (): Promise<string> => {
    try {
        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
        if (!key) {
            // Generate a random 256-bit key (32 bytes -> 64 hex chars)
            key = CryptoJS.lib.WordArray.random(32).toString();
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
        }
        return key;
    } catch (error) {
        console.error('Error accessing SecureStore for encryption key:', error);
        // Fallback for dev/testing if SecureStore fails (should handle gracefully in prod)
        return 'fallback-dev-key-do-not-use-in-prod';
    }
};

/**
 * Encrypts an object or string using AES-256.
 * @param data The data to encrypt (object or string)
 * @param secret Optional custom secret (e.g., for password-protected backups). If omitted, uses device SecureStore key.
 * @returns Ciphertext string
 */
export const encryptData = async (data: any, secret?: string): Promise<string> => {
    try {
        const key = secret || await getStorageKey();
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, key).toString();
    } catch (error) {
        console.error('Error encrypting data:', error);
        throw new Error('Encryption failed');
    }
};

/**
 * Decrypts a ciphertext string back to original data.
 * @param ciphertext The encrypted string
 * @param secret Optional custom secret. If omitted, uses device SecureStore key.
 * @returns Decrypted data object or null if failure
 */
export const decryptData = async (ciphertext: string, secret?: string): Promise<any | null> => {
    try {
        const key = secret || await getStorageKey();
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return decryptedString ? JSON.parse(decryptedString) : null;
    } catch (error) {
        // Common error: Wrong key or corrupted data
        console.error('Error decrypting data:', error);
        return null;
    }
};
