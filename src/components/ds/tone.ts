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

// Icon-tile fill for domain rows: the domain color softened over `group`.
export const domainSoftColor = (ds: DsColors, domain: Domain): string => {
    switch (domain) {
        case 'cash': return ds.domainCashSoft;
        case 'invest': return ds.domainInvestSoft;
        case 'loans': return ds.domainLoansSoft;
        case 'goals': return ds.domainGoalsSoft;
    }
};

// Tile icon for a domain row that doesn't pass its own `icon`.
export const DOMAIN_ICONS: Record<Domain, IconName> = {
    cash: 'wallet-outline',
    invest: 'trending-up-outline',
    loans: 'card-outline',
    goals: 'flag-outline',
};
