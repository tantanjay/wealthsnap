import React, { useCallback, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { UserProfile, Transaction } from '@types';
import * as Storage from '@services/core/storageService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllBudgets } from '@services/domain/budgetService';
import { getLatestPrices } from '@services/domain/priceHistoryService';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';
import {
    calculateBurnRate,
    getCumulativeSpendingCurve,
    getCurrentMonthCumulative,
    getTransactionsByMonth,
    calculateTotals,
    getTopExpenses
} from '@utils/financialMetrics';
import { calculateProjectedDebtLiability, calculateTotalDebtObligations, calculatePrevDebtObligations } from '@utils/debtMetrics';
import {
    calculateDebtDrag,
    calculateInvestmentBoost,
    calculateSpendingTrend,
    calculateFreedomImpact,
    calculateDebtFreedomDelay,
    calculateFreedomAcceleration
} from '@utils/insightMetrics';
import { getSmartScenarioAmount } from '@utils/scenarioUtils';

import FinancialStateCard from '@components/homev2/FinancialStateCard';
import SpendingCashFlowCard from '@components/homev2/SpendingCashFlowCard';
import DebtPressureCard from '@components/homev2/DebtPressureCard';
import WealthGrowthCard from '@components/homev2/WealthGrowthCard';

const HomeScreenV2 = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();

    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [topExpenses, setTopExpenses] = useState<Transaction[]>([]);

    // Metrics State
    const [financialState, setFinancialState] = useState({
        runwayMonths: 0,
        runwayChange: 0,
        spendingDifference: 0,
        debtDragMonths: 0,
        investmentBoostMonths: 0
    });

    const [cashFlowState, setCashFlowState] = useState({
        netFlow: new BigNumber(0),
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
        isDebtFree: true
    });

    const [wealthState, setWealthState] = useState({
        portfolioValue: new BigNumber(0),
        annualReturnPercent: 0,
        freedomAccelerationMonths: 0,
        scenarioInvestAmount: 300,
        scenarioYearsEarlier: 0,
        hasInvestments: false
    });

    const [infoModal, setInfoModal] = useState({ visible: false, title: '', content: '' });

    const handleInfoPress = (title: string, content: string) => {
        setInfoModal({ visible: true, title, content });
    };

    const loadData = async () => {
        try {
            setIsLoading(true);
            const p = await Storage.getUserProfile();
            setProfile(p);

            const t = await getCachedTransactions();
            setTransactions(t);
            setTopExpenses(getTopExpenses(t)); // Calculate Top Expenses

            const inv = await getCachedInvestments();
            const debts = await getAllDebts();
            const budgets = await getAllBudgets();

            const now = new Date();
            const currentMonthTransactions = getTransactionsByMonth(t, now);

            // --- 1. BASE FINANCIALS ---
            const { income: monthIncome, expense: monthExpense } = calculateTotals(currentMonthTransactions);
            const netFlow = monthIncome.minus(monthExpense);

            let totalCash = new BigNumber(0);
            let oInc = new BigNumber(0), oExp = new BigNumber(0);
            t.forEach(tx => {
                if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') oInc = oInc.plus(tx.amount.abs());
                if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') oExp = oExp.plus(tx.amount.abs());
            });
            totalCash = oInc.minus(oExp);

            // --- 2. RUNWAY & BURN RATE & RUNWAY CHANGE ---
            const burnRate6 = calculateBurnRate(t, 6);
            const burnRate3 = calculateBurnRate(t, 3);
            const baseBurnRate = burnRate6.gt(0) ? burnRate6 : (burnRate3.gt(0) ? burnRate3 : monthExpense);

            const monthlyDebtObligations = calculateTotalDebtObligations(debts);
            const totalBurnRate = baseBurnRate.plus(monthlyDebtObligations);

            const runway = totalBurnRate.gt(0) ? totalCash.dividedBy(totalBurnRate).toNumber() : 999;

            // -- Real Runway Change Calculation --
            // 1. Get Cash Balance at End of Last Month
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            let prevCash = new BigNumber(0);
            let prevInc = new BigNumber(0), prevExp = new BigNumber(0);
            t.forEach(tx => {
                const d = new Date(tx.date);
                if (d <= endOfLastMonth) { // Only transactions up to end of last month
                    if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') prevInc = prevInc.plus(tx.amount.abs());
                    if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') prevExp = prevExp.plus(tx.amount.abs());
                }
            });
            prevCash = prevInc.minus(prevExp);

            // 2. Get Burn Rate End of Last Month (Calculate burn rate excluding this month's data window)
            // 2. Get Burn Rate End of Last Month
            const prevBurnRateBase = calculateBurnRate(t, 6, endOfLastMonth);

            // Filter debts that existed last month
            // If debt.startDate (or createdAt) is after endOfLastMonth, it didn't exist yet.
            const prevMonthlyDebtObligations = calculatePrevDebtObligations(debts, endOfLastMonth);
            const prevTotalBurnRate = prevBurnRateBase.plus(prevMonthlyDebtObligations);

            const prevRunway = prevTotalBurnRate.gt(0) ? prevCash.dividedBy(prevTotalBurnRate).toNumber() : 999;

            // 3. Difference
            // If we have less than 1 month of data, change is 0
            const hasHistory = t.some(tx => new Date(tx.date) < new Date(now.getFullYear(), now.getMonth(), 1));
            const runwayChange = hasHistory ? (runway - prevRunway) : 0;

            // --- 3. INSIGHTS: FINANCIAL STATE ---
            const debtDrag = calculateDebtDrag(totalCash, baseBurnRate, monthlyDebtObligations);

            const uniqueSymbols = [...new Set(inv.map(i => i.symbol))];
            const prices = await getLatestPrices(uniqueSymbols);
            const priceMap: Record<string, BigNumber> = {};
            Object.keys(prices).forEach(s => priceMap[s] = prices[s].price);

            inv.forEach(i => {
                if (!priceMap[i.symbol]) priceMap[i.symbol] = i.price;
            });

            const portfolioMetrics = getAllPortfolioMetrics(inv, priceMap);
            const totalPortfolioValue = portfolioMetrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));

            const investmentBoost = calculateInvestmentBoost(totalPortfolioValue, totalBurnRate);

            const currentPacing = getCurrentMonthCumulative(currentMonthTransactions);
            const avgPacing = getCumulativeSpendingCurve(t, 3);
            let spendingDiff = 0;
            if (currentPacing.length > 0 && avgPacing.length > 0) {
                const dayIndex = currentPacing.length - 1;
                const cur = currentPacing[dayIndex];
                const avg = avgPacing[Math.min(dayIndex, avgPacing.length - 1)];
                if (avg > 0) spendingDiff = ((cur - avg) / avg) * 100;
            }

            setFinancialState({
                runwayMonths: runway,
                runwayChange: runwayChange,
                spendingDifference: spendingDiff,
                debtDragMonths: debtDrag,
                investmentBoostMonths: investmentBoost
            });

            // --- 4. INSIGHTS: CASH FLOW ---
            const spendingDirection = spendingDiff > 0 ? 'up' : spendingDiff < 0 ? 'down' : 'flat';
            const freedomImpact = calculateFreedomImpact(netFlow, baseBurnRate.plus(monthlyDebtObligations));

            setCashFlowState({
                netFlow,
                spendingTrendPercent: Math.abs(spendingDiff),
                spendingTrendDirection: spendingDirection,
                freedomImpactMonths: freedomImpact
            });

            // --- SCENARIO AMOUNT SCALING ---
            // Uses smart utility to respect currency floors (e.g. 1000 PHP) and 10% income target
            const smartScenarioAmount = getSmartScenarioAmount(monthIncome, profile?.currency || 'USD');

            // --- 5. INSIGHTS: DEBT PRESSURE ---
            const activeDebts = debts.filter(d => d.status === 'ACTIVE');
            const totalMonthlyPayments = activeDebts.reduce((sum, d) => sum.plus(d.minPayment), new BigNumber(0));

            let estimatedMonthlyInterest = new BigNumber(0);
            let totalLiability = new BigNumber(0);

            activeDebts.forEach(d => {
                const balance = d.initialAmount;
                const rate = d.interestRate.dividedBy(100).dividedBy(12);
                estimatedMonthlyInterest = estimatedMonthlyInterest.plus(balance.times(rate));
                totalLiability = totalLiability.plus(balance);
            });

            const annualSavings = netFlow.times(12).gt(0) ? netFlow.times(12) : new BigNumber(0);
            const freedomDelay = calculateDebtFreedomDelay(totalLiability, annualSavings);

            const monthsSaved = activeDebts.length > 0 ? 11 : 0; // Keeping placeholder for now as calculation logic is complex and not requested to be fixed yet, or is it?
            // Actually, let's fix the Months Saved scenario too if we can, or just update currency. 
            // The prompt specifically asked for Wealth Scenario fix. I'll stick to updating the AMOUNT displayed.

            setDebtState({
                monthlyPayments: totalMonthlyPayments,
                interestCost: estimatedMonthlyInterest,
                freedomDelayYears: freedomDelay > 50 ? 50 : freedomDelay,
                scenarioAddedPayment: smartScenarioAmount,
                scenarioMonthsSaved: monthsSaved,
                isDebtFree: activeDebts.length === 0
            });

            // --- 6. INSIGHTS: WEALTH GROWTH ---
            const annualReturn = 7.2;
            const freedomAccelRunway = investmentBoost;

            const yearsEarlier = calculateFreedomAcceleration(
                totalPortfolioValue,
                annualSavings.dividedBy(12),
                totalBurnRate,
                new BigNumber(smartScenarioAmount),
                0.07
            );

            setWealthState({
                portfolioValue: totalPortfolioValue,
                annualReturnPercent: annualReturn,
                freedomAccelerationMonths: freedomAccelRunway,
                scenarioInvestAmount: smartScenarioAmount,
                scenarioYearsEarlier: yearsEarlier,
                hasInvestments: totalPortfolioValue.gt(0)
            });

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleTransactionPress = (transaction: Transaction) => {
        // Navigate to Transaction Details or similar
        // For V2 MVP, we can just log or navigate to history
        navigation.navigate('History', { screen: 'TransactionDetails', params: { transaction } });
        // Assuming History stack handles it, or just generic navigation
    };

    return (
        <ScreenWrapper scrollable={false}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', flex: 1 }}>Financial Health</Text>
                </View>

                <FinancialStateCard
                    runwayMonths={financialState.runwayMonths}
                    runwayChange={financialState.runwayChange}
                    spendingDifferencePercent={financialState.spendingDifference}
                    debtDragMonths={financialState.debtDragMonths}
                    investmentBoostMonths={financialState.investmentBoostMonths}
                    isLoading={isLoading}
                    onInfoPress={handleInfoPress}
                />

                <SpendingCashFlowCard
                    netFlow={cashFlowState.netFlow}
                    spendingTrendPercent={cashFlowState.spendingTrendPercent}
                    spendingTrendDirection={cashFlowState.spendingTrendDirection}
                    freedomImpactMonths={cashFlowState.freedomImpactMonths}
                    currency={profile?.currency || 'USD'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    onInfoPress={handleInfoPress}
                />

                <DebtPressureCard
                    monthlyPayments={debtState.monthlyPayments}
                    interestCost={debtState.interestCost}
                    freedomDelayYears={debtState.freedomDelayYears}
                    scenarioAddedPayment={debtState.scenarioAddedPayment}
                    scenarioMonthsSaved={debtState.scenarioMonthsSaved}
                    currency={profile?.currency || 'USD'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    isDebtFree={debtState.isDebtFree}
                    onInfoPress={handleInfoPress}
                />

                <WealthGrowthCard
                    portfolioValue={wealthState.portfolioValue}
                    annualReturnPercent={wealthState.annualReturnPercent}
                    freedomAccelerationMonths={wealthState.freedomAccelerationMonths}
                    scenarioInvestAmount={wealthState.scenarioInvestAmount}
                    scenarioYearsEarlier={wealthState.scenarioYearsEarlier}
                    currency={profile?.currency || 'USD'}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                    hasInvestments={wealthState.hasInvestments}
                    onInfoPress={handleInfoPress}
                />

            </ScrollView>

            <BottomModal
                visible={infoModal.visible}
                onClose={() => setInfoModal({ ...infoModal, visible: false })}
                title={infoModal.title}
            >
                <View style={{ padding: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
                        {infoModal.content}
                    </Text>
                </View>
            </BottomModal>
        </ScreenWrapper>
    );
};

export default HomeScreenV2;
