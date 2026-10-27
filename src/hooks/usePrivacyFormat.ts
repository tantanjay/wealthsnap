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

const groupDigits = (value: number, locale: string, maxFractionDigits: number, compact: boolean): string => {
    const options: Intl.NumberFormatOptions = compact
        ? { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: maxFractionDigits }
        : { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits };
    let text: string;
    try {
        text = new Intl.NumberFormat(locale, options).format(value);
    } catch {
        text = new Intl.NumberFormat('en-US', options).format(value);
    }
    return compact ? text.replace('K', 'k') : text;
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
    return `${signOf(bn, signed)}${symbol}${groupDigits(abs, locale, compact ? 1 : 0, compact)}`;
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

    const show = useCallback(<T,>(amountText: T, discreetAlternative: T): T => (isDiscreet ? discreetAlternative : amountText), [isDiscreet]);

    return useMemo(() => ({
        mode,
        isOpen,
        isDiscreet,
        isHidden: mode === 'hidden',
        money,
        show,
    }), [mode, isOpen, isDiscreet, money, show]);
};
