import 'react-native-get-random-values';

/**
 * Generates a standard UUID v4.
 * Uses the crypto.randomUUID() polyfill provided by react-native-get-random-values.
 */
export const generateUUID = (): string => {
    return crypto.randomUUID();
};
