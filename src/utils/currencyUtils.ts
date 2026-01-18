/**
 * Maps currency codes to their respective symbols.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
};

/**
 * Formats a numeric amount into a currency string with the correct symbol and comma separators.
 * @param amount The numeric amount to format.
 * @param currencyCode The currency code (e.g., 'USD', 'PHP').
 * @returns The formatted currency string (e.g., "₱1,234.56").
 */
export const formatCurrencyAmount = (amount: number, currencyCode: string = 'USD'): string => {
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    // Format options: 2 decimal places, adds commas
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    return `${symbol}${formattedNumber}`;
};

/**
 * Formats a numeric amount into a compact currency string (e.g., 80K, 1.2M).
 * Useful for charts where space is limited.
 * @param amount The numeric amount to format.
 * @param currencyCode The currency code (e.g., 'USD', 'PHP').
 * @returns The formatted compact string (e.g., "₱80K").
 */
export const formatCompactCurrency = (amount: number, currencyCode: string = 'USD'): string => {
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    });

    return `${symbol}${formatter.format(amount)}`;
};

/**
 * Formats a numeric amount into a compact number string without currency symbol (e.g., 80K, 1.2M).
 * Useful for chart Y-axis labels where the currency symbol is added separately.
 * @param amount The numeric amount to format.
 * @returns The formatted compact number string (e.g., "80K", "1.2M").
 */
export const formatCompactNumber = (amount: number): string => {
    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
    });

    return formatter.format(amount);
};

