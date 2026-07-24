import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { BigNumber } from 'bignumber.js';

import { CONFIG, SECURE_KEYS } from '@constants/config';

// In-memory cache for the encryption key to avoid repeated SecureStore I/O
let cachedKey: string | null = null;

// In-flight key generation, so concurrent first-use callers (e.g. a bulk import racing multiple
// encryptField calls before any key has ever been generated) await the same generation+persist
// instead of each generating and persisting their own random key, only one of which survives.
let keyPromise: Promise<string> | null = null;

// Prefixed onto plaintext before encrypting field-level values (not the JSON blobs from
// encryptData/decryptData, which already get a decent implicit integrity check from JSON.parse
// failing on non-JSON garbage). A decrypt that recovers this marker is high-confidence correct;
// one that doesn't is either legacy data encrypted before this marker existed (real, valid value -
// kept as-is for backward compatibility) or a wrong-key decrypt that happened to produce valid
// UTF-8 - this only protects data written after this fix, not retroactively.
const FIELD_INTEGRITY_MARKER = 'WSF1';

// A hex-string key passed to CryptoJS.AES.encrypt/decrypt is treated as a *passphrase*: CryptoJS
// derives the real AES key/IV from it via a single-round-MD5 KDF (EVP_BytesToKey) on every single
// call, discarding most of the strength of the actual random 256-bit key generated in
// getStorageKey() below - and paying that KDF cost on every encrypt/decrypt. Only the
// device-local SecureStore key goes through this new explicit-key+IV path; a caller-supplied
// `secret` (password-protected backups/sync) still goes through the classic passphrase mode
// below, since that's the correct, standard way to derive a key from an arbitrary user-typed
// password and needs to stay independently restorable from just that password. ':' can never
// appear in base64 output, so this prefix can never collide with a legacy (or password-mode)
// ciphertext, which is always plain base64.
const DEVICE_KEY_FORMAT_PREFIX = 'v2:';

const encryptWithDeviceKey = (plaintext: string, hexKey: string): string => {
    const keyWordArray = CryptoJS.enc.Hex.parse(hexKey);
    const iv = CryptoJS.lib.WordArray.random(16);
    const cipherTextBase64 = CryptoJS.AES.encrypt(plaintext, keyWordArray, { iv }).toString();
    return `${DEVICE_KEY_FORMAT_PREFIX}${iv.toString(CryptoJS.enc.Base64)}:${cipherTextBase64}`;
};

const decryptWithDeviceKey = (ciphertext: string, hexKey: string): string => {
    if (ciphertext.startsWith(DEVICE_KEY_FORMAT_PREFIX)) {
        const rest = ciphertext.slice(DEVICE_KEY_FORMAT_PREFIX.length);
        const sepIdx = rest.indexOf(':');
        const iv = CryptoJS.enc.Base64.parse(rest.slice(0, sepIdx));
        const keyWordArray = CryptoJS.enc.Hex.parse(hexKey);
        const bytes = CryptoJS.AES.decrypt(rest.slice(sepIdx + 1), keyWordArray, { iv });
        return bytes.toString(CryptoJS.enc.Utf8);
    }
    // Legacy passphrase-mode ciphertext, encrypted before this format existed - decrypt exactly
    // as before.
    return CryptoJS.AES.decrypt(ciphertext, hexKey).toString(CryptoJS.enc.Utf8);
};

const decryptFieldSync = (ciphertext: string | null | undefined, key: string): string | null => {
    if (!ciphertext) return null;
    try {
        const decryptedString = decryptWithDeviceKey(ciphertext, key);
        if (!decryptedString) return null;
        return decryptedString.startsWith(FIELD_INTEGRITY_MARKER)
            ? decryptedString.slice(FIELD_INTEGRITY_MARKER.length)
            : decryptedString;
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

    // Join an already-in-flight generation instead of starting a second one.
    if (keyPromise) {
        return keyPromise;
    }

    keyPromise = (async () => {
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
            throw new Error('Unable to retrieve device encryption key');
        } finally {
            keyPromise = null;
        }
    })();

    return keyPromise;
};

/**
 * Encrypts an object or string using AES-256.
 * @param data The data to encrypt (object or string)
 * @param secret Optional custom secret (e.g., for password-protected backups). If omitted, uses device SecureStore key.
 * @returns Ciphertext string
 */
export const encryptData = async (data: any, secret?: string): Promise<string> => {
    try {
        const jsonString = JSON.stringify(data);
        if (secret) {
            // User-supplied password - keep classic passphrase mode, the standard way to derive
            // a key from an arbitrary password.
            return CryptoJS.AES.encrypt(jsonString, secret).toString();
        }
        const key = await getStorageKey();
        return encryptWithDeviceKey(jsonString, key);
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
    if (secret) {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            return decryptedString ? JSON.parse(decryptedString) : null;
        } catch (error) {
            console.error('Error decrypting data:', error);
            return null;
        }
    }

    // Key retrieval failing (SecureStore itself inaccessible) is a systemic problem, not a
    // per-item decrypt failure - let it throw instead of collapsing to the same null every
    // caller already treats as "no data here".
    const key = await getStorageKey();
    try {
        const decryptedString = decryptWithDeviceKey(ciphertext, key);
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

        return encryptWithDeviceKey(`${FIELD_INTEGRITY_MARKER}${stringValue}`, key);
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
    // See decryptData for why key retrieval is outside this try/catch.
    const key = await getStorageKey();
    try {
        const decryptedString = decryptWithDeviceKey(ciphertext, key);
        if (!decryptedString) return null;
        return decryptedString.startsWith(FIELD_INTEGRITY_MARKER)
            ? decryptedString.slice(FIELD_INTEGRITY_MARKER.length)
            : decryptedString;
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
        if (i > 0 && i % CONFIG.CHUNK_SIZE === 0) {
            if (onProgress) onProgress(i / items.length);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return decryptedResults;
};
