import React, { useState, useEffect } from 'react';
import { View, AppState, StyleSheet } from 'react-native';

import { usePrivacy } from '@context/PrivacyContext';
import { useTheme } from '@context/ThemeContext';
import { useScreenshotProtection } from '@hooks/useScreenshotProtection';

export const PrivacyGuard: React.FC = () => {
    const { mode } = usePrivacy();
    const { ds } = useTheme();
    const [isAppActive, setIsAppActive] = useState(true);

    // 1. Activate OS-Level Protection (FLAG_SECURE)
    useScreenshotProtection();

    // 2. Activate UI-Level Protection (Overlay) for App Switcher
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            setIsAppActive(nextAppState === 'active');
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Mask the app switcher whenever screenshots are blocked (every mode but Hidden).
    const showOverlay = mode !== 'hidden' && !isAppActive;

    if (!showOverlay) {
        return null;
    }

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: ds.bg }]} pointerEvents="none" />
    );
};

const styles = StyleSheet.create({
    overlay: {
        zIndex: 99999, // Ensure it sits on top of everything
        elevation: 99999, // Android elevation
    },
});
