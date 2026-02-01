import { ASYNC_KEYS } from '@constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AIConsentService = {
    /**
     * Checks if the user has already consented to AI features.
     */
    hasConsented: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(ASYNC_KEYS.AI.CONSENT);
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
            await AsyncStorage.setItem(ASYNC_KEYS.AI.CONSENT, value ? 'true' : 'false');
        } catch (error) {
            console.error('Failed to save AI consent:', error);
        }
    }
};
