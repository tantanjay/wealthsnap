import React, { useCallback, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import HomeTransactionsCard from '@components/home/HomeTransactionsCard';
import HomeSettingsModal from '@components/home/HomeSettingsModal';
import HomeCashFlowCard from '@components/home/HomeCashFlowCard';
import HomeInvestmentCard from '@components/home/HomeInvestmentCard';
import HomeDebtCard from '@components/home/HomeDebtCard';
import HomeFinancialHealthCard from '@components/home/HomeFinancialHealthCard';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { UserProfile, Transaction, Investment } from '@types';
import {
    getTransactionsByMonth,
    getCumulativeSpendingCurve,
    getCurrentMonthCumulative,
    getTopExpenses,
    calculateBurnRate,
    getCategoryBreakdown,
} from '@utils/financialMetrics';
import {
    calculateDebtDrag,
    calculateInvestmentBoost,
} from '@utils/insightMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllBudgets } from '@services/domain/budgetService';
import { getAllDebts } from '@services/domain/debtService';
import * as Storage from '@services/core/storageService';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';
import { getLatestPrices } from '@services/domain/priceHistoryService';
import { ReviewAppModal } from '@components/common/ReviewAppModal';
import { useReviewPrompt } from '@hooks/useReviewPrompt';
import { calculateProjectedDebtLiability, calculateTotalDebtObligations, calculatePrevDebtObligations } from '@utils/debtMetrics';

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Calculated values for both modes
    const [overallIncome, setOverallIncome] = useState(new BigNumber(0));
    const [overallExpense, setOverallExpense] = useState(new BigNumber(0));
    const [monthIncome, setMonthIncome] = useState(new BigNumber(0));
    const [monthExpense, setMonthExpense] = useState(new BigNumber(0));

    // Transfer States
    const [overallTransferIn, setOverallTransferIn] = useState(new BigNumber(0));
    const [overallTransferOut, setOverallTransferOut] = useState(new BigNumber(0));
    const [monthTransferIn, setMonthTransferIn] = useState(new BigNumber(0));
    const [monthTransferOut, setMonthTransferOut] = useState(new BigNumber(0));

    const [investmentTotal, setInvestmentTotal] = useState(new BigNumber(0));
    const [realizedPL, setRealizedPL] = useState(new BigNumber(0));
    const [unrealizedPL, setUnrealizedPL] = useState(new BigNumber(0));
    // Monthly Investment Metrics
    const [monthInvested, setMonthInvested] = useState(new BigNumber(0));
    const [monthRealizedPL, setMonthRealizedPL] = useState(new BigNumber(0));
    const [monthUnrealizedPL, setMonthUnrealizedPL] = useState(new BigNumber(0));



    const [debtTotal, setDebtTotal] = useState(new BigNumber(0));
    const [debtBorrowed, setDebtBorrowed] = useState(new BigNumber(0));
    const [debtRepaid, setDebtRepaid] = useState(new BigNumber(0));
    const [monthDebtBorrowed, setMonthDebtBorrowed] = useState(new BigNumber(0));
    const [monthDebtRepaid, setMonthDebtRepaid] = useState(new BigNumber(0));
    const [monthlyObligations, setMonthlyObligations] = useState(new BigNumber(0));
    const [monthlyObligationsPaid, setMonthlyObligationsPaid] = useState(new BigNumber(0));
    const [isLoading, setIsLoading] = useState(true);

    const [financialHealth, setFinancialHealth] = useState({
        totalAssets: new BigNumber(0),
        netWorth: new BigNumber(0),
        totalProjectedLiability: new BigNumber(0),
        runwayInMonths: 0,
        runwayChange: 0,
        topHoldings: [] as Array<{ symbol: string, percent: number }>,
        monthBudgetPercent: 0,
        spendingDifferencePercent: 0,
        cashBalance: new BigNumber(0),
        investmentBoost: 0,
        debtDrag: 0
    });

    // Settings Modal State
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

    // Active Display States (Swipeable)
    const [displayMode, setDisplayMode] = useState<Storage.HomeDisplayMode>('Overall');
    const [investmentDisplayMode, setInvestmentDisplayMode] = useState<Storage.InvestmentDisplayMode>('Total');

    const [debtDisplayMode, setDebtDisplayMode] = useState<Storage.DebtDisplayMode>('Total');
    const [financialHealthDisplayMode, setFinancialHealthDisplayMode] = useState<Storage.HomeFinancialHealthDisplayMode>('Health');

    // Saved Configuration States (Settings)
    const [savedDisplayMode, setSavedDisplayMode] = useState<Storage.HomeDisplayMode>('Overall');

    const [savedInvestmentDisplayMode, setSavedInvestmentDisplayMode] = useState<Storage.InvestmentDisplayMode>('Total');
    const [savedDebtDisplayMode, setSavedDebtDisplayMode] = useState<Storage.DebtDisplayMode>('Total');

    const [cardOrder, setCardOrder] = useState<string[]>(['financial-health', 'cash-flow', 'portfolio', 'debt', 'transactions']);

    // Info Modal State
    const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
    const [infoModalMode, setInfoModalMode] = useState<'Overall' | 'Month' | 'MonthIncomeExpense' | 'Assets' | 'Health' | 'NetWorth'>('Overall');

    const handleInfoPress = (mode: 'Overall' | 'Month' | 'MonthIncomeExpense' | 'Assets' | 'Health' | 'NetWorth') => {
        setInfoModalMode(mode);
        setIsInfoModalVisible(true);
    };

    const loadData = async () => {
        try {
            setDebtTotal(new BigNumber(0)); // to remove lint
            setIsLoading(true);

            // Load persisted display mode
            const savedMode = await Storage.getHomeDisplayMode();
            if (savedMode) {
                setDisplayMode(savedMode);
                setSavedDisplayMode(savedMode);
            }

            const savedFinancialMode = await Storage.getHomeFinancialHealthDisplayMode();
            if (savedFinancialMode) {
                setFinancialHealthDisplayMode(savedFinancialMode);
            }

            const savedDebtMode = await Storage.getHomeDebtDisplayMode();
            if (savedDebtMode) {
                setDebtDisplayMode(savedDebtMode);
                setSavedDebtDisplayMode(savedDebtMode);
            }

            // Load persisted card order
            const savedOrder = await Storage.getHomeCardOrder();
            if (savedOrder && savedOrder.length > 0) {
                const defaultOrder = ['financial-health', 'cash-flow', 'portfolio', 'debt', 'transactions'];

                // Check for missing cards
                const missingCards = defaultOrder.filter(id => !savedOrder.includes(id));

                let newOrder = [...savedOrder];

                // If financial-health is missing (new feature), add it to the TOP
                if (missingCards.includes('financial-health')) {
                    newOrder = ['financial-health', ...newOrder];
                }

                // Add other missing cards to the end
                const otherMissing = missingCards.filter(c => c !== 'financial-health');
                newOrder = [...newOrder, ...otherMissing];

                setCardOrder(newOrder);
            }

            // Process recurring rules first to ensure we fetch the latest transactions
            await processRecurrenceRules();



            const p = await Storage.getUserProfile();
            const t = await getCachedTransactions();
            const inv = await getCachedInvestments();
            const allDebts = await getAllDebts();

            setProfile(p);
            setTransactions(t);

            // Calculate metrics
            let oInc = new BigNumber(0), oExp = new BigNumber(0), mInc = new BigNumber(0), mExp = new BigNumber(0);
            let oTransIn = new BigNumber(0), oTransOut = new BigNumber(0), mTransIn = new BigNumber(0), mTransOut = new BigNumber(0);

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            t.forEach((tx: Transaction) => {
                const val = tx.amount.abs();
                const isMonth = new Date(tx.date).getMonth() === currentMonth && new Date(tx.date).getFullYear() === currentYear;

                if (tx.type === 'INCOME') {
                    oInc = oInc.plus(val.abs());
                    if (isMonth) mInc = mInc.plus(val.abs());
                } else if (tx.type === 'EXPENSE') {
                    oExp = oExp.plus(val.abs());
                    if (isMonth) mExp = mExp.plus(val.abs());
                } else if (tx.type === 'TRANSFER_IN') {
                    oTransIn = oTransIn.plus(val.abs());
                    if (isMonth) mTransIn = mTransIn.plus(val.abs());
                } else if (tx.type === 'TRANSFER_OUT') {
                    oTransOut = oTransOut.plus(val.abs());
                    if (isMonth) mTransOut = mTransOut.plus(val.abs());
                }
            });

            setOverallIncome(oInc);
            setOverallExpense(oExp);
            setMonthIncome(mInc);
            setMonthExpense(mExp);
            setOverallTransferIn(oTransIn);
            setOverallTransferOut(oTransOut);
            setMonthTransferIn(mTransIn);
            setMonthTransferOut(mTransOut);

            // --- Investment Computation ---
            const groupedInvestments = inv.reduce((acc, item) => {
                if (!acc[item.symbol]) acc[item.symbol] = [];
                acc[item.symbol].push(item);
                return acc;
            }, {} as Record<string, Investment[]>);

            const uniqueSymbols = Object.keys(groupedInvestments);

            const priceHistoryMap = await getLatestPrices(uniqueSymbols);

            const currentPriceMap: Record<string, BigNumber> = {};

            uniqueSymbols.forEach(symbol => {
                if (priceHistoryMap[symbol]) {
                    currentPriceMap[symbol] = priceHistoryMap[symbol].price;
                } else {
                    const symbolTxns = groupedInvestments[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (symbolTxns.length > 0) {
                        currentPriceMap[symbol] = symbolTxns[0].price;
                    } else {
                        currentPriceMap[symbol] = new BigNumber(0);
                    }
                }
            });

            const portfolioMetrics = getAllPortfolioMetrics(inv, currentPriceMap);

            const totalMarketValue = portfolioMetrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));
            const totalUnrealizedPL = portfolioMetrics.reduce((sum, m) => sum.plus(m.unrealizedPL), new BigNumber(0));

            let totalRealizedPL = new BigNumber(0);
            let mRealizedPL = new BigNumber(0);

            t.forEach(tx => {
                if (tx.type === 'CAPITAL_GAIN') {
                    const val = tx.amount.abs();
                    totalRealizedPL = totalRealizedPL.plus(val);

                    const isMonth = new Date(tx.date).getMonth() === currentMonth && new Date(tx.date).getFullYear() === currentYear;
                    if (isMonth) {
                        mRealizedPL = mRealizedPL.plus(val);
                    }
                } else if (tx.type === 'CAPITAL_LOSS') {
                    const val = tx.amount.abs();
                    totalRealizedPL = totalRealizedPL.minus(val);

                    const isMonth = new Date(tx.date).getMonth() === currentMonth && new Date(tx.date).getFullYear() === currentYear;
                    if (isMonth) {
                        mRealizedPL = mRealizedPL.minus(val);
                    }
                }
            });

            let mInvested = new BigNumber(0);
            let mUnrealizedPL = new BigNumber(0);
            const monthlyBuys: Record<string, { qty: BigNumber, cost: BigNumber }> = {};
            const currentQuantities: Record<string, BigNumber> = {};

            portfolioMetrics.forEach(m => {
                currentQuantities[m.symbol] = m.currentQuantity;
            });

            inv.forEach(item => {
                const isMonth = new Date(item.date).getMonth() === currentMonth && new Date(item.date).getFullYear() === currentYear;

                if (isMonth && item.action === 'BUY') {
                    const cost = item.price.times(item.quantity).plus(item.fees || 0);
                    mInvested = mInvested.plus(cost);

                    // Track monthly buys per symbol for P/L calculation
                    if (!monthlyBuys[item.symbol]) {
                        monthlyBuys[item.symbol] = { qty: new BigNumber(0), cost: new BigNumber(0) };
                    }
                    monthlyBuys[item.symbol].qty = monthlyBuys[item.symbol].qty.plus(item.quantity);
                    monthlyBuys[item.symbol].cost = monthlyBuys[item.symbol].cost.plus(cost);
                }
            });

            // Calculate Monthly Unrealized P/L
            // Logic: Only count P/L for shares bought this month that are STILL HELD.
            // If you bought 10 and sold 10, monthly unrealized P/L should be 0.
            Object.keys(monthlyBuys).forEach(symbol => {
                const buyData = monthlyBuys[symbol];
                const currentQty = currentQuantities[symbol] || new BigNumber(0);

                // Effective Quantity = Min(Bought This Month, Currently Held)
                const effectiveQty = BigNumber.min(buyData.qty, currentQty);

                if (effectiveQty.isGreaterThan(0)) {
                    // Calculate average cost of the shares bought THIS MONTH
                    const avgCostThisMonth = buyData.cost.dividedBy(buyData.qty);

                    const currentPrice = currentPriceMap[symbol] || new BigNumber(0);
                    const marketValue = currentPrice.times(effectiveQty);
                    const costBasis = avgCostThisMonth.times(effectiveQty);

                    const pl = marketValue.minus(costBasis);
                    mUnrealizedPL = mUnrealizedPL.plus(pl);
                }
            });

            setInvestmentTotal(totalMarketValue);
            setUnrealizedPL(totalUnrealizedPL);
            setRealizedPL(totalRealizedPL);

            setMonthInvested(mInvested);
            setMonthRealizedPL(mRealizedPL);
            setMonthUnrealizedPL(mUnrealizedPL);

            // 7. Calculate Debt Metrics
            let totalBorrowed = new BigNumber(0);
            let totalRepaid = new BigNumber(0);
            let mDebtBorrowed = new BigNumber(0);
            let mDebtRepaid = new BigNumber(0);

            // Helper to get transaction total for a specific debt
            const getDebtTransactions = (debtId: string, monthOnly: boolean = false) => {
                return t.filter(tx => {
                    const isDebt = tx.debtId === debtId;
                    if (!isDebt) return false;
                    if (monthOnly) {
                        return new Date(tx.date).getMonth() === currentMonth && new Date(tx.date).getFullYear() === currentYear;
                    }
                    return true;
                });
            };

            let currentTotalDebt = new BigNumber(0);

            allDebts.forEach(debt => {
                // 1. Borrowed
                totalBorrowed = totalBorrowed.plus(debt.initialAmount);

                const isMonthCreated = new Date(debt.startDate || debt.createdAt).getMonth() === currentMonth &&
                    new Date(debt.startDate || debt.createdAt).getFullYear() === currentYear;

                if (isMonthCreated) {
                    mDebtBorrowed = mDebtBorrowed.plus(debt.initialAmount);
                }

                // 2. Repaid (Payments) & Interest
                const payments = getDebtTransactions(debt.id);

                // User Logic:
                // Repaid = TRANSFER_OUT linked to debtId (Principal Payment)
                // Interest = EXPENSE linked to debtId (excluding 'INITIAL_TRANSACTION' which is Fees)

                const debtPrincipalRepaid = payments.reduce((sum, tx) => {
                    if (tx.type === 'TRANSFER_OUT') {
                        return sum.plus(tx.amount.abs());
                    }
                    return sum;
                }, new BigNumber(0));

                const debtInterestPaid = payments.reduce((sum, tx) => {
                    if (tx.type === 'EXPENSE' && tx.subCategory !== 'INITIAL_TRANSACTION') {
                        return sum.plus(tx.amount.abs());
                    }
                    return sum;
                }, new BigNumber(0));

                totalRepaid = totalRepaid.plus(debtPrincipalRepaid);

                // Month Repaid
                const monthPayments = getDebtTransactions(debt.id, true);
                const monthPrincipalRepaid = monthPayments.reduce((sum, tx) => {
                    if (tx.type === 'TRANSFER_OUT') {
                        return sum.plus(tx.amount.abs());
                    }
                    return sum;
                }, new BigNumber(0));

                mDebtRepaid = mDebtRepaid.plus(monthPrincipalRepaid);

                // 3. Current Balance (Initial - Principal Repaid)
                // If status is PAID_OFF, balance is 0.
                if (debt.status === 'ACTIVE') {
                    const balance = debt.initialAmount.minus(debtPrincipalRepaid);
                    // Don't show negative balance if overpaid (unless it's a credit?)
                    if (balance.isGreaterThan(0)) {
                        currentTotalDebt = currentTotalDebt.plus(balance);
                    }
                }
            });

            // Calculate Total Projected Liability (Principal + Future Interest)
            let totalProjectedLiability = new BigNumber(0);

            allDebts.forEach(debt => {
                if (debt.status === 'ACTIVE') {
                    // 1. Calculate current principal balance
                    const payments = getDebtTransactions(debt.id);
                    const principalRepaid = payments.reduce((sum, tx) => {
                        if (tx.type === 'TRANSFER_OUT') return sum.plus(tx.amount.abs());
                        return sum;
                    }, new BigNumber(0));

                    const currentPrincipal = debt.initialAmount.minus(principalRepaid);

                    if (currentPrincipal.gt(0)) {
                        const { totalLiability } = calculateProjectedDebtLiability(debt, currentPrincipal);
                        totalProjectedLiability = totalProjectedLiability.plus(totalLiability);
                    }
                }
            });

            // Calculate Obligations Paid (Active Debts only)
            let obligationsPaid = new BigNumber(0);
            const totalDebtObligationsValue = calculateTotalDebtObligations(allDebts);

            allDebts.forEach(debt => {
                if (debt.status === 'ACTIVE') {
                    // Get all payments for this debt in current month
                    const monthPayments = getDebtTransactions(debt.id, true);

                    // Sum of Principal (TRANSFER_OUT) + Interest (EXPENSE)
                    // Note: We exclude INITIAL_TRANSACTION fees if present, though typically they are one-off.
                    // We want to capture regular monthly payments.
                    const totalPaid = monthPayments.reduce((sum, tx) => {
                        if (tx.type === 'TRANSFER_OUT' || (tx.type === 'EXPENSE' && tx.subCategory !== 'INITIAL_TRANSACTION')) {
                            return sum.plus(tx.amount.abs());
                        }
                        return sum;
                    }, new BigNumber(0));

                    obligationsPaid = obligationsPaid.plus(totalPaid);
                }
            });

            setDebtTotal(currentTotalDebt);
            setDebtBorrowed(totalBorrowed);
            setDebtRepaid(totalRepaid);
            setMonthDebtBorrowed(mDebtBorrowed);
            setMonthDebtRepaid(mDebtRepaid);
            setMonthlyObligations(totalDebtObligationsValue);
            setMonthlyObligationsPaid(obligationsPaid);

            // 8. Calculate Financial Health Metrics
            const currentCashBalance = oInc.plus(oTransIn).minus(oExp.plus(oTransOut));
            const assetsTotal = currentCashBalance.plus(totalMarketValue);

            // Calculate Runway & Budget
            // Get date of first transaction to determine "months active"
            let monthsActive = 1;
            if (t.length > 0) {
                const firstTxDate = new Date(t[t.length - 1].date);
                const diffTime = Math.abs(now.getTime() - firstTxDate.getTime());
                const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                monthsActive = Math.max(1, diffMonths);
            }

            const average6MonthBurn = calculateBurnRate(t, 6);
            const average3MonthBurn = calculateBurnRate(t, 3);

            let burnRate = average6MonthBurn;
            if (burnRate.isLessThanOrEqualTo(0)) {
                burnRate = average3MonthBurn.isGreaterThan(0) ? average3MonthBurn : mExp;
            }

            // --- INJECT DEBT OBLIGATIONS ---
            // Runway = Cash / (Living Expenses + Debt Obligations)
            // Already calculated totalDebtObligationsValue above
            const totalBurnRate = burnRate.plus(totalDebtObligationsValue);

            const runway = totalBurnRate.isGreaterThan(0)
                ? currentCashBalance.dividedBy(totalBurnRate) // Use CashBalance (Liquid) not TotalAssets
                : (currentCashBalance.isGreaterThan(0) ? new BigNumber(Infinity) : new BigNumber(0));

            // Previous Month Runway Calculation (for Trend)
            let runwayChange = 0;
            if (monthsActive > 1) {
                // Previous Liquid Balance
                // Previous Liquid Balance
                // Net Flow = (Income + TransIn) - (Expense + TransOut)
                const monthNetFlow = mInc.plus(mTransIn).minus(mExp.plus(mTransOut));
                const prevCashBalance = currentCashBalance.minus(monthNetFlow);

                // Previous Burn Rate (Approximate by using same rate or strict calculation)
                // For strict alignment, we'd need to recalc burn rate as of last month.
                // Using current burn rate as proxy for stability, or recalculating:
                const prevDate = new Date(now.getFullYear(), now.getMonth(), 0); // End of last month
                const prevBurnRate6 = calculateBurnRate(t, 6, prevDate);
                let prevBurnRate = prevBurnRate6;
                if (prevBurnRate.isLessThanOrEqualTo(0)) {
                    // Fallback proxies
                    prevBurnRate = burnRate;
                }

                const prevDebtObligations = calculatePrevDebtObligations(allDebts, prevDate);
                const prevTotalBurnRate = prevBurnRate.plus(prevDebtObligations);

                const prevRunway = prevTotalBurnRate.isGreaterThan(0)
                    ? prevCashBalance.dividedBy(prevTotalBurnRate)
                    : (prevCashBalance.isGreaterThan(0) ? new BigNumber(Infinity) : new BigNumber(0));

                if (prevRunway.isFinite() && runway.isFinite()) {
                    runwayChange = runway.minus(prevRunway).toNumber();
                }
            }

            // Previous Month Runway Calculation
            // Estimation: Previous Assets = Current Assets - (Month Income - Month Expense)
            // Previous Avg Expense = (Total Expense - Month Expense) / (monthsActive - 1)

            // Month Budget % (Actual Budget Health)
            // Fetch real budgets to match InsightScreen logic
            const budgets = await getAllBudgets();
            let monthBudgetPercent = 0;

            if (budgets.length > 0) {
                // Get breakdown for current month expenses
                const currentMonthTransForBudget = getTransactionsByMonth(t, new Date());
                const specificCategoryBreakdown = getCategoryBreakdown(currentMonthTransForBudget, 'EXPENSE', 'ITEM');

                const budgetedCategorySpent = specificCategoryBreakdown
                    .filter(cat => budgets.some(b => b.category === cat.name))
                    .reduce((sum, cat) => sum.plus(cat.amount), new BigNumber(0));

                const totalBudget = budgets.reduce((sum, b) => sum.plus(b.amount), new BigNumber(0));

                monthBudgetPercent = totalBudget.isGreaterThan(0)
                    ? budgetedCategorySpent.dividedBy(totalBudget).times(100).toNumber()
                    : 0;
            } else {
                // Fallback if no budgets set
                monthBudgetPercent = 0;
            }

            // Spending Difference % (Current Pacing vs 3-Month Average at this day)
            // Logic adapted from CumulativeSpendingChart.tsx
            let spendingDifference = 0;
            const currentMonthTransForPacing = getTransactionsByMonth(t, new Date());
            const currentPacingData = getCurrentMonthCumulative(currentMonthTransForPacing);
            const avgPacingData = getCumulativeSpendingCurve(t, 3); // 3-month average

            if (currentPacingData.length > 0 && avgPacingData.length > 0) {
                const currentTotalAtDay = currentPacingData[currentPacingData.length - 1];
                const dayIndex = currentPacingData.length - 1;
                const avgAtThisDay = avgPacingData[Math.min(dayIndex, avgPacingData.length - 1)];

                if (avgAtThisDay > 0) {
                    spendingDifference = ((currentTotalAtDay - avgAtThisDay) / avgAtThisDay) * 100;
                }
            }

            // Top Holding (Dynamic by Asset Type)
            const topHoldings: Array<{ symbol: string, percent: number }> = [];

            if (portfolioMetrics.length > 0 && totalMarketValue.isGreaterThan(0)) {
                // 1. Group by Asset Type
                const holdingsByType: Record<string, typeof portfolioMetrics> = {};

                portfolioMetrics.forEach(m => {
                    const type = inv.find(i => i.symbol === m.symbol)?.type || 'STOCKS';
                    if (!holdingsByType[type]) holdingsByType[type] = [];
                    holdingsByType[type].push(m);
                });

                // 2. Calculate Total Value per Type
                const typeValues = Object.entries(holdingsByType).map(([type, metrics]) => {
                    const value = metrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));
                    return { type, value, metrics };
                });

                // 3. Sort Types by Value (Descending)
                const topTypes = typeValues.sort((a, b) => b.value.minus(a.value).toNumber()).slice(0, 2);

                // 4. For each Top Type, find the Top Holding
                topTypes.forEach(typeData => {
                    const sortedHoldings = typeData.metrics.sort((a, b) => b.totalMarketValue.minus(a.totalMarketValue).toNumber());
                    if (sortedHoldings.length > 0) {
                        const topHolding = sortedHoldings[0];
                        topHoldings.push({
                            symbol: topHolding.symbol,
                            percent: topHolding.totalMarketValue.dividedBy(totalMarketValue).times(100).toNumber()
                        });
                    }
                });
            }

            // Calculate Investment Boost & Debt Drag
            const investmentBoost = calculateInvestmentBoost(totalMarketValue, totalBurnRate);
            const debtDrag = calculateDebtDrag(currentCashBalance, burnRate, totalDebtObligationsValue);

            setFinancialHealth({
                totalAssets: assetsTotal,
                netWorth: assetsTotal.minus(totalProjectedLiability),
                totalProjectedLiability,
                runwayInMonths: runway.toNumber(),
                runwayChange: runwayChange,
                topHoldings: topHoldings,
                monthBudgetPercent: monthBudgetPercent,
                spendingDifferencePercent: spendingDifference,
                cashBalance: currentCashBalance,
                investmentBoost: investmentBoost,
                debtDrag: debtDrag
            });

        } catch (error) {
            console.error('Error loading HomeScreen data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const { isReviewVisible, checkReviewEligibility, handleRate, handleLater, handleDecline } = useReviewPrompt();

    useFocusEffect(
        useCallback(() => {
            loadData();
            checkReviewEligibility();
        }, [checkReviewEligibility])
    );

    const handleModeSave = async (newMode: Storage.HomeDisplayMode) => {
        setDisplayMode(newMode);
        setSavedDisplayMode(newMode);
        await Storage.saveHomeDisplayMode(newMode);
    };

    const handleModeSwipe = (newMode: Storage.HomeDisplayMode) => {
        setDisplayMode(newMode);
    };

    const handleInvestmentModeSave = async (newMode: Storage.InvestmentDisplayMode) => {
        setInvestmentDisplayMode(newMode);
        setSavedInvestmentDisplayMode(newMode);
        await Storage.saveHomeInvestmentDisplayMode(newMode);
    };

    const handleInvestmentModeSwipe = (newMode: Storage.InvestmentDisplayMode) => {
        setInvestmentDisplayMode(newMode);
    };

    const handleFinancialHealthModeSave = async (newMode: Storage.HomeFinancialHealthDisplayMode) => {
        setFinancialHealthDisplayMode(newMode);
        await Storage.saveHomeFinancialHealthDisplayMode(newMode);
    };

    const handleFinancialHealthModeSwipe = (newMode: Storage.HomeFinancialHealthDisplayMode) => {
        setFinancialHealthDisplayMode(newMode);
    };

    const handleDebtModeSave = async (newMode: Storage.DebtDisplayMode) => {
        setDebtDisplayMode(newMode);
        setSavedDebtDisplayMode(newMode);
        await Storage.saveHomeDebtDisplayMode(newMode);
    };

    const handleDebtModeSwipe = (newMode: Storage.DebtDisplayMode) => {
        setDebtDisplayMode(newMode);
    };

    const renderInfoModalContent = () => {
        if (infoModalMode === 'Overall') {
            return (
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        &quot;Cash Balance&quot; represents your <Text style={{ fontWeight: 'bold' }}>total available funds</Text> across all accounts.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12, textTransform: 'uppercase' }}>Formula</Text>
                        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14 }}>
                            (Income + Transfers In) - (Expense + Transfers Out)
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 14 }}>
                            This includes all historical transactions since you started using the app.
                        </Text>
                    </View>
                </View>
            );
        } else if (infoModalMode === 'Month') {
            return (
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        &quot;Monthly Balance&quot; shows the <Text style={{ fontWeight: 'bold' }}>net change</Text> in your funds for the current month.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12, textTransform: 'uppercase' }}>Formula</Text>
                        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14 }}>
                            (Income + Transfers In) - (Expense + Transfers Out)
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 14 }}>
                            Use this to see if you are net positive or negative for this month, considering all money movements.
                        </Text>
                    </View>
                </View>
            );

        } else if (infoModalMode === 'NetWorth') {
            return (
                <View>
                    <Text style={{ color: colors.text, marginBottom: 12, lineHeight: 22 }}>
                        Your <Text style={{ fontWeight: 'bold' }}>Projected Net Worth</Text> is a conservative estimate of your true financial position.
                    </Text>

                    <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: colors.text, fontWeight: '600' }}>Total Assets</Text>
                            <Text style={{ color: colors.success, fontWeight: 'bold' }}>{formatCurrencyAmount(financialHealth.totalAssets, profile?.currency || 'PHP')}</Text>
                        </View>

                        {/* Asset Breakdown */}
                        <View style={{ marginLeft: 16, marginBottom: 12, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Cash</Text>
                                <Text style={{ color: colors.text, fontSize: 12 }}>{formatCurrencyAmount(financialHealth.cashBalance, profile?.currency || 'PHP')}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Investments</Text>
                                <Text style={{ color: colors.text, fontSize: 12 }}>{formatCurrencyAmount(financialHealth.totalAssets.minus(financialHealth.cashBalance), profile?.currency || 'PHP')}</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: colors.text, fontWeight: '600' }}>Total Liabilities</Text>
                            <Text style={{ color: colors.error, fontWeight: 'bold' }}>- {formatCurrencyAmount(financialHealth.totalProjectedLiability, profile?.currency || 'PHP')}</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16, marginLeft: 8 }}>
                            Current Debt Principal + Future Projected Interest (Fees)
                        </Text>

                        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Net Worth</Text>
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                                {formatCurrencyAmount(financialHealth.netWorth, profile?.currency || 'PHP')}
                            </Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={{ color: colors.primary, fontSize: 12, flex: 1, lineHeight: 18 }}>
                            <Text style={{ fontWeight: 'bold' }}>Note:</Text> We include &quot;Possible Fees&quot; (Projected Future Interest) in your liabilities to show the true cost of your debts if paid over time.
                        </Text>
                    </View>
                </View>
            );
        } else if (infoModalMode === 'Assets') {
            return (
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12, textTransform: 'uppercase' }}>Formula</Text>
                        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14 }}>
                            Investments Value + Cash Balance
                        </Text>
                    </View>
                </View>
            );
        } else if (infoModalMode === 'Health') {
            return (
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        &quot;Financial Health&quot; metrics help you understand the sustainability of your finances.
                    </Text>
                    <View style={{ marginBottom: 15 }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Runway</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            How long your money will last based on your average monthly expenses <Text style={{ fontWeight: 'bold' }}>+ debt obligations</Text>.
                        </Text>
                    </View>
                    <View style={{ marginBottom: 15 }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Budget</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            Percentage of your monthly budget used so far.
                        </Text>
                    </View>
                </View>
            );
        } else {
            return (
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        &quot;Monthly Net&quot; shows your <Text style={{ fontWeight: 'bold' }}>pure savings</Text> from income vs. expenses this month.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12, textTransform: 'uppercase' }}>Formula</Text>
                        <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 14 }}>
                            Income - Expense
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        <Ionicons name="swap-horizontal-outline" size={20} color={colors.warning} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 14 }}>
                            <Text style={{ fontWeight: 'bold', color: colors.warning }}>Excludes Transfers.</Text> This gives you a clearer picture of your actual earnings versus spending, ignoring money moved between your own accounts.
                        </Text>
                    </View>
                </View>
            );
        }
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Settings Icon and Privacy Toggle */}
                <View style={{ marginBottom: 20, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Text style={{ color: colors.textSecondary }}>Welcome back,</Text>
                        {isLoading ? (
                            <Skeleton width={180} height={34} borderRadius={8} style={{ marginTop: 4 }} />
                        ) : (
                            <Text style={{ color: colors.text, fontSize: 28, fontWeight: 'bold' }}>{profile?.name || 'User'}</Text>
                        )}
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            onPress={togglePrivacy}
                            style={[
                                styles.iconButton,
                                { backgroundColor: colors.surface }
                            ]}
                        >
                            <Ionicons
                                name={isPrivacyEnabled ? 'eye-off' : 'eye'}
                                size={20}
                                color={colors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsSettingsModalVisible(true)}
                            style={[
                                styles.iconButton,
                                { backgroundColor: colors.surface }
                            ]}
                        >
                            <Ionicons name="options-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dynamic Card Rendering */}
                {cardOrder.map((cardId) => {
                    switch (cardId) {
                        case 'cash-flow':
                            return (
                                <HomeCashFlowCard
                                    key="cash-flow"
                                    overallIncome={overallIncome}
                                    overallExpense={overallExpense}
                                    overallTransferIn={overallTransferIn}
                                    overallTransferOut={overallTransferOut}
                                    monthIncome={monthIncome}
                                    monthExpense={monthExpense}
                                    monthTransferIn={monthTransferIn}
                                    monthTransferOut={monthTransferOut}
                                    isLoading={isLoading}
                                    isPrivacyEnabled={isPrivacyEnabled}
                                    currency={profile?.currency || 'PHP'}
                                    displayMode={displayMode}
                                    onDisplayModeChange={handleModeSwipe}
                                    onInfoPress={handleInfoPress}
                                    onNavigateToInsights={() => navigation.navigate('Insights')}
                                />
                            );

                        case 'portfolio':
                            return (
                                <HomeInvestmentCard
                                    key="portfolio"
                                    total={investmentTotal}
                                    realizedPL={realizedPL}
                                    unrealizedPL={unrealizedPL}
                                    isLoading={isLoading}
                                    isPrivacyEnabled={isPrivacyEnabled}
                                    currency={profile?.currency || 'PHP'}
                                    onPress={() => navigation.navigate('Investment')}

                                    // Monthly Data
                                    monthInvested={monthInvested}
                                    monthRealizedPL={monthRealizedPL}
                                    monthUnrealizedPL={monthUnrealizedPL}

                                    // Display Mode
                                    displayMode={investmentDisplayMode}
                                    onDisplayModeChange={handleInvestmentModeSwipe}
                                />
                            );

                        case 'debt':
                            return (
                                <HomeDebtCard
                                    key="debt"
                                    total={debtTotal}
                                    borrowed={debtBorrowed}
                                    repaid={debtRepaid}
                                    monthBorrowed={monthDebtBorrowed}
                                    monthRepaid={monthDebtRepaid}
                                    obligations={monthlyObligations}
                                    obligationsPaid={monthlyObligationsPaid}
                                    isLoading={isLoading}
                                    isPrivacyEnabled={isPrivacyEnabled}
                                    currency={profile?.currency || 'PHP'}
                                    onPress={() => {
                                        navigation.navigate('Debts');
                                    }}
                                    displayMode={debtDisplayMode}
                                    onDisplayModeChange={handleDebtModeSwipe}
                                />
                            );

                        case 'transactions':
                            return (
                                <View key="transactions" style={{ marginBottom: 20 }}>
                                    <HomeTransactionsCard
                                        recentTransactions={transactions.filter(t => t.type === 'INCOME' || t.type === 'EXPENSE').slice(0, 5)}
                                        topExpenses={getTopExpenses(transactions, 5)}
                                        currency={profile?.currency || 'PHP'}
                                        onTransactionPress={() => navigation.navigate('History')}
                                        isPrivacyEnabled={isPrivacyEnabled}
                                        isLoading={isLoading}
                                    />
                                </View>
                            );
                        case 'financial-health':
                            return (
                                <HomeFinancialHealthCard
                                    key="financial-health"
                                    totalAssets={financialHealth.totalAssets}
                                    runwayInMonths={financialHealth.runwayInMonths}
                                    runwayChange={financialHealth.runwayChange}
                                    topHoldings={financialHealth.topHoldings}
                                    monthBudgetPercent={financialHealth.monthBudgetPercent}
                                    spendingDifferencePercent={financialHealth.spendingDifferencePercent}
                                    investmentsTotal={investmentTotal}
                                    cashBalance={financialHealth.cashBalance}
                                    netWorth={financialHealth.netWorth}
                                    investmentBoost={financialHealth.investmentBoost}
                                    debtDrag={financialHealth.debtDrag}
                                    isLoading={isLoading}
                                    isPrivacyEnabled={isPrivacyEnabled}
                                    currency={profile?.currency || 'PHP'}
                                    displayMode={financialHealthDisplayMode}
                                    onDisplayModeChange={handleFinancialHealthModeSwipe}
                                    onInfoPress={handleInfoPress}
                                    onSeeDetails={() => navigation.navigate('FinancialHealth')}
                                />
                            );
                        default:
                            return null;
                    }
                })}
            </ScrollView>
            {/* Info Modal */}
            <BottomModal
                visible={isInfoModalVisible}
                onClose={() => setIsInfoModalVisible(false)}
                title="How is this calculated?"
            >
                {renderInfoModalContent()}
            </BottomModal>

            {/* Settings Modal */}
            <HomeSettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
                cardOrder={cardOrder}
                onUpdateCardOrder={async (newOrder) => {
                    setCardOrder(newOrder);
                    await Storage.saveHomeCardOrder(newOrder);
                }}
                displayMode={savedDisplayMode || 'Overall'}
                onDisplayModeChange={handleModeSave}
                investmentDisplayMode={savedInvestmentDisplayMode || 'Total'}
                onInvestmentDisplayModeChange={handleInvestmentModeSave}
                financialHealthDisplayMode={financialHealthDisplayMode}
                onFinancialHealthDisplayModeChange={handleFinancialHealthModeSave}
                debtDisplayMode={savedDebtDisplayMode || 'Total'}
                onDebtDisplayModeChange={handleDebtModeSave}
            />

            <ReviewAppModal
                isVisible={isReviewVisible}
                onRate={handleRate}
                onLater={handleLater}
                onDecline={handleDecline}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
});

export default HomeScreen;
