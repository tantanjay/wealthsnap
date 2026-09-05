
import { BigNumber } from 'bignumber.js';

// Minimums per currency, so a scenario default never suggests an amount too small to feel
// meaningful in that currency's typical scale.
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

// Clean-number rounding, scaled to the amount's own magnitude - shared by every path that
// produces a scenario default, not just the income-based one, so a raw derived value
// (e.g. a historical average) never bypasses this and shows up with cents attached.
const roundToCleanAmount = (amount: number): number => {
    if (amount > 50000) return Math.round(amount / 5000) * 5000;
    if (amount > 10000) return Math.round(amount / 1000) * 1000;
    if (amount > 1000) return Math.round(amount / 500) * 500; // e.g., 3400 -> 3500
    return Math.round(amount / 100) * 100;
};

// Same tiers as roundToCleanAmount but always rounds DOWN - for when a suggestion must never
// exceed a hard cap (e.g. available surplus), where rounding to the nearest clean number could
// round back up past it.
const roundDownToCleanAmount = (amount: number): number => {
    if (amount > 50000) return Math.floor(amount / 5000) * 5000;
    if (amount > 10000) return Math.floor(amount / 1000) * 1000;
    if (amount > 1000) return Math.floor(amount / 500) * 500;
    return Math.floor(amount / 100) * 100;
};

/**
 * Applies the currency floor then clean-number rounding to any raw scenario amount -
 * use this whenever a scenario default is derived from something other than income
 * (e.g. a user's historical average investment) so it still comes out as a round number.
 * @param rawAmount Unrounded candidate amount
 * @param currency ISO Currency Code (e.g. 'PHP', 'USD')
 */
export const applyCurrencyFloorAndRound = (rawAmount: number, currency: string = 'PHP'): number => {
    const minAmount = currencyFloors[currency.toUpperCase()] || 100;
    return roundToCleanAmount(Math.max(rawAmount, minAmount));
};

/**
 * Calculates a "Smart Scenario Amount" based on the user's currency and monthly income.
 * Default target is 10% of monthly income, floored and rounded via applyCurrencyFloorAndRound.
 * Deliberately NOT based on how much the user already invests - suggesting their full
 * investment amount as "extra toward debt" would read as "stop investing, pay debt instead",
 * which isn't this stepper's call to make. It's a modest, capped starting point the user can
 * dial up themselves.
 * @param monthlyIncome User's monthly income
 * @param currency ISO Currency Code (e.g. 'PHP', 'USD')
 * @param capAmount Optional hard cap (e.g. investable surplus) - the suggestion should never
 * exceed what the user could actually spare, even if 10% of income would.
 * @returns Optimized scenario amount
 */
export const getSmartScenarioAmount = (monthlyIncome: BigNumber, currency: string = 'PHP', capAmount?: BigNumber): number => {
    const target = applyCurrencyFloorAndRound(monthlyIncome.times(0.1).toNumber(), currency);
    if (capAmount === undefined) return target;

    const cap = BigNumber.maximum(capAmount, 0).toNumber();
    return target <= cap ? target : roundDownToCleanAmount(cap);
};

/**
 * Step size for a +/- stepper adjusting a scenario amount, scaled to the amount's own
 * magnitude so it stays a "clean" round number at whatever scale it's currently at -
 * mirrors getSmartScenarioAmount's own rounding tiers rather than assuming one currency's scale.
 */
export const getScenarioStep = (amount: number): number => {
    if (amount > 50000) return 5000;
    if (amount > 10000) return 1000;
    if (amount > 1000) return 500;
    return 100;
};
