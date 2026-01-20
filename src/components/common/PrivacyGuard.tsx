import React, { useState, useEffect } from 'react';
import { View, AppState, StyleSheet } from 'react-native';
import { usePrivacy } from '../../context/PrivacyContext';
import { useScreenshotProtection } from '../../hooks/useScreenshotProtection';

export const PrivacyGuard: React.FC = () => {
    const { isPrivacyEnabled } = usePrivacy();
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
    }, [isPrivacyEnabled]);

    // Logic:
    // If Privacy Mode is OFF (Protection Needed: isPrivacyEnabled = false)
    // AND App is NOT Active (Background/Inactive)
    // THEN Show Overlay
    const showOverlay = !isPrivacyEnabled && !isAppActive;

    if (!showOverlay) {
        return null;
    }

    return (
        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none" />
    );
};

const styles = StyleSheet.create({
    overlay: {
        backgroundColor: '#FFFFFF', // White overlay to mask content
        zIndex: 99999, // Ensure it sits on top of everything
        elevation: 99999, // Android elevation
    },
});
