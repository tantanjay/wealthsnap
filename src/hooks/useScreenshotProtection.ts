import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

import { usePrivacy } from '@context/PrivacyContext';

// Blocks screenshots (FLAG_SECURE) in Open unless a "Reveal for screenshot" window is
// active; Discreet and Hidden always allow them.
export const useScreenshotProtection = () => {
    const { mode, isScreenshotRevealActive } = usePrivacy();
    const allowCapture = mode !== 'open' || isScreenshotRevealActive;

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
