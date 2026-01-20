import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { usePrivacy } from '../context/PrivacyContext';

/**
 * Hook to manage screen capture protection based on privacy settings.
 *
 * - ON (Privacy Enabled/Hidden Values): Allows screenshots.
 * - OFF (Privacy Disabled/Visible Values): Prevents screenshots (FLAG_SECURE).
 */
export const useScreenshotProtection = () => {
    const { isPrivacyEnabled } = usePrivacy();

    useEffect(() => {
        const updateProtection = async () => {
            try {
                if (isPrivacyEnabled) {
                    await ScreenCapture.allowScreenCaptureAsync();
                } else {
                    await ScreenCapture.preventScreenCaptureAsync();
                }
            } catch (error) {
                console.error('Failed to toggle screen capture protection:', error);
            }
        };

        updateProtection();
    }, [isPrivacyEnabled]);
};
