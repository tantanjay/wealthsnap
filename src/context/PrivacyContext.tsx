import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ASYNC_KEYS } from '@constants/config';

// How long a "reveal for screenshot" override lasts before protection resumes.
const SCREENSHOT_REVEAL_DURATION_MS = 15000;

interface PrivacyContextType {
    isPrivacyEnabled: boolean;
    togglePrivacy: () => void;
    isScreenshotRevealActive: boolean;
    revealForScreenshot: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
    isPrivacyEnabled: false,
    togglePrivacy: () => { },
    isScreenshotRevealActive: false,
    revealForScreenshot: () => { },
});

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
    const [isScreenshotRevealActive, setIsScreenshotRevealActive] = useState(false);
    const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        loadPrivacySetting();
    }, []);

    const loadPrivacySetting = async () => {
        try {
            const storedValue = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.PRIVACY_ENABLED);
            if (storedValue !== null) {
                setIsPrivacyEnabled(storedValue === 'true');
            }
        } catch (error) {
            console.error('Failed to load privacy setting:', error);
        }
    };

    const togglePrivacy = async () => {
        try {
            const newValue = !isPrivacyEnabled;
            setIsPrivacyEnabled(newValue);
            await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.PRIVACY_ENABLED, String(newValue));
        } catch (error) {
            console.error('Failed to save privacy setting:', error);
        }
    };

    // Temporarily bypasses screenshot protection without persisting or unmasking anything.
    const revealForScreenshot = () => {
        if (revealTimerRef.current) {
            clearTimeout(revealTimerRef.current);
        }
        setIsScreenshotRevealActive(true);
        revealTimerRef.current = setTimeout(() => {
            setIsScreenshotRevealActive(false);
            revealTimerRef.current = null;
        }, SCREENSHOT_REVEAL_DURATION_MS);
    };

    return (
        <PrivacyContext.Provider value={{ isPrivacyEnabled, togglePrivacy, isScreenshotRevealActive, revealForScreenshot }}>
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = () => useContext(PrivacyContext);
