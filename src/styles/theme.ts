export const PALETTE = {
    primary: '#1976D2',      // Financial Blue 700
    primaryDark: '#0D47A1',  // Blue 900
    primaryLight: '#42A5F5', // Blue 400
    secondary: '#FFA000',    // Amber 700 (Complementary, Wealth/Gold)
    secondaryDark: '#FF6F00',// Amber 900
    secondaryLight: '#FFCA28',// Amber 200
    accent: '#00BFA5',       // Teal A700 (Growth/Positive)
    white: '#FFFFFF',
    black: '#000000',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    error: '#D32F2F',        // Red 700 (Standard Error)
    warning: '#F57C00',      // Orange 700
    info: '#0288D1',         // Light Blue 700
    success: '#388E3C',      // Green 700 (Positive/Growth)
};

export const lightTheme = {
    mode: 'light',
    colors: {
        primary: PALETTE.primary,
        primaryDark: PALETTE.primaryDark,
        primaryLight: PALETTE.primaryLight,
        secondary: PALETTE.secondary,
        secondaryDark: PALETTE.secondaryDark,
        secondaryLight: PALETTE.secondaryLight,
        accent: PALETTE.accent,
        background: '#F8F9FA',
        surface: '#FFFFFF',
        text: '#212121',
        textSecondary: '#757575',
        textLight: '#FFFFFF',
        border: '#E0E0E0',
        divider: '#BDBDBD',
        error: PALETTE.error,
        warning: PALETTE.warning,
        info: PALETTE.info,
        success: PALETTE.success,
        tabBar: '#FFFFFF',
        gray300: PALETTE.gray300,
        gray500: PALETTE.gray500,
        white: PALETTE.white,
    }
};

export const darkTheme = {
    mode: 'dark',
    colors: {
        primary: PALETTE.primary,
        primaryDark: PALETTE.primaryDark,
        primaryLight: PALETTE.primaryLight,
        secondary: PALETTE.secondary,
        secondaryDark: PALETTE.secondaryDark,
        secondaryLight: PALETTE.secondaryLight,
        accent: PALETTE.accent,
        background: '#121212',
        surface: '#1E1E1E',
        text: '#E0E0E0',
        textSecondary: '#B0B0B0',
        textLight: '#121212',
        border: '#333333',
        divider: '#424242',
        error: '#EF5350', // Keep desaturated red for dark mode
        warning: '#FFA726', // Keep desaturated orange for dark mode
        info: '#42A5F5',    // Keep light blue for dark mode
        success: '#66BB6A', // Keep lighter green for dark mode
        tabBar: '#1E1E1E',
        gray300: '#555555',
        gray500: '#888888',
        white: '#FFFFFF',
    }
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
};
