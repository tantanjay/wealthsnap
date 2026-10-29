import type { TextStyle, ViewStyle } from 'react-native';

// Layered + identity tokens (docs/DESIGN.md §2): the only colors components use, so a theme swaps them here.
const lightDs = {
    // Page plane; sections sit on it in `group` surfaces. `bg` is the legacy name for the same color.
    canvas: '#F3F4F6',
    bg: '#F3F4F6',
    group: '#FFFFFF',
    heroPanel: '#E8F1FB',
    inset: '#F4F5F7',
    raised: '#FFFFFF',
    // Segmented-control track: reads on both `canvas` and `group`.
    track: '#E8EAED',
    hairline: '#ECEDF0',
    // Floating dialog/popover surface; Sheet and BottomModal bodies use `canvas`.
    sheet: '#FFFFFF',
    text: '#121417',
    text2: '#6B7280',
    text3: '#8A919C',
    accent: '#1976D2',
    accentSoft: 'rgba(25, 118, 210, 0.10)',
    onAccent: '#FFFFFF',
    // Marks on success/danger fills (treemap tiles, swipe-delete); not skinned, like the semantic colors.
    onSemantic: '#FFFFFF',
    success: '#2E7D32',
    danger: '#D32F2F',
    warning: '#E65100',
    domainCash: '#6E8CB5',
    domainInvest: '#8E7CC3',
    domainLoans: '#B0896B',
    domainGoals: '#3AA39A',
    // Row icon tiles: domain color at 16% over `group`, precomputed; neutral is 6% black.
    domainCashSoft: '#E8EDF3',
    domainInvestSoft: '#EDEAF5',
    domainLoansSoft: '#F2ECE7',
    domainGoalsSoft: '#DFF0EF',
    tileNeutral: 'rgba(0, 0, 0, 0.06)',
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
    canvas: '#0B0D10',
    bg: '#0B0D10',
    group: '#16191D',
    heroPanel: '#16233A',
    inset: '#1F2328',
    raised: '#2A2E35',
    track: '#1F2328',
    hairline: '#262A30',
    sheet: '#16191D',
    text: '#ECEEF1',
    text2: '#9AA1AB',
    text3: '#7A818C',
    accent: '#4A90E2',
    accentSoft: 'rgba(74, 144, 226, 0.16)',
    onAccent: '#FFFFFF',
    onSemantic: '#FFFFFF',
    success: '#66BB6A',
    danger: '#EF5350',
    warning: '#FFA726',
    domainCash: '#8FA9CC',
    domainInvest: '#A89AD6',
    domainLoans: '#C4A288',
    domainGoals: '#5CBDB3',
    // 22% over `group`; neutral is 6% white.
    domainCashSoft: '#313944',
    domainInvestSoft: '#363546',
    domainLoansSoft: '#3C3735',
    domainGoalsSoft: '#253D3E',
    tileNeutral: 'rgba(255, 255, 255, 0.06)',
    scrim: 'rgba(0, 0, 0, 0.60)',
    qrSurface: '#FFFFFF',
    onMedia: '#FFFFFF',
    chart: ['#5FB0C6', '#E07F9E', '#AEBB62', '#C084C7', '#D6B45A', '#8EB08A', '#DE9A70', '#8B92A3'],
};

// Shadows for floating layers only (sheets, Record FAB); mirrors the prototype's --float-shadow / --fab-shadow.
export type DsElevation = { sheet: ViewStyle; fab: ViewStyle };

const elevationFor = (mode: 'light' | 'dark', ds: DsColors): DsElevation => mode === 'light'
    ? {
        sheet: { shadowColor: '#000000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
        fab: { shadowColor: ds.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 6, elevation: 6 },
    }
    : {
        sheet: { shadowColor: '#000000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.40, shadowRadius: 12, elevation: 8 },
        fab: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.50, shadowRadius: 6, elevation: 6 },
    };

// --- Skins (docs/DESIGN.md §2, Skins) ---

// The only roles a skin sets; everything else is derived from these or kept from Layered.
type SkinBase = Pick<DsColors, 'canvas' | 'group' | 'heroPanel' | 'text' | 'text2' | 'hairline' | 'accent' | 'onAccent'>;

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
// `from` moved `t` of the way toward `to`.
const mix = (from: string, to: string, t: number) => {
    const a = rgb(from), b = rgb(to);
    return toHex(a.map((v, i) => v + (b[i] - v) * t));
};
const alpha = (hex: string, a: number) => `rgba(${rgb(hex).join(', ')}, ${a.toFixed(2)})`;

// Ratios match how Layered's own derived roles sit against its base roles.
const deriveSkin = (mode: 'light' | 'dark', b: SkinBase): DsColors => {
    const layered = mode === 'light' ? lightDs : darkDs;
    const inset = mix(b.group, b.text, mode === 'light' ? 0.04 : 0.045);
    const soft = (domain: string) => mix(b.group, domain, mode === 'light' ? 0.16 : 0.22);
    return {
        ...layered,
        ...b,
        bg: b.canvas,
        inset,
        raised: mode === 'light' ? b.group : mix(b.group, b.text, 0.10),
        track: mode === 'light' ? mix(b.canvas, b.text, 0.05) : inset,
        sheet: b.group,
        text3: mix(b.text2, b.canvas, 0.22),
        accentSoft: alpha(b.accent, mode === 'light' ? 0.10 : 0.16),
        domainCashSoft: soft(layered.domainCash),
        domainInvestSoft: soft(layered.domainInvest),
        domainLoansSoft: soft(layered.domainLoans),
        domainGoalsSoft: soft(layered.domainGoals),
    };
};

// Order: canvas, group, heroPanel, text, text2, hairline, accent, onAccent.
const base = (v: string): SkinBase => {
    const [canvas, group, heroPanel, text, text2, hairline, accent, onAccent] = v.split(' ').map(h => `#${h}`);
    return { canvas, group, heroPanel, text, text2, hairline, accent, onAccent };
};

export type SkinId = 'layered' | 'warmPaper' | 'forest' | 'blush' | 'grape' | 'ink' | 'ocean' | 'slate' | 'sunset' | 'royal';

export interface Skin {
    name: string;
    description: string;
    light: DsColors;
    dark: DsColors;
}

const skin = (name: string, description: string, light: string, dark: string): Skin => ({
    name,
    description,
    light: deriveSkin('light', base(light)),
    dark: deriveSkin('dark', base(dark)),
});

export const SKINS: Record<SkinId, Skin> = {
    layered: { name: 'Layered', description: 'Cool gray, blue', light: lightDs, dark: darkDs },
    warmPaper: skin('Warm paper', 'Cream, terracotta',
        'F2ECE1 FBF8F2 EADFCB 2A241C 7A6E5E E6DDCD B5562B FFFFFF',
        '1A1612 241F19 33291F EFE6D8 A89A86 332B22 E08A5F 1A0F08'),
    forest: skin('Forest', 'Sage, brass',
        'ECF1EA FAFCF8 D9E6D4 1B2A1E 5E6F60 DFE7DB 8C6A1E FFFFFF',
        '0E1510 172019 1F2E22 E4EDE4 93A595 25302A D1A954 1A1405'),
    blush: skin('Blush', 'Rose, raspberry',
        'F6EDEE FFFAFA F1DADF 2B1C20 7D6267 EEDFE1 B23A5C FFFFFF',
        '171012 221719 35202A F3E6E9 AE9399 33242A E87C9B 2A0E17'),
    grape: skin('Grape', 'Lavender, violet',
        'F0EEF8 FDFCFF E2DCF4 221D33 6E6787 E5E1F0 6A4FC8 FFFFFF',
        '100E18 1A1724 271F40 ECE8F7 9D96B5 2A2638 A08CF0 150E30'),
    ink: skin('Ink', 'Monochrome',
        'F5F4F1 FFFFFF E9E7E2 111111 6E6C67 E7E5E0 1A1A1A FFFFFF',
        '0E0E0F 18181A 232326 F2F2F0 9A9A96 2A2A2D E8E6E1 111111'),
    ocean: skin('Ocean', 'Mist, aqua',
        'EAF3F3 FAFDFD D5EAEA 102526 5B7476 DCE9E9 0F8A82 FFFFFF',
        '0B1517 132226 163339 E6F1F1 8FA9AB 1F3337 3FB8AF 06201E'),
    slate: skin('Slate', 'Cool gray, indigo',
        'EEF0F4 FFFFFF E1E4F3 181B25 646A7C E3E6EC 4F5BD5 FFFFFF',
        '0F1117 181B24 20253D E8EAF2 9298AB 272B37 8E97F2 101330'),
    sunset: skin('Sunset', 'Peach, orange',
        'FBEFE6 FFFAF6 F8DEC8 2E1E12 85695A F0E1D4 C9640F FFFFFF',
        '18110C 231912 3A2616 F5E8DD B09A88 362719 F0A050 2A1505'),
    royal: skin('Royal', 'Ivory and navy; navy and gold',
        'F3F1EA FFFDF8 E3E6EE 141B2E 666C7C E6E3DA 1F3A6B FFFFFF',
        '0B1020 141B30 1E2A4A EAE8E0 9AA0B2 232C45 D4AF37 1A1405'),
};

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const DEFAULT_SKIN: SkinId = 'layered';

export interface Theme {
    mode: 'light' | 'dark';
    ds: DsColors;
    elevation: DsElevation;
}

export const resolveTheme = (skinId: SkinId, mode: 'light' | 'dark'): Theme => {
    const ds = SKINS[skinId][mode];
    return { mode, ds, elevation: elevationFor(mode, ds) };
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
    // Group surfaces and the hero panel
    group: 16,
    lg: 20,
    full: 9999,
} as const;

// Groups and the hero panel sit 14 from the screen edge; group content is padded 14 inside.
export const layout = {
    groupInset: 14,
    groupPadding: 14,
} as const;

// Accent fill under the hero sparkline, fading to 0 at the baseline.
export const SPARK_FILL_OPACITY = 0.14;
