
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

// Single source of truth for the "clean number" magnitude tiers - roundToCleanAmount,
// roundDownToCleanAmount, and getScenarioStep all derive from this instead of each
// hand-copying the same thresholds (which drifted out of sync with each other before).
const SCALE_TIERS: readonly { threshold: number; unit: number }[] = [
    { threshold: 50000, unit: 5000 },
    { threshold: 10000, unit: 1000 },
    { threshold: 1000, unit: 500 },
];
const DEFAULT_UNIT = 100;

const getCleanUnit = (amount: number): number =>
    SCALE_TIERS.find(tier => amount > tier.threshold)?.unit ?? DEFAULT_UNIT;

// Clean-number rounding, scaled to the amount's own magnitude - shared by every path that
// produces a scenario default, not just the income-based one, so a raw derived value
// (e.g. a historical average) never bypasses this and shows up with cents attached.
const roundToCleanAmount = (amount: number): number => {
    const unit = getCleanUnit(amount);
    return Math.round(amount / unit) * unit;
};

// Same tiers as roundToCleanAmount but always rounds DOWN - for when a suggestion must never
// exceed a hard cap (e.g. available surplus), where rounding to the nearest clean number could
// round back up past it.
const roundDownToCleanAmount = (amount: number): number => {
    const unit = getCleanUnit(amount);
    return Math.floor(amount / unit) * unit;
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
 * magnitude so it stays a "clean" round number at whatever scale it's currently at - shares
 * SCALE_TIERS with getSmartScenarioAmount's own rounding rather than assuming one currency's scale.
 */
export const getScenarioStep = (amount: number): number => getCleanUnit(amount);
