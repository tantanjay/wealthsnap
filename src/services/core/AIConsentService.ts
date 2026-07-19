import { CONFIG, ASYNC_KEYS } from '@constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AIConsentService = {
    /**
     * Checks if the user has consented to the CURRENT AI Data Usage disclosure.
     * Stores the consented version (not just a boolean) so that if the disclosure
     * text changes to cover new categories of data, previously-consented users are
     * re-prompted once - old boolean 'true'/'false' values parse to NaN here, which
     * naturally fails the version check and forces a re-prompt too.
     */
    hasConsented: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(ASYNC_KEYS.AI.CONSENT);
            const consentedVersion = value ? parseInt(value, 10) : 0;
            return consentedVersion >= CONFIG.AI_CONSENT_VERSION;
        } catch (error) {
            console.error('Failed to check AI consent:', error);
            return false;
        }
    },

    /**
     * Records that the user consented to the current AI Data Usage disclosure version.
     */
    setConsented: async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(ASYNC_KEYS.AI.CONSENT, CONFIG.AI_CONSENT_VERSION.toString());
        } catch (error) {
            console.error('Failed to save AI consent:', error);
        }
    }
};
