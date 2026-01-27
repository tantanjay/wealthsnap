import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { BigNumber } from 'bignumber.js';

import { SECURE_KEYS } from '@constants/config';

// In-memory cache for the encryption key to avoid repeated SecureStore I/O
let cachedKey: string | null = null;

const decryptFieldSync = (ciphertext: string | null | undefined, key: string): string | null => {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        return bytes.toString(CryptoJS.enc.Utf8) || null;
    } catch {
        return null;
    }
};

/**
 * Generate or retrieve the device-specific encryption key from SecureStore.
 * Uses in-memory caching to avoid repeated I/O operations during bulk operations.
 * This key is used for invisible local storage encryption.
 */
const getStorageKey = async (): Promise<string> => {
    // Return cached key if available (major performance boost for bulk operations)
    if (cachedKey) {
        return cachedKey;
    }

    try {
        let key = await SecureStore.getItemAsync(SECURE_KEYS.ENCRYPTION_KEY);
        if (!key) {
            // Generate a random 256-bit key (32 bytes -> 64 hex chars)
            key = CryptoJS.lib.WordArray.random(32).toString();
            await SecureStore.setItemAsync(SECURE_KEYS.ENCRYPTION_KEY, key);
        }
        // Cache the key in memory
        cachedKey = key;
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

/**
 * Encrypts a single field value (for field-level encryption in SQLite)
 * @param value The value to encrypt (string or number)
 * @returns Encrypted string, or null if value is null/undefined
 */
export const encryptField = async (
    value: string | number | BigNumber | null | undefined
): Promise<string | null> => {
    if (value === null || value === undefined) return null;

    try {
        const key = await getStorageKey();
        let stringValue: string;

        // 1. Handle BigNumber explicitly
        if (BigNumber.isBigNumber(value)) {
            // Use toFixed() to avoid scientific notation (1e-8) in your DB strings
            stringValue = value.toFixed();
        }
        // 2. Handle native numbers
        else if (typeof value === 'number') {
            stringValue = value.toString();
        }
        // 3. Already a string
        else {
            stringValue = value;
        }

        return CryptoJS.AES.encrypt(stringValue, key).toString();
    } catch (error) {
        console.error('Error encrypting field:', error);
        throw new Error('Field encryption failed');
    }
};

/**
 * Decrypts a single field value
 * @param ciphertext The encrypted field value
 * @returns Decrypted value as string, or null if decryption fails
 */
export const decryptField = async (ciphertext: string | null | undefined): Promise<string | null> => {
    if (!ciphertext) return null;
    try {
        const key = await getStorageKey();
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return decryptedString || null;
    } catch (error) {
        console.error('Error decrypting field:', error);
        return null;
    }
};

/**
 *  Bulk decrypts a list of objects while keeping the UI responsive.
 * @param items The array of encrypted objects from SQLite
 * @param fieldsToDecrypt Array of keys that need decryption (e.g., ['amount', 'note'])
 * @param onProgress Optional callback to track loading progress
 */
export const bulkDecryptItems = async <T>(
    items: any[],
    fieldsToDecrypt: string[],
    onProgress?: (progress: number) => void
): Promise<T[]> => {
    const key = await getStorageKey();
    const decryptedResults: T[] = [];
    const CHUNK_SIZE = 500;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const decryptedItem = { ...item };

        // Decrypt only the specified fields
        for (const field of fieldsToDecrypt) {
            if (item[field]) {
                decryptedItem[field] = decryptFieldSync(item[field], key);
            }
        }

        decryptedResults.push(decryptedItem as T);

        // Yield control to the UI thread every CHUNK_SIZE items
        if (i > 0 && i % CHUNK_SIZE === 0) {
            if (onProgress) onProgress(i / items.length);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return decryptedResults;
};