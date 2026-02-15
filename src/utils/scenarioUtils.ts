
import { BigNumber } from 'bignumber.js';

/**
 * Calculates a "Smart Scenario Amount" based on the user's currency and monthly income.
 * Logic:
 * 1. Default fallback: 10% of monthly income.
 * 2. Currency Floors:
 *    - PHP: 1000
 *    - USD: 100
 *    - EUR: 100
 *    - GBP: 100
 *    - JPY: 10000
 *    - Default: 100
 * 3. Rounding:
 *    - If > 10000, round to nearest 1000
 *    - If > 1000, round to nearest 500
 *    - Else round to nearest 100
 * 
 * @param monthlyIncome User's monthly income
 * @param currency ISO Currency Code (e.g. 'PHP', 'USD')
 * @returns Optimized scenario amount
 */
export const getSmartScenarioAmount = (monthlyIncome: BigNumber, currency: string = 'PHP'): number => {
    // 1. Minimums per Currency
    const currencyFloors: Record<string, number> = {
        'PHP': 1000,
        'USD': 100,
        'EUR': 100,
        'GBP': 100,
        'JPY': 10000,
        'IDR': 100000,
        'VND': 100000,
        'KRW': 10000,
        'INR': 1000,
    };

    const minAmount = currencyFloors[currency.toUpperCase()] || 100;

    // 2. Target: 10% of Income
    let target = monthlyIncome.times(0.1).toNumber();

    // 3. Apply Floor
    if (target < minAmount) {
        target = minAmount;
    }

    // 4. Rounding Logic for clean numbers
    if (target > 50000) {
        return Math.round(target / 5000) * 5000;
    } else if (target > 10000) {
        return Math.round(target / 1000) * 1000;
    } else if (target > 1000) { // e.g., 3400 -> 3500
        return Math.round(target / 500) * 500;
    } else {
        return Math.round(target / 100) * 100;
    }
};
