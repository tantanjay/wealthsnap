import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../styles/theme';

type ThemeType = typeof lightTheme;
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    mode: ThemeMode;
    colors: ThemeType['colors'];
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    mode: 'system',
    colors: lightTheme.colors,
    setMode: () => { },
    toggleTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [theme, setTheme] = useState<ThemeType>(lightTheme);

    useEffect(() => {
        loadThemePreference();
    }, []);

    useEffect(() => {
        updateTheme(mode, systemColorScheme);
    }, [mode, systemColorScheme]);

    const loadThemePreference = async () => {
        try {
            const storedMode = await AsyncStorage.getItem('@wealthsnap_theme_mode');
            if (storedMode) {
                setModeState(storedMode as ThemeMode);
            }
        } catch (error) {
            console.error('Failed to load theme preference', error);
        }
    };

    const updateTheme = (currentMode: ThemeMode, sysScheme: 'light' | 'dark' | null | undefined) => {
        if (currentMode === 'system') {
            setTheme(sysScheme === 'dark' ? darkTheme : lightTheme);
        } else {
            setTheme(currentMode === 'dark' ? darkTheme : lightTheme);
        }
    };

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem('@wealthsnap_theme_mode', newMode);
        } catch (error) {
            console.error('Failed to save theme preference', error);
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
            colors: theme.colors,
            setMode,
            toggleTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
