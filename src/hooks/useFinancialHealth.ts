import { useCallback, useMemo, useRef, useState } from 'react';
import { BigNumber } from 'bignumber.js';

import { Debt } from '@types';
import * as Storage from '@services/core/storageService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllSavingsGoals } from '@services/domain/savingsGoalService';
import { getLatestPrices } from '@services/domain/priceHistoryService';
import { getAnnualDividend } from '@services/domain/dividendHistoryService';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';
import {
    getCumulativeSpendingCurve,
    getCurrentMonthCumulative,
    getTransactionsByMonth,
    calculateTotals,
    getMonthlyTrends,
    calculateAverageIncome,
    calculateBalance,
    calculateRunwayTrend,
} from '@utils/financialMetrics';
import { calculateTotalDebtObligations, calculateCurrentDebtBalance, calculateDebtPayoffStrategy } from '@utils/debtMetrics';
import {
    calculateDebtDrag,
    calculateInvestmentBoost,
    calculateFreedomImpact,
    calculateDebtFreedomDelay,
    calculateFreedomAcceleration,
} from '@utils/insightMetrics';
import { getSmartScenarioAmount, getScenarioStep } from '@utils/scenarioUtils';

// Used when no holding has dividend data.
const DEFAULT_RETURN_RATE = 7.2;

export interface FinancialHealthData {
    runway: {
        // Infinity when nothing is being spent.
        months: number;
        change: number;
        hasPrevMonth: boolean;
        cash: BigNumber;
        monthlyBurn: BigNumber;
        debtObligations: BigNumber;
        // Runway if debt minimums were gone; feeds the Debt drag explanation.
        monthsWithoutDebt: number;
    };
    spending: {
        // Signed: below 0 = spending less than the 3-month average at this point of the month.
        paceDiffPercent: number;
        hasBaseline: boolean;
        netFlow: BigNumber;
        monthIncome: BigNumber;
        averageNetFlow: BigNumber;
        freedomImpactMonths: number;
        investableSurplus: BigNumber;
    };
    debt: {
        isDebtFree: boolean;
        count: number;
        monthlyPayments: BigNumber;
        interestCost: BigNumber;
        freedomDelayYears: number;
        totalLiability: BigNumber;
        dragMonths: number;
    };
    wealth: {
        hasInvestments: boolean;
        portfolioValue: BigNumber;
        boostMonths: number;
        // Dividend yield, or DEFAULT_RETURN_RATE when there's no dividend data.
        annualReturnPercent: number;
        isDefaultReturnRate: boolean;
        scenarioInvestAmount: number;
        scenarioYearsEarlier: number;
        currentYearsToFreedom: number;
        acceleratedYearsToFreedom: number;
        currentMonthlyInvest: number;
        extraMonthlyInvest: number;
    };
}

export interface DebtScenario {
    amount: number;
    // Discreet shows the stepper as a count of steps from zero instead of an amount.
    steps: number;
    monthsSaved: number;
    step: (delta: 1 | -1) => void;
}

type PayableDebt = Debt & { originalAmount?: BigNumber };

const stepsFromZero = (amount: number): number => {
    let total = 0;
    let steps = 0;
    while (total < amount) {
        total += getScenarioStep(total);
        steps++;
    }
    return steps;
};

// Financial Health numbers (Runway, Spending pace, Debt drag, Investment boost) as of today.
export const useFinancialHealth = () => {
    const [data, setData] = useState<FinancialHealthData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [payableDebts, setPayableDebts] = useState<PayableDebt[]>([]);
    const [payoffStrategy, setPayoffStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('AVALANCHE');
    const [scenarioAmount, setScenarioAmount] = useState(200);
    // Once the user taps the stepper, a reload keeps their amount instead of the smart default.
    const isScenarioManual = useRef(false);

    const load = useCallback(async () => {
        try {
            const [p, t, inv, debts, goals, savedStrategy] = await Promise.all([
                Storage.getUserProfile(),
                getCachedTransactions(),
                getCachedInvestments(),
                getAllDebts(),
                getAllSavingsGoals(),
                Storage.getDebtStrategy(),
            ]);
            if (savedStrategy === 'SNOWBALL' || savedStrategy === 'AVALANCHE') setPayoffStrategy(savedStrategy);

            const now = new Date();
            const currentMonthTransactions = getTransactionsByMonth(t, now);
            const { income: monthIncome } = calculateTotals(currentMonthTransactions);
            // Transfer-inclusive, so investing isn't counted twice against the Investment boost.
            const netFlow = calculateBalance(currentMonthTransactions);

            const trends = getMonthlyTrends(t, 3);
            const monthsCount = trends.incomeData.length;
            const totalNetFlow = trends.netCashFlowData.reduce((sum, v) => sum.plus(v), new BigNumber(0));
            const totalAvgIncome = trends.incomeData.reduce((sum, v) => sum.plus(v), new BigNumber(0));
            const averageNetFlow = monthsCount > 0 ? totalNetFlow.dividedBy(monthsCount) : netFlow;
            const averageMonthlyIncome = monthsCount > 0 ? totalAvgIncome.dividedBy(monthsCount) : monthIncome;

            const runwayTrend = calculateRunwayTrend(t, debts, goals, now);
            const totalCash = runwayTrend.cash;
            const { base: baseBurnRate, debtObligations, goalContributions, total: totalBurnRate } = runwayTrend.burnRate;
            const runwayMonths = runwayTrend.runway.isFinite() ? runwayTrend.runway.toNumber() : Infinity;

            // Goal contributions count as living costs so drag is measured against the real Runway above.
            const livingCosts = baseBurnRate.plus(goalContributions);
            const debtDrag = calculateDebtDrag(totalCash, livingCosts, debtObligations);
            const monthsWithoutDebt = livingCosts.gt(0) ? totalCash.dividedBy(livingCosts).toNumber() : 0;

            const uniqueSymbols = [...new Set(inv.map(i => i.symbol))];
            const prices = await getLatestPrices(uniqueSymbols);
            const priceMap: Record<string, BigNumber> = {};
            Object.keys(prices).forEach(s => { priceMap[s] = prices[s].price; });
            inv.forEach(i => { if (!priceMap[i.symbol]) priceMap[i.symbol] = i.price; });

            const portfolioMetrics = getAllPortfolioMetrics(inv, priceMap);
            const totalPortfolioValue = portfolioMetrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));
            const investmentBoost = calculateInvestmentBoost(totalPortfolioValue, totalBurnRate);

            const currentPacing = getCurrentMonthCumulative(currentMonthTransactions);
            const avgPacing = getCumulativeSpendingCurve(t, 3);
            let paceDiff = 0;
            let hasBaseline = false;
            if (currentPacing.length > 0 && avgPacing.length > 0) {
                const cur = currentPacing[currentPacing.length - 1];
                const avg = avgPacing[Math.min(currentPacing.length - 1, avgPacing.length - 1)];
                if (avg > 0) {
                    paceDiff = ((cur - avg) / avg) * 100;
                    hasBaseline = true;
                }
            }

            const freedomImpact = calculateFreedomImpact(averageNetFlow, totalBurnRate);

            // 6 prior full months' income − today's Burn Rate, so a partial month can't inflate the surplus.
            const investableSurplus = calculateAverageIncome(t, 6).minus(totalBurnRate);
            const netFlowCap = BigNumber.maximum(0, investableSurplus);

            // Only buys with a matching transaction count as cash actually diverted to investing.
            const validInvestmentIds = new Set(t.filter(tx => tx.investmentId).map(tx => tx.investmentId));
            const verifiedBuys = inv.filter(i => i.action === 'BUY' && validInvestmentIds.has(i.id));
            let currentMonthlyInvest = new BigNumber(0);
            if (verifiedBuys.length > 0) {
                const firstBuyDate = new Date(Math.min(...verifiedBuys.map(b => new Date(b.date).getTime())));
                const monthsActive = Math.max(1, (now.getFullYear() - firstBuyDate.getFullYear()) * 12 + (now.getMonth() - firstBuyDate.getMonth()));
                const totalInvested = verifiedBuys.reduce((sum, b) => sum.plus(b.quantity.times(b.price)), new BigNumber(0));
                currentMonthlyInvest = totalInvested.dividedBy(monthsActive);
            }

            // A modest, capped starting suggestion, deliberately not based on how much the user already invests.
            const smartScenarioAmount = getSmartScenarioAmount(averageMonthlyIncome, p?.currency || 'PHP', netFlowCap);
            const potentialMonthlyInvest = BigNumber.maximum(currentMonthlyInvest, netFlowCap);
            const extraMonthlyInvest = potentialMonthlyInvest.minus(currentMonthlyInvest);

            // Only debts you owe; money owed to you isn't a liability.
            const activeDebts = debts.filter(d => d.status === 'ACTIVE' && (d.direction || 'PAYABLE') === 'PAYABLE');
            let interestCost = new BigNumber(0);
            let totalLiability = new BigNumber(0);
            // initialAmount patched to the current balance (original kept for FLAT interest), as the payoff simulation expects.
            const payable: PayableDebt[] = [];
            activeDebts.forEach(d => {
                const currentBalance = calculateCurrentDebtBalance(d, t);
                const rate = d.interestRate.dividedBy(100).dividedBy(12);
                interestCost = interestCost.plus((d.interestType === 'FLAT' ? d.initialAmount : currentBalance).times(rate));
                totalLiability = totalLiability.plus(currentBalance);
                payable.push({ ...d, initialAmount: currentBalance, originalAmount: d.initialAmount });
            });
            const annualSavings = investableSurplus.gt(0) ? investableSurplus.times(12) : new BigNumber(0);

            let annualDividendIncome = new BigNumber(0);
            for (const metric of portfolioMetrics) {
                if (metric.currentQuantity.gt(0)) {
                    const perShare = await getAnnualDividend(metric.symbol);
                    if (perShare > 0) annualDividendIncome = annualDividendIncome.plus(metric.currentQuantity.times(perShare));
                }
            }
            const dividendYield = totalPortfolioValue.gt(0) ? annualDividendIncome.dividedBy(totalPortfolioValue).times(100).toNumber() : 0;
            const isDefaultReturnRate = dividendYield === 0;
            const annualReturnPercent = isDefaultReturnRate ? DEFAULT_RETURN_RATE : dividendYield;

            // Self-sustain assumes you're debt-free by then, so debt minimums leave the long-term costs.
            const freedomBurnRate = BigNumber.maximum(0, totalBurnRate.minus(debtObligations));
            const freedom = calculateFreedomAcceleration(totalPortfolioValue, currentMonthlyInvest, freedomBurnRate, extraMonthlyInvest, annualReturnPercent / 100);

            setPayableDebts(payable);
            if (!isScenarioManual.current) setScenarioAmount(smartScenarioAmount);
            setData({
                runway: {
                    months: runwayMonths,
                    change: runwayTrend.change,
                    hasPrevMonth: runwayTrend.prevRunway !== null,
                    cash: totalCash,
                    monthlyBurn: totalBurnRate,
                    debtObligations,
                    monthsWithoutDebt,
                },
                spending: {
                    paceDiffPercent: paceDiff,
                    hasBaseline,
                    netFlow,
                    monthIncome,
                    averageNetFlow,
                    freedomImpactMonths: freedomImpact,
                    investableSurplus,
                },
                debt: {
                    isDebtFree: activeDebts.length === 0,
                    count: activeDebts.length,
                    monthlyPayments: calculateTotalDebtObligations(debts),
                    interestCost,
                    freedomDelayYears: calculateDebtFreedomDelay(totalLiability, annualSavings),
                    totalLiability,
                    dragMonths: debtDrag,
                },
                wealth: {
                    hasInvestments: totalPortfolioValue.gt(0),
                    portfolioValue: totalPortfolioValue,
                    boostMonths: investmentBoost,
                    annualReturnPercent,
                    isDefaultReturnRate,
                    scenarioInvestAmount: potentialMonthlyInvest.toNumber(),
                    scenarioYearsEarlier: freedom.saved,
                    currentYearsToFreedom: freedom.current,
                    acceleratedYearsToFreedom: freedom.accelerated,
                    currentMonthlyInvest: currentMonthlyInvest.toNumber(),
                    extraMonthlyInvest: extraMonthlyInvest.toNumber(),
                },
            });
        } catch (error) {
            console.error('Error loading financial health:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const step = useCallback((delta: 1 | -1) => {
        isScenarioManual.current = true;
        setScenarioAmount(prev => Math.max(0, prev + delta * getScenarioStep(prev)));
    }, []);

    // A real payoff simulation with and without the extra: months saved = how much sooner every balance hits zero.
    const monthsSaved = useMemo(() => {
        if (payableDebts.length === 0 || scenarioAmount <= 0) return 0;
        const baseline = calculateDebtPayoffStrategy(payableDebts, 0, payoffStrategy);
        const scenario = calculateDebtPayoffStrategy(payableDebts, scenarioAmount, payoffStrategy);
        const monthsBetween =
            (baseline.freedomDate.getFullYear() - scenario.freedomDate.getFullYear()) * 12 +
            (baseline.freedomDate.getMonth() - scenario.freedomDate.getMonth());
        return Math.max(0, monthsBetween);
    }, [payableDebts, scenarioAmount, payoffStrategy]);

    const scenario: DebtScenario = useMemo(() => ({
        amount: scenarioAmount,
        steps: stepsFromZero(scenarioAmount),
        monthsSaved,
        step,
    }), [scenarioAmount, monthsSaved, step]);

    return { data, isLoading, load, scenario };
};
