import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { shouldLockApp, updateLastActiveTime } from '../services/securityService';
import PinEntryScreen from '../screens/security/PinEntryScreen';
import { isOnboardingComplete } from '../services/storageService';


interface SecurityContextType {
    isLocked: boolean;
    lockApp: () => void;
    unlockApp: () => void;
    temporarilyDisableLock: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLocked, setIsLocked] = useState(false);
    const appState = useRef(AppState.currentState);
    const isPickingFile = useRef(false);

    const checkLockState = useCallback(async () => {
        const startOnboarding = await isOnboardingComplete();
        // Don't lock if user hasn't finished onboarding or is in the middle of it
        if (!startOnboarding) return;

        const locked = await shouldLockApp();
        if (locked) {
            setIsLocked(true);
        }
    }, []);

    const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            // App coming to foreground
            if (isPickingFile.current) {
                isPickingFile.current = false;
                return;
            }

            await checkLockState();
        } else if (nextAppState.match(/inactive|background/)) {
            // App going to background
            if (!isPickingFile.current) {
                await updateLastActiveTime();
            }
        }
        appState.current = nextAppState;
    }, [checkLockState]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Initial check
        checkLockState();

        return () => {
            subscription.remove();
        };
    }, [handleAppStateChange, checkLockState]);

    const lockApp = () => setIsLocked(true);
    const unlockApp = async () => {
        setIsLocked(false);
        await updateLastActiveTime();
    };

    const temporarilyDisableLock = useCallback(() => {
        isPickingFile.current = true;
    }, []);

    return (
        <SecurityContext.Provider value={{ isLocked, lockApp, unlockApp, temporarilyDisableLock }}>
            {children}
            {isLocked && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                    <PinEntryScreen onSuccess={unlockApp} />
                </View>
            )}
        </SecurityContext.Provider>
    );
};
