import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

import { usePrivacy } from '@context/PrivacyContext';

// Blocks screenshots (FLAG_SECURE) in Open and Discreet; only Hidden, or an active
// "Reveal for screenshot" window, allows them.
export const useScreenshotProtection = () => {
    const { mode, isScreenshotRevealActive } = usePrivacy();
    const allowCapture = mode === 'hidden' || isScreenshotRevealActive;

    useEffect(() => {
        const updateProtection = async () => {
            try {
                if (allowCapture) {
                    await ScreenCapture.allowScreenCaptureAsync();
                } else {
                    await ScreenCapture.preventScreenCaptureAsync();
                }
            } catch (error) {
                console.error('Failed to toggle screen capture protection:', error);
            }
        };

        updateProtection();
    }, [allowCapture]);
};
