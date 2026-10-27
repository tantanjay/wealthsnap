import type { TextStyle, ViewStyle } from 'react-native';

export const PALETTE = {
    primary: '#1976D2',      // Financial Blue 700
    primaryDark: '#0D47A1',  // Blue 900
    primaryLight: '#42A5F5', // Blue 400
    secondary: '#FFA000',    // Amber 700 (Complementary, Wealth/Gold)
    secondaryDark: '#FF6F00',// Amber 900
    secondaryLight: '#FFCA28',// Amber 200
    accent: '#00BFA5',       // Teal A700 - decorative/interactive only; positive values use `success`, not this
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


// Refined Minimal tokens (docs/DESIGN.md §2). Namespaced under `ds` so they don't collide with the legacy `colors` keys.
const lightDs = {
    bg: '#FFFFFF',
    inset: '#F4F5F7',
    raised: '#FFFFFF',
    hairline: '#ECEDF0',
    sheet: '#FFFFFF',
    text: '#121417',
    text2: '#6B7280',
    text3: '#8A919C',
    accent: '#1976D2',
    accentSoft: 'rgba(25, 118, 210, 0.10)',
    onAccent: '#FFFFFF',
    success: '#2E7D32',
    danger: '#D32F2F',
    warning: '#E65100',
    domainCash: '#6E8CB5',
    domainInvest: '#8E7CC3',
    domainLoans: '#B0896B',
    domainGoals: '#3AA39A',
    scrim: 'rgba(0, 0, 0, 0.40)',
};

export type DsColors = typeof lightDs;

const darkDs: DsColors = {
    bg: '#0E1013',
    inset: '#1A1D22',
    raised: '#2A2E35',
    hairline: '#262A30',
    sheet: '#16191D',
    text: '#ECEEF1',
    text2: '#9AA1AB',
    text3: '#7A818C',
    accent: '#4A90E2',
    accentSoft: 'rgba(74, 144, 226, 0.16)',
    onAccent: '#FFFFFF',
    success: '#66BB6A',
    danger: '#EF5350',
    warning: '#FFA726',
    domainCash: '#8FA9CC',
    domainInvest: '#A89AD6',
    domainLoans: '#C4A288',
    domainGoals: '#5CBDB3',
    scrim: 'rgba(0, 0, 0, 0.60)',
};

// Shadows for floating layers only (sheets, Record FAB); mirrors the prototype's --float-shadow / --fab-shadow.
export type DsElevation = { sheet: ViewStyle; fab: ViewStyle };

const lightElevation: DsElevation = {
    sheet: { shadowColor: '#000000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
    fab: { shadowColor: lightDs.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 6, elevation: 6 },
};

const darkElevation: DsElevation = {
    sheet: { shadowColor: '#000000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.40, shadowRadius: 12, elevation: 8 },
    fab: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.50, shadowRadius: 6, elevation: 6 },
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
    },
    ds: lightDs,
    elevation: lightElevation,
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
    },
    ds: darkDs,
    elevation: darkElevation,
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

// Refined Minimal type scale (docs/DESIGN.md §2). Weight comes from the Inter family name;
// fontWeight is left unset because Android synthesizes bold on custom fonts when both are given.
export const fontFamily = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
};

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

const display: TextStyle = { fontFamily: fontFamily.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.64, ...tabular };
const title: TextStyle = { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 };
const body: TextStyle = { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 };
const small: TextStyle = { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 };
const caption: TextStyle = { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 14 };

export const type = {
    display,
    title,
    titleNum: { ...title, ...tabular },
    body,
    bodyNum: { ...body, ...tabular },
    // Buttons
    bodyStrong: { ...body, fontFamily: fontFamily.semibold },
    small,
    smallNum: { ...small, ...tabular },
    // Links, tabs, segmented options, chips
    smallMedium: { ...small, fontFamily: fontFamily.medium },
    smallMediumNum: { ...small, fontFamily: fontFamily.medium, ...tabular },
    // Section headers
    smallStrong: { ...small, fontFamily: fontFamily.semibold },
    caption,
    captionNum: { ...caption, ...tabular },
    // Tab bar labels, privacy chip
    captionMedium: { ...caption, fontFamily: fontFamily.medium },
    // The one exception to the scale: the Record amount input
    recordAmount: { fontFamily: fontFamily.semibold, fontSize: 44, lineHeight: 52, letterSpacing: -0.88, ...tabular },
} satisfies Record<string, TextStyle>;

// Spacing scale, indexed like the prototype's --s1..--s7 (space[4] === 16).
export const space = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
} as const;

export const radius = {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
} as const;
