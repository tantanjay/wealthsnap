import { BigNumber } from 'bignumber.js';
import { getCurrencyInfo } from './currencyData';

/**
 * Maps currency codes to their respective symbols.
 * Deprecated: Use getCurrencyInfo instead.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
};

/**
 * Formats a high-precision amount into a currency string.
 */
export const formatCurrencyAmount = (
    amount: BigNumber | string | number,
    currencyCode: string = 'PHP'
): string => {
    const { symbol, locale } = getCurrencyInfo(currencyCode);

    // Ensure we are working with a BigNumber instance
    const bn = new BigNumber(amount);

    try {
        const formattedNumber = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(bn.toNumber()); // Convert to number for the Intl formatter

        return `${symbol}${formattedNumber}`;
    } catch {
        // Fallback to en-US if locale is invalid
        const formattedNumber = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(bn.toNumber());

        return `${symbol}${formattedNumber}`;
    }
};

/**
 * Formats a high-precision amount into a compact currency string (e.g., 80K, 1.2M).
 */
export const formatCompactCurrency = (
    amount: BigNumber | string | number,
    currencyCode: string = 'PHP',
    decimalPlaces: number = 2 // Default to 2, or 0 for whole numbers
): string => {
    const { symbol, locale } = getCurrencyInfo(currencyCode);

    // Convert to BigNumber and apply rounding
    // ROUND_HALF_UP is the standard "round to nearest"
    const bn = new BigNumber(amount).decimalPlaces(decimalPlaces, BigNumber.ROUND_HALF_UP);

    try {
        const formatter = new Intl.NumberFormat(locale, {
            notation: 'compact',
            compactDisplay: 'short',
            // We sync the Intl formatter with your decimalPlaces argument
            minimumFractionDigits: 0,
            maximumFractionDigits: decimalPlaces
        });
        return `${symbol}${formatter.format(bn.toNumber())}`;
    } catch {
        const formatter = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            // We sync the Intl formatter with your decimalPlaces argument
            minimumFractionDigits: 0,
            maximumFractionDigits: decimalPlaces
        });
        return `${symbol}${formatter.format(bn.toNumber())}`;
    }
};

/**
 * Formats a high-precision amount into a compact number string without currency symbol.
 */
export const formatCompactNumber = (amount: BigNumber | string | number): string => {
    const bn = new BigNumber(amount);

    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    });

    return formatter.format(bn.toNumber());
};