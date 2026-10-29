import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

import { resolveTheme, SKINS, DEFAULT_SKIN, type Theme, type SkinId } from '@styles/theme';
import { ASYNC_KEYS } from '@constants/config';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    mode: ThemeMode;
    skin: SkinId;
    ds: Theme['ds'];
    elevation: Theme['elevation'];
    setMode: (mode: ThemeMode) => void;
    setSkin: (skin: SkinId) => void;
    toggleTheme: () => void;
}

const defaultTheme = resolveTheme(DEFAULT_SKIN, 'light');

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultTheme,
    mode: 'system',
    skin: DEFAULT_SKIN,
    ds: defaultTheme.ds,
    elevation: defaultTheme.elevation,
    setMode: () => { },
    setSkin: () => { },
    toggleTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN);

    // Skin picks the palette, mode picks its light or dark half.
    const theme: Theme = useMemo(() => {
        const effectiveMode = mode === 'system' ? systemColorScheme : mode;
        return resolveTheme(skin, effectiveMode === 'dark' ? 'dark' : 'light');
    }, [mode, skin, systemColorScheme]);

    const loadThemePreference = async () => {
        try {
            const [storedMode, storedSkin] = await Promise.all([
                AsyncStorage.getItem(ASYNC_KEYS.THEME_MODE),
                AsyncStorage.getItem(ASYNC_KEYS.THEME_SKIN),
            ]);
            if (storedMode) {
                setModeState(storedMode as ThemeMode);
            }
            // Ignore an id from a build that had a skin this one doesn't.
            if (storedSkin && storedSkin in SKINS) {
                setSkinState(storedSkin as SkinId);
            }
        } catch (error) {
            console.error('Failed to load theme preference', error);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async storage read on mount; see FIXES.md
        loadThemePreference();
    }, []);

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem(ASYNC_KEYS.THEME_MODE, newMode);
        } catch (error) {
            console.error('Failed to save theme preference', error);
        }
    };

    const setSkin = async (newSkin: SkinId) => {
        setSkinState(newSkin);
        try {
            await AsyncStorage.setItem(ASYNC_KEYS.THEME_SKIN, newSkin);
        } catch (error) {
            console.error('Failed to save skin preference', error);
        }
    };

    const toggleTheme = () => {
        if (mode === 'light') {
            setMode('dark');
        } else if (mode === 'dark') {
            setMode('system');
        } else {
            setMode('light');
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            mode,
            skin,
            ds: theme.ds,
            elevation: theme.elevation,
            setMode,
            setSkin,
            toggleTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
