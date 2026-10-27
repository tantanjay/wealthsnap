import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ASYNC_KEYS } from '@constants/config';

// How long a "reveal for screenshot" override lasts before protection resumes.
const SCREENSHOT_REVEAL_DURATION_MS = 15000;

// Open shows amounts, Discreet shows scale-free alternatives, Hidden masks with ****.
export type PrivacyMode = 'open' | 'discreet' | 'hidden';

const isPrivacyMode = (value: string | null): value is PrivacyMode =>
    value === 'open' || value === 'discreet' || value === 'hidden';

interface PrivacyContextType {
    mode: PrivacyMode;
    setMode: (mode: PrivacyMode) => void;
    // True whenever mode isn't Open; screens without a Discreet version treat it as Hidden.
    isPrivacyEnabled: boolean;
    // Legacy eye buttons: Open <-> Hidden (Discreet goes to Open).
    togglePrivacy: () => void;
    isScreenshotRevealActive: boolean;
    revealForScreenshot: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
    mode: 'open',
    setMode: () => { },
    isPrivacyEnabled: false,
    togglePrivacy: () => { },
    isScreenshotRevealActive: false,
    revealForScreenshot: () => { },
});

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<PrivacyMode>('open');
    const [isScreenshotRevealActive, setIsScreenshotRevealActive] = useState(false);
    const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadPrivacySetting = async () => {
        try {
            const storedMode = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.PRIVACY_MODE);
            if (isPrivacyMode(storedMode)) {
                setModeState(storedMode);
                return;
            }

            // Silent migration from the old on/off flag: on -> Hidden, off -> Open.
            const legacy = await AsyncStorage.getItem(ASYNC_KEYS.SECURITY.PRIVACY_ENABLED);
            if (legacy !== null) {
                const migrated: PrivacyMode = legacy === 'true' ? 'hidden' : 'open';
                setModeState(migrated);
                await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.PRIVACY_MODE, migrated);
                await AsyncStorage.removeItem(ASYNC_KEYS.SECURITY.PRIVACY_ENABLED);
            }
        } catch (error) {
            console.error('Failed to load privacy setting:', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async storage read on mount; see FIXES.md
        loadPrivacySetting();
    }, []);

    const setMode = async (newMode: PrivacyMode) => {
        try {
            setModeState(newMode);
            await AsyncStorage.setItem(ASYNC_KEYS.SECURITY.PRIVACY_MODE, newMode);
        } catch (error) {
            console.error('Failed to save privacy setting:', error);
        }
    };

    const togglePrivacy = () => {
        setMode(mode === 'open' ? 'hidden' : 'open');
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
        <PrivacyContext.Provider
            value={{
                mode,
                setMode,
                isPrivacyEnabled: mode !== 'open',
                togglePrivacy,
                isScreenshotRevealActive,
                revealForScreenshot,
            }}
        >
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = () => useContext(PrivacyContext);
