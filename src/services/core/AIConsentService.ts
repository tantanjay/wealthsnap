import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'AI_CONSENT_GRANTED';

export const AIConsentService = {
    /**
     * Checks if the user has already consented to AI features.
     */
    hasConsented: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEY);
            return value === 'true';
        } catch (error) {
            console.error('Failed to check AI consent:', error);
            return false;
        }
    },

    /**
     * Sets the user's consent status.
     */
    setConsented: async (value: boolean): Promise<void> => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
        } catch (error) {
            console.error('Failed to save AI consent:', error);
        }
    }
};
