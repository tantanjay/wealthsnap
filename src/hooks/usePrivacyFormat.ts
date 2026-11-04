import { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';

import { PrivacyMode, usePrivacy } from '@context/PrivacyContext';
import { getCurrencyInfo } from '@utils/currencyData';

// U+2212, never a hyphen (docs/DESIGN.md §4).
export const MINUS = '−';
export const DASH = '—';
const MASK = '****';

export interface MoneyOptions {
    // Prefix "+" on positive values too.
    signed?: boolean;
    // ₱1.2M / ₱21k; secondary lines only.
    compact?: boolean;
}

const groupDigits = (value: number, locale: string, maxFractionDigits: number): string => {
    const options: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits };
    try {
        return new Intl.NumberFormat(locale, options).format(value);
    } catch {
        return new Intl.NumberFormat('en-US', options).format(value);
    }
};

// Descending, so the first unit that fits is the largest. Hand-rolled: Intl compact notation isn't reliable on Hermes.
const COMPACT_UNITS: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];

const compactDigits = (value: number, locale: string): string => {
    const start = COMPACT_UNITS.findIndex(([size]) => value >= size);
    if (start === -1) return groupDigits(Math.round(value), locale, 0);
    // 999,960 rounds to 1000k, so step up to 1M.
    let index = start;
    if (index > 0 && Math.round((value / COMPACT_UNITS[index][0]) * 10) / 10 >= 1000) index--;
    const [size, suffix] = COMPACT_UNITS[index];
    return `${groupDigits(Math.round((value / size) * 10) / 10, locale, 1)}${suffix}`;
};

const signOf = (amount: BigNumber, signed: boolean): string => {
    if (amount.isNegative() && !amount.isZero()) return MINUS;
    return signed && amount.gt(0) ? '+' : '';
};

// Open-mode currency text: symbol + grouped whole units, true minus.
export const formatMoney = (amount: BigNumber | number, currency: string, { signed = false, compact = false }: MoneyOptions = {}): string => {
    const bn = new BigNumber(amount);
    const { symbol, locale } = getCurrencyInfo(currency);
    const abs = bn.abs().toNumber();
    // An amount that rounds to zero carries no sign ("₱0", never "−₱0").
    const shownZero = abs < 0.5;
    const digits = compact ? compactDigits(abs, locale) : groupDigits(abs, locale, 0);
    return `${shownZero ? '' : signOf(bn, signed)}${symbol}${digits}`;
};

// Percent with an optional sign; null renders as "—".
export const formatPercent = (value: number | null, { signed = false, decimals = 0 }: { signed?: boolean; decimals?: number } = {}): string => {
    if (value === null || !isFinite(value)) return DASH;
    const rounded = Number(value.toFixed(decimals));
    const sign = rounded < 0 ? MINUS : signed && rounded > 0 ? '+' : '';
    return `${sign}${Math.abs(rounded).toFixed(decimals)}%`;
};

// Percentage-point change, e.g. "+2 pts".
export const formatPoints = (value: number): string => {
    const rounded = Math.round(value);
    const sign = rounded < 0 ? MINUS : rounded > 0 ? '+' : '';
    return `${sign}${Math.abs(rounded)} pts`;
};

export interface PrivacyFormat {
    mode: PrivacyMode;
    isOpen: boolean;
    isDiscreet: boolean;
    isHidden: boolean;
    // Open: formatted amount. Hidden (and Discreet, if a caller forgets to swap it): **** keeping a leading sign.
    money: (amount: BigNumber | number, options?: MoneyOptions) => string;
    // A single transaction's own amount: shown in Open and Discreet, **** only in Hidden.
    recordMoney: (amount: BigNumber | number, options?: MoneyOptions) => string;
    // Discreet swaps in the metric's scale-free alternative; Open and Hidden keep the amount-based text.
    show: <T>(amountText: T, discreetAlternative: T) => T;
}

// The one privacy rendering helper (docs/DESIGN.md §5). Every amount in the new UI goes through it.
export const usePrivacyFormat = (currency: string): PrivacyFormat => {
    const { mode } = usePrivacy();
    const isOpen = mode === 'open';
    const isDiscreet = mode === 'discreet';

    const money = useCallback((amount: BigNumber | number, options: MoneyOptions = {}) => {
        if (isOpen) return formatMoney(amount, currency, options);
        return `${signOf(new BigNumber(amount), !!options.signed)}${MASK}`;
    }, [isOpen, currency]);

    const recordMoney = useCallback((amount: BigNumber | number, options: MoneyOptions = {}) => {
        if (mode !== 'hidden') return formatMoney(amount, currency, options);
        return `${signOf(new BigNumber(amount), !!options.signed)}${MASK}`;
    }, [mode, currency]);

    const show = useCallback(<T,>(amountText: T, discreetAlternative: T): T => (isDiscreet ? discreetAlternative : amountText), [isDiscreet]);

    return useMemo(() => ({
        mode,
        isOpen,
        isDiscreet,
        isHidden: mode === 'hidden',
        money,
        recordMoney,
        show,
    }), [mode, isOpen, isDiscreet, money, recordMoney, show]);
};
