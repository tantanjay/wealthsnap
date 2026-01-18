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
