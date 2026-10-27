import { Ionicons } from '@expo/vector-icons';

import type { DsColors } from '@styles/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

// Green/red mean good/bad, not up/down (docs/DESIGN.md principle 4).
export type Tone = 'good' | 'bad' | 'warning' | 'neutral';

export type Domain = 'cash' | 'invest' | 'loans' | 'goals';

export const toneColor = (ds: DsColors, tone: Tone): string => {
    switch (tone) {
        case 'good': return ds.success;
        case 'bad': return ds.danger;
        case 'warning': return ds.warning;
        default: return ds.text2;
    }
};

export const domainColor = (ds: DsColors, domain: Domain): string => {
    switch (domain) {
        case 'cash': return ds.domainCash;
        case 'invest': return ds.domainInvest;
        case 'loans': return ds.domainLoans;
        case 'goals': return ds.domainGoals;
    }
};
