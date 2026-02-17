import React, { useCallback, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { UserProfile } from '@types';
import * as Storage from '@services/core/storageService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getLatestPrices } from '@services/domain/priceHistoryService';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';
import {
    calculateBurnRate,
    getCumulativeSpendingCurve,
    getCurrentMonthCumulative,
    getTransactionsByMonth,
    calculateTotals,
    getMonthlyTrends,
    calculateAverageIncome,
    calculateBalance
} from '@utils/financialMetrics';
import { calculateTotalDebtObligations, calculatePrevDebtObligations, calculateCurrentDebtBalance } from '@utils/debtMetrics';
import {
    calculateDebtDrag,
    calculateInvestmentBoost,
    calculateFreedomImpact,
    calculateDebtFreedomDelay,
    calculateFreedomAcceleration
} from '@utils/insightMetrics';
import { getSmartScenarioAmount } from '@utils/scenarioUtils';
import { getAnnualDividend } from '@services/domain/dividendHistoryService';

import FinancialStateCard from '@components/financialHealth/FinancialStateCard';
import SpendingCashFlowCard from '@components/financialHealth/SpendingCashFlowCard';
import DebtPressureCard from '@components/financialHealth/DebtPressureCard';
import WealthGrowthCard from '@components/financialHealth/WealthGrowthCard';
import FinancialHealthHelpModal, { HelpModalType } from '@components/financialHealth/FinancialHealthHelpModal';

interface WealthState {
    portfolioValue: BigNumber;
    annualReturnPercent: number;
    freedomAccelerationMonths: number;
    scenarioInvestAmount: number;
    scenarioYearsEarlier: number;
    currentYearsToFreedom: number;
    acceleratedYearsToFreedom: number;
    currentMonthlyInvest: number;
    hasInvestments: boolean;
    isDefaultReturnRate: boolean;
}

const FinancialHealthScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();

    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Metrics State
    const [financialState, setFinancialState] = useState({
        runwayMonths: 0,
        runwayChange: 0,
        spendingDifference: 0,
        debtDragMonths: 0,
        investmentBoostMonths: 0,
        totalCash: new BigNumber(0),
        monthlyBurn: new BigNumber(0),
        monthlyDebtObligations: new BigNumber(0)
    });

    const [cashFlowState, setCashFlowState] = useState({
        netFlow: new BigNumber(0),
        averageNetFlow: new BigNumber(0),
        spendingTrendPercent: 0,
        spendingTrendDirection: 'flat' as 'up' | 'down' | 'flat',
        freedomImpactMonths: 0
    });

    const [debtState, setDebtState] = useState({
        monthlyPayments: new BigNumber(0),
        interestCost: new BigNumber(0),
        freedomDelayYears: 0,
        scenarioAddedPayment: 200,
        scenarioMonthsSaved: 0,
        isDebtFree: true,
        totalLiability: new BigNumber(0)
    });

    const [wealthState, setWealthState] = useState<WealthState>({
        portfolioValue: new BigNumber(0),
        annualReturnPercent: 0,
        freedomAccelerationMonths: 0,
        scenarioInvestAmount: 300,
        scenarioYearsEarlier: 0,
        currentYearsToFreedom: 0,
        acceleratedYearsToFreedom: 0,
        currentMonthlyInvest: 0,
        hasInvestments: false,
        isDefaultReturnRate: false
    });

    const [modalState, setModalState] = useState<{ visible: boolean; type: HelpModalType }>({
        visible: false,
        type: null
    });

    const handleInfoPress = (type: HelpModalType) => {
        setModalState({ visible: true, type });
    };

    const loadData = async () => {
        try {
            setIsLoading(true);
            const p = await Storage.getUserProfile();
            setProfile(p);

            const t = await getCachedTransactions();
            const inv = await getCachedInvestments();
            const debts = await getAllDebts();

            const now = new Date();
            const currentMonthTransactions = getTransactionsByMonth(t, now);



            const { income: monthIncome, expense: monthExpense } = calculateTotals(currentMonthTransactions);
            // Use calculateBalance to include Transfers in Net Flow (Income + T_In - Expense - T_Out)
            // This ensures investment contributions are deducted from "Cash Flow" to avoid double counting with Wealth Card
            const netFlow = calculateBalance(currentMonthTransactions);

            const trends = getMonthlyTrends(t, 3);
            let totalNetFlow = new BigNumber(0);
            let totalAvgIncome = new BigNumber(0);
            let monthsCount = 0;

            trends.incomeData.forEach((inc, idx) => {
                totalAvgIncome = totalAvgIncome.plus(inc);
                // metrics.ts updated to return netCashFlowData which includes transfers
                totalNetFlow = totalNetFlow.plus(trends.netCashFlowData[idx]);
                monthsCount++;
            });

            const averageNetFlow = monthsCount > 0
                ? totalNetFlow.dividedBy(monthsCount)
                : netFlow;

            const averageMonthlyIncome = monthsCount > 0
                ? totalAvgIncome.dividedBy(monthsCount)
                : monthIncome;

            let totalCash = new BigNumber(0);
            let oInc = new BigNumber(0), oExp = new BigNumber(0);
            t.forEach(tx => {
                if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') oInc = oInc.plus(tx.amount.abs());
                if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') oExp = oExp.plus(tx.amount.abs());
            });
            totalCash = oInc.minus(oExp);

            const burnRate6 = calculateBurnRate(t, 6);
            const burnRate3 = calculateBurnRate(t, 3);
            const baseBurnRate = burnRate6.gt(0) ? burnRate6 : (burnRate3.gt(0) ? burnRate3 : monthExpense);

            const monthlyDebtObligations = calculateTotalDebtObligations(debts);
            const totalBurnRate = baseBurnRate.plus(monthlyDebtObligations);

            const runway = totalBurnRate.gt(0) ? totalCash.dividedBy(totalBurnRate).toNumber() : 999;

            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            let prevInc = new BigNumber(0), prevExp = new BigNumber(0);
            t.forEach(tx => {
                const d = new Date(tx.date);
                if (d <= endOfLastMonth) {
                    if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') prevInc = prevInc.plus(tx.amount.abs());
                    if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') prevExp = prevExp.plus(tx.amount.abs());
                }
            });
            const prevCash = prevInc.minus(prevExp);
            const prevBurnRateBase = calculateBurnRate(t, 6, endOfLastMonth);
            const prevMonthlyDebtObligations = calculatePrevDebtObligations(debts, endOfLastMonth);
            const prevTotalBurnRate = prevBurnRateBase.plus(prevMonthlyDebtObligations);
            const prevRunway = prevTotalBurnRate.gt(0) ? prevCash.dividedBy(prevTotalBurnRate).toNumber() : 999;
            const hasHistory = t.some(tx => new Date(tx.date) < new Date(now.getFullYear(), now.getMonth(), 1));
            const runwayChange = hasHistory ? (runway - prevRunway) : 0;

            const debtDrag = calculateDebtDrag(totalCash, baseBurnRate, monthlyDebtObligations);
            const uniqueSymbols = [...new Set(inv.map(i => i.symbol))];
            const prices = await getLatestPrices(uniqueSymbols);
            const priceMap: Record<string, BigNumber> = {};
            Object.keys(prices).forEach(s => priceMap[s] = prices[s].price);
            inv.forEach(i => { if (!priceMap[i.symbol]) priceMap[i.symbol] = i.price; });

            const portfolioMetrics = getAllPortfolioMetrics(inv, priceMap);
            const totalPortfolioValue = portfolioMetrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));
            const investmentBoost = calculateInvestmentBoost(totalPortfolioValue, totalBurnRate);

            const currentPacing = getCurrentMonthCumulative(currentMonthTransactions);
            const avgPacing = getCumulativeSpendingCurve(t, 3);
            let spendingDiff = 0;
            if (currentPacing.length > 0 && avgPacing.length > 0) {
                const cur = currentPacing[currentPacing.length - 1];
                const avg = avgPacing[Math.min(currentPacing.length - 1, avgPacing.length - 1)];
                if (avg > 0) spendingDiff = ((cur - avg) / avg) * 100;
            }

            setFinancialState({
                runwayMonths: runway,
                runwayChange: runwayChange,
                spendingDifference: spendingDiff,
                debtDragMonths: debtDrag,
                investmentBoostMonths: investmentBoost,
                totalCash,
                monthlyBurn: totalBurnRate,
                monthlyDebtObligations
            });

            const freedomImpact = calculateFreedomImpact(averageNetFlow, totalBurnRate);
            setCashFlowState({
                netFlow,
                averageNetFlow,
                spendingTrendPercent: Math.abs(spendingDiff),
                spendingTrendDirection: spendingDiff > 0 ? 'up' : spendingDiff < 0 ? 'down' : 'flat',
                freedomImpactMonths: freedomImpact
            });

            // Calculate Net Flow Cap (Max Potential Investment)
            // Fix: Use 6-month average income (excluding current month) minus current total burn rate.
            // This avoids "partial month" data inflating the surplus (e.g. 49k if income hit but bills haven't).
            const conservativeAvgIncome = calculateAverageIncome(t, 6);
            const investableSurplus = conservativeAvgIncome.minus(totalBurnRate);

            const netFlowCap = BigNumber.maximum(0, investableSurplus);

            // 2. Calculate Historical Investment (Current Path)
            // CRITICAL: Only count investments that have a corresponding TRANSACTION record.
            // This ensures we measuring actual Cash Flow divert to investing, not just portfolio updates.
            const validInvestmentIds = new Set(t.filter(tx => tx.investmentId).map(tx => tx.investmentId));
            const verifiedBuys = inv.filter(i => i.action === 'BUY' && validInvestmentIds.has(i.id));

            let smartScenarioAmount = getSmartScenarioAmount(averageMonthlyIncome, p?.currency || 'PHP');
            let currentMonthlyInvest = new BigNumber(0);

            if (verifiedBuys.length > 0) {
                const dates = verifiedBuys.map(b => new Date(b.date).getTime());
                const firstBuyDate = new Date(Math.min(...dates));
                const today = new Date();
                const monthsDiff = (today.getFullYear() - firstBuyDate.getFullYear()) * 12 + (today.getMonth() - firstBuyDate.getMonth());
                const monthsActive = Math.max(1, monthsDiff);
                const totalInvested = verifiedBuys.reduce((sum, b) => sum.plus(b.quantity.times(b.price)), new BigNumber(0));

                currentMonthlyInvest = totalInvested.dividedBy(monthsActive);

                // Update smartScenarioAmount for Debt usage
                if (currentMonthlyInvest.gt(0)) {
                    smartScenarioAmount = BigNumber.minimum(currentMonthlyInvest, netFlowCap).toNumber();
                }
            }

            // 3. Potential Path: Their max capacity (Net Flow - Debt)
            // Strictly cap at sustainability.
            const potentialMonthlyInvest = BigNumber.maximum(currentMonthlyInvest, netFlowCap);
            const extraMonthlyInvest = potentialMonthlyInvest.minus(currentMonthlyInvest);

            const activeDebts = debts.filter(d => d.status === 'ACTIVE');
            let estimatedMonthlyInterest = new BigNumber(0);
            let totalLiability = new BigNumber(0);

            // Calculate interest based on CURRENT BALANCE, not initial amount
            activeDebts.forEach(d => {
                const currentBalance = calculateCurrentDebtBalance(d, t);
                const rate = d.interestRate.dividedBy(100).dividedBy(12);

                // For Fixed/Variable, interest is on remaining balance
                // For Flat, it might be on initial, but let's assume standard amortization for the "Pressure" card
                if (d.interestType === 'FLAT') {
                    estimatedMonthlyInterest = estimatedMonthlyInterest.plus(d.initialAmount.times(rate));
                } else {
                    estimatedMonthlyInterest = estimatedMonthlyInterest.plus(currentBalance.times(rate));
                }

                totalLiability = totalLiability.plus(currentBalance);
            });

            const annualSavings = averageNetFlow.times(12).gt(0) ? averageNetFlow.times(12) : new BigNumber(0);
            const freedomDelay = calculateDebtFreedomDelay(totalLiability, annualSavings);

            setDebtState({
                monthlyPayments: calculateTotalDebtObligations(debts),
                interestCost: estimatedMonthlyInterest,
                freedomDelayYears: freedomDelay,
                scenarioAddedPayment: smartScenarioAmount,
                scenarioMonthsSaved: 0,
                isDebtFree: activeDebts.length === 0,
                totalLiability
            });


            let totalAnnualDividendIncome = new BigNumber(0);

            // Loop through unique holdings to calculate total dividend income
            // portfolioMetrics has one entry per symbol
            for (const metric of portfolioMetrics) {
                if (metric.currentQuantity.gt(0)) {
                    const annualDivPerShare = await getAnnualDividend(metric.symbol);
                    if (annualDivPerShare > 0) {
                        totalAnnualDividendIncome = totalAnnualDividendIncome.plus(
                            metric.currentQuantity.times(annualDivPerShare)
                        );
                    }
                }
            }

            let calculatedYield = 0;
            if (totalPortfolioValue.gt(0)) {
                calculatedYield = totalAnnualDividendIncome.dividedBy(totalPortfolioValue).times(100).toNumber();
            }

            const useDefaultRate = calculatedYield === 0;
            const finalReturnRate = useDefaultRate ? 7.2 : calculatedYield;

            // Freedom Calculation:
            // Base: Current Historical Investment
            // Extra: The gap to reach Potential
            // We should NOT include debt obligations in the "Freedom Number" target, because the assumption is
            // you will be debt-free by the time you retire.
            // So we use (Total Burn Rate - Debt Obligations) as the long-term living expense.
            const freedomBurnRate = BigNumber.maximum(0, totalBurnRate.minus(monthlyDebtObligations));

            const { saved, current, accelerated } = calculateFreedomAcceleration(
                totalPortfolioValue,
                currentMonthlyInvest,
                freedomBurnRate,
                extraMonthlyInvest,
                finalReturnRate / 100
            );

            setWealthState({
                portfolioValue: totalPortfolioValue,
                annualReturnPercent: finalReturnRate,
                freedomAccelerationMonths: investmentBoost,
                scenarioInvestAmount: potentialMonthlyInvest.toNumber(), // Passing POTENTIAL for the "If you invest X" card text
                scenarioYearsEarlier: saved,
                currentYearsToFreedom: current,
                acceleratedYearsToFreedom: accelerated,
                hasInvestments: totalPortfolioValue.gt(0),
                isDefaultReturnRate: useDefaultRate,
                currentMonthlyInvest: currentMonthlyInvest.toNumber() // New prop
            });

        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    return (
        <ScreenWrapper scrollable={false}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', flex: 1 }}>Financial Health</Text>
                </View>

                {/* Disclaimer Banner */}
                <View style={{
                    backgroundColor: 'rgba(255, 149, 0, 0.15)', // Light orange background
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 149, 0, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'flex-start'
                }}>
                    <Ionicons name="flash" size={24} color="#FF9500" style={{ marginRight: 12, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}>
                            <Text style={{ fontWeight: 'bold', color: '#FF9500' }}>⚡ Beta Feature: </Text>
                            This analysis uses strict, conservative math. It&apos;s designed to show the brutal truth about your financial runway and self-sustain date. Don&apos;t panic—use it to improve.
                        </Text>
                    </View>
                </View>

                <FinancialStateCard
                    runwayMonths={financialState.runwayMonths}
                    runwayChange={financialState.runwayChange}
                    spendingDifferencePercent={financialState.spendingDifference}
                    debtDragMonths={financialState.debtDragMonths}
                    investmentBoostMonths={financialState.investmentBoostMonths}
                    isLoading={isLoading}
                    onInfoPress={() => handleInfoPress('RUNWAY')}
                />

                <SpendingCashFlowCard
                    netFlow={cashFlowState.netFlow}
                    spendingTrendPercent={cashFlowState.spendingTrendPercent}
                    spendingTrendDirection={cashFlowState.spendingTrendDirection}
                    freedomImpactMonths={cashFlowState.freedomImpactMonths}
                    currency={profile?.currency || 'PHP'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    onInfoPress={() => handleInfoPress('CASH_FLOW')}
                />

                <DebtPressureCard
                    monthlyPayments={debtState.monthlyPayments}
                    interestCost={debtState.interestCost}
                    freedomDelayYears={debtState.freedomDelayYears}
                    scenarioAddedPayment={debtState.scenarioAddedPayment}
                    scenarioMonthsSaved={debtState.scenarioMonthsSaved}
                    currency={profile?.currency || 'PHP'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    isDebtFree={debtState.isDebtFree}
                    onInfoPress={() => handleInfoPress('DEBT')}
                />

                <WealthGrowthCard
                    portfolioValue={wealthState.portfolioValue}
                    annualReturnPercent={wealthState.annualReturnPercent}
                    freedomAccelerationMonths={wealthState.freedomAccelerationMonths}
                    scenarioInvestAmount={wealthState.scenarioInvestAmount}
                    scenarioYearsEarlier={wealthState.scenarioYearsEarlier}
                    currency={profile?.currency || 'PHP'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    hasInvestments={wealthState.hasInvestments}
                    isDefaultReturnRate={wealthState.isDefaultReturnRate}
                    monthlyBurn={financialState.monthlyBurn}
                    currentYearsToFreedom={wealthState.currentYearsToFreedom}
                    onInfoPress={() => handleInfoPress('WEALTH')}
                />
            </ScrollView>

            <FinancialHealthHelpModal
                visible={modalState.visible}
                onClose={() => setModalState(prev => ({ ...prev, visible: false }))}
                type={modalState.type}
                data={{
                    currency: profile?.currency || 'PHP',
                    runwayMonths: financialState.runwayMonths,
                    totalCash: financialState.totalCash,
                    monthlyBurn: financialState.monthlyBurn,
                    debtDragMonths: financialState.debtDragMonths,
                    investmentBoostMonths: financialState.investmentBoostMonths,
                    monthlyDebtObligations: financialState.monthlyDebtObligations,
                    netFlow: cashFlowState.netFlow,
                    avgNetFlow: cashFlowState.averageNetFlow,
                    spendingTrendPercent: cashFlowState.spendingTrendPercent,
                    spendingTrendDirection: cashFlowState.spendingTrendDirection,
                    freedomImpactMonths: cashFlowState.freedomImpactMonths,
                    totalDebt: debtState.totalLiability,
                    freedomDelayYears: debtState.freedomDelayYears,
                    monthlyPayments: debtState.monthlyPayments,
                    interestCost: debtState.interestCost,
                    portfolioValue: wealthState.portfolioValue,
                    annualReturn: wealthState.annualReturnPercent,
                    freedomAccelerationMonths: wealthState.freedomAccelerationMonths,
                    scenarioInvestAmount: wealthState.scenarioInvestAmount,
                    scenarioYearsEarlier: wealthState.scenarioYearsEarlier,
                    currentYearsToFreedom: wealthState.currentYearsToFreedom,
                    acceleratedYearsToFreedom: wealthState.acceleratedYearsToFreedom,
                    currentMonthlyInvest: wealthState.currentMonthlyInvest
                }}
            />
        </ScreenWrapper>
    );
};

export default FinancialHealthScreen;
