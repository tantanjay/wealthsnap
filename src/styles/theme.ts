import type { TextStyle, ViewStyle } from 'react-native';

// Refined Minimal tokens (docs/DESIGN.md §2): the only colors components use, so a theme swaps them here.
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
    // White in every theme: a QR code needs dark on light to scan, and marks drawn over the camera feed.
    qrSurface: '#FFFFFF',
    onMedia: '#FFFFFF',
    // Categorical palette for pies and their legends only; slice i uses chart[i % length].
    chart: ['#3A8FA6', '#C25A7C', '#84923A', '#A05FA8', '#A8862A', '#5D7F5B', '#C27A4E', '#6B6F7A'],
};

export type DsColors = typeof lightDs;

// Dialog/notice severity -> semantic token; info stays neutral since accent means "tappable".
export const severityColor = (ds: DsColors, severity: 'error' | 'warning' | 'success' | 'info'): string => {
    switch (severity) {
        case 'error': return ds.danger;
        case 'warning': return ds.warning;
        case 'success': return ds.success;
        default: return ds.text2;
    }
};

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
    qrSurface: '#FFFFFF',
    onMedia: '#FFFFFF',
    chart: ['#5FB0C6', '#E07F9E', '#AEBB62', '#C084C7', '#D6B45A', '#8EB08A', '#DE9A70', '#8B92A3'],
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
    ds: lightDs,
    elevation: lightElevation,
};

export const darkTheme = {
    mode: 'dark',
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
