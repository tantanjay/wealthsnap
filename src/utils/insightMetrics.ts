import { BigNumber } from 'bignumber.js';

/**
 * Calculates the liquidity date based on the number of runway months.
 * Adds the runway months to the current date.
 * @param runwayMonths Number of months of runway
 * @returns Formatted string "Month Year" (e.g., "October 2026")
 */
export const calculateLiquidityDate = (runwayMonths: number): string => {
    if (!IsFinite(runwayMonths)) return 'Forever';
    if (runwayMonths <= 0) return 'Today';

    const today = new Date();
    // Add months to current date
    const futureDate = new Date(today);
    // Handle fractional months by adding days approx
    const wholeMonths = Math.floor(runwayMonths);
    const fractionalMonth = runwayMonths - wholeMonths;

    futureDate.setMonth(today.getMonth() + wholeMonths);
    futureDate.setDate(today.getDate() + Math.floor(fractionalMonth * 30));

    return futureDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
};

/**
 * Calculates the spending trend percentage and direction provided a baseline.
 * @param currentSpending Current spending amount (e.g. 90-day avg or current month projected)
 * @param baselineSpending Baseline spending amount (e.g. 3-month avg or budget)
 * @returns Object with percentage difference and narrative
 */
export const calculateSpendingTrend = (currentSpending: BigNumber, baselineSpending: BigNumber) => {
    if (baselineSpending.isEqualTo(0)) return { percent: 0, direction: 'flat', narrative: 'No baseline data' };

    const diff = currentSpending.minus(baselineSpending);
    const percent = diff.dividedBy(baselineSpending).times(100).toNumber();

    return {
        percent: Math.abs(percent),
        direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
        narrative: percent > 0 ? `${percent.toFixed(0)}% above baseline` : `${Math.abs(percent).toFixed(0)}% below baseline`
    };
};

/**
 * Calculates the "Debt Drag": How many months of runway are lost purely due to debt payments?
 * Debt Drag = Runway(Without Debt Payments) - Runway(With Debt Payments)
 * @param totalCash Liquid cash available
 * @param livingExpenses Monthly expenses excluding debt
 * @param debtPayments Monthly debt obligations
 * @returns Months of runway lost
 */
export const calculateDebtDrag = (totalCash: BigNumber, livingExpenses: BigNumber, debtPayments: BigNumber): number => {
    if (totalCash.lte(0)) return 0;

    const burnWithDebt = livingExpenses.plus(debtPayments);
    const burnWithoutDebt = livingExpenses;

    const runwayWithDebt = burnWithDebt.gt(0) ? totalCash.dividedBy(burnWithDebt).toNumber() : 999;
    const runwayWithoutDebt = burnWithoutDebt.gt(0) ? totalCash.dividedBy(burnWithoutDebt).toNumber() : 999;

    // specific check for IsFinite replacement since uppercase IsFinite was a typo in previous function too
    if (!Number.isFinite(runwayWithDebt) || !Number.isFinite(runwayWithoutDebt)) return 0;

    return Math.max(0, runwayWithoutDebt - runwayWithDebt);
};

/**
 * Calculates "Investment Boost": How many MONTHS of runway do your investments add?
 * Investment Boost = Investment Value / Monthly Burn Rate
 * @param investmentValue Total value of liquid investments
 * @param burnRate Monthly burn rate (expenses + debt)
 * @returns Months added
 */
export const calculateInvestmentBoost = (investmentValue: BigNumber, burnRate: BigNumber): number => {
    if (burnRate.lte(0)) return 0;
    return investmentValue.dividedBy(burnRate).toNumber();
};

/**
 * Calculates "Impact on Freedom": Net Flow converted to months of freedom per year.
 * How many months of living expenses are you saving (or losing) every year?
 * Formula: (Net Flow * 12) / Monthly Expenses
 * @param netFlow Monthly Net Flow (Income - Expense)
 * @param monthlyExpenses Monthly Expenses (Baseline)
 * @returns Months per year (positive or negative)
 */
export const calculateFreedomImpact = (netFlow: BigNumber, monthlyExpenses: BigNumber): number => {
    if (monthlyExpenses.lte(0)) return 0;
    const annualSurplus = netFlow.times(12);
    return annualSurplus.dividedBy(monthlyExpenses).toNumber();
};

/**
 * Calculates "Debt Freedom Delay": How many years is debt delaying financial freedom?
 * Assumes you could have invested the debt liability instead.
 * Formula simplified: Time to save Debt Liability amount given current Annual Savings
 * Delay = Total Debt Liability / Annual Savings
 * @param totalDebtLiability Total payoff amount (Principal + Interest)
 * @param annualSavings Current annual savings (Net Flow * 12)
 * @returns Years delayed
 */
export const calculateDebtFreedomDelay = (totalDebtLiability: BigNumber, annualSavings: BigNumber): number => {
    if (annualSavings.lte(0)) return 99; // If not saving, delay is infinite/undefined
    return totalDebtLiability.dividedBy(annualSavings).toNumber();
};

/**
 * Calculates "Freedom Acceleration": How much earlier freedom comes if you invest extra $X/month.
 * Simplified "Rule of 72" or compound interest delta to see how much faster you hit a target number.
 * For this UI, we might use a simpler proxy: "Added Runway per Year"
 * Or: "Time to hit $1M" delta?
 * 
 * Let's use the UI request: "Investments add +0.7 months of runway" (This is Investment Boost, already done)
 * "Freedom arrives 2.1 years earlier" (Scenarios)
 * 
 * Scenario Calculation:
 * 1. Calculate time to reach Target (e.g. 25x Expenses) with Current Savings.
 * 2. Calculate time to reach Target with Current Savings + Extra Amount.
 * 3. Difference is "Years Earlier".
 * 
 * @param currentNetWorth Current liquid Net Worth
 * @param monthlySavings Current monthly saving rate
 * @param monthlyExpenses Monthly expenses (to determine Target FI Number = 300 * Expenses)
 * @param extraInvestment Amount to add to monthly savings
 * @param returnRate Annual return rate (e.g. 0.07)
 * @returns Years saved
 */
export const calculateFreedomAcceleration = (
    currentNetWorth: BigNumber,
    monthlySavings: BigNumber,
    monthlyExpenses: BigNumber,
    extraInvestment: BigNumber,
    returnRate: number = 0.07
): number => {
    if (monthlyExpenses.lte(0)) return 0;

    const fiNumber = monthlyExpenses.times(300); // 25x Annual rule (25 * 12 = 300)

    // If already at FI number, no acceleration
    if (currentNetWorth.gte(fiNumber)) return 0;

    const calcYearsToGoal = (p: number, pmt: number, r: number, target: number): number => {
        // Future Value of Annuity formula solved for n (number of periods)
        // This is complex to solve analytically with existing principal.
        // FV = P*(1+r)^n + PMT * (((1+r)^n - 1) / r)
        // ... iterative approach or log formula might be better. 
        // Nper function in Excel.

        if (pmt <= 0) return 99; // Never reach if not saving

        let n = 0;
        let current = p;
        const monthlyRate = r / 12;

        // Iterative approx (limit 1200 months = 100 years)
        while (current < target && n < 1200) {
            current = current * (1 + monthlyRate) + pmt;
            n++;
        }
        return n / 12;
    };

    const p = currentNetWorth.toNumber();
    const r = returnRate;
    const target = fiNumber.toNumber();

    const yearsCurrent = calcYearsToGoal(p, monthlySavings.toNumber(), r, target);
    const yearsAccelerated = calcYearsToGoal(p, monthlySavings.plus(extraInvestment).toNumber(), r, target);

    return Math.max(0, yearsCurrent - yearsAccelerated);
};

// Helper for IsFinite check
const IsFinite = (num: number) => Number.isFinite(num) && Math.abs(num) !== Infinity;
