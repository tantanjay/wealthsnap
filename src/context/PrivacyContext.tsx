import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_ENABLED_KEY = '@wealthsnap_privacy_enabled';

interface PrivacyContextType {
    isPrivacyEnabled: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
    isPrivacyEnabled: false,
    togglePrivacy: () => { },
});

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);

    useEffect(() => {
        loadPrivacySetting();
    }, []);

    const loadPrivacySetting = async () => {
        try {
            const storedValue = await AsyncStorage.getItem(PRIVACY_ENABLED_KEY);
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
            await AsyncStorage.setItem(PRIVACY_ENABLED_KEY, String(newValue));
        } catch (error) {
            console.error('Failed to save privacy setting:', error);
        }
    };

    return (
        <PrivacyContext.Provider value={{ isPrivacyEnabled, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = () => useContext(PrivacyContext);
