import { useCallback } from 'react';
import { AIConsentService } from '@services/core/AIConsentService';
import { useAlert } from '@context/AlertContext';
import { isGeminiConfigured } from '@services/integrations';

export const useAIConsent = () => {
    const { showAlert } = useAlert();

    /**
     * Checks for AI consent. If not granted, shows a confirmation dialog.
     * @param onConsent Callback to execute if consent is granted (or was already granted).
     * @param onDeny Optional callback if user denies consent.
     */
    const checkConsent = useCallback(async (onConsent: () => void, onDeny?: () => void) => {
        const isConfigured = await isGeminiConfigured();
        if (!isConfigured) {
            showAlert(
                "Missing API Key",
                "You have not configured your Gemini API Key. Please go to settings and input your API key to continue.",
                [{ text: "OK", onPress: onDeny }]
            );
            return;
        }

        const hasConsented = await AIConsentService.hasConsented();

        if (hasConsented) {
            onConsent();
            return;
        }

        showAlert(
            "AI Data Usage Consent",
            "WealthSnap will send this data to Google Gemini for analysis. \n\nWe may send receipt images or stock symbol lists to Gemini API for processing. Do you consent?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => {
                        if (onDeny) onDeny();
                    }
                },
                {
                    text: "I Consent",
                    onPress: async () => {
                        await AIConsentService.setConsented(true);
                        onConsent();
                    }
                }
            ],
            { cancelable: true, onDismiss: onDeny }
        );
    }, [showAlert]);

    return { checkConsent };
};
