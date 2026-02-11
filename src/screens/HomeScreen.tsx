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
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { UserProfile, Transaction, Investment } from '@types';
import { getTopExpenses } from '@utils/financialMetrics';
import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import * as Storage from '@services/core/storageService';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';
import { getLatestPrices } from '@services/domain/priceHistoryService';
import { ReviewAppModal } from '@components/common/ReviewAppModal';
import { useReviewPrompt } from '@hooks/useReviewPrompt';

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
    const [isLoading, setIsLoading] = useState(true);

    // Settings Modal State
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

    // Active Display States (Swipeable)
    const [displayMode, setDisplayMode] = useState<Storage.HomeDisplayMode>('Overall');
    const [investmentDisplayMode, setInvestmentDisplayMode] = useState<Storage.InvestmentDisplayMode>('Total');

    // Saved Configuration States (Settings)
    const [savedDisplayMode, setSavedDisplayMode] = useState<Storage.HomeDisplayMode>('Overall');
    const [savedInvestmentDisplayMode, setSavedInvestmentDisplayMode] = useState<Storage.InvestmentDisplayMode>('Total');

    const [cardOrder, setCardOrder] = useState<string[]>(['cash-flow', 'portfolio', 'debt', 'transactions']);

    // Info Modal State
    const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
    const [infoModalMode, setInfoModalMode] = useState<'Overall' | 'Month' | 'MonthIncomeExpense'>('Overall');

    const handleInfoPress = (mode: 'Overall' | 'Month' | 'MonthIncomeExpense') => {
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

            const savedInvestmentMode = await Storage.getHomeInvestmentDisplayMode();
            if (savedInvestmentMode) {
                setInvestmentDisplayMode(savedInvestmentMode);
                setSavedInvestmentDisplayMode(savedInvestmentMode);
            }

            // Load persisted card order
            const savedOrder = await Storage.getHomeCardOrder();
            if (savedOrder && savedOrder.length > 0) {
                setCardOrder(savedOrder);
            }

            // Process recurring rules first to ensure we fetch the latest transactions
            await processRecurrenceRules();

            const p = await Storage.getUserProfile();
            const t = await getCachedTransactions();
            const inv = await getCachedInvestments();

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
            // 1. Group investments to find symbols and group data
            const groupedInvestments = inv.reduce((acc, item) => {
                if (!acc[item.symbol]) acc[item.symbol] = [];
                acc[item.symbol].push(item);
                return acc;
            }, {} as Record<string, Investment[]>);

            const uniqueSymbols = Object.keys(groupedInvestments);

            // 2. Fetch latest prices from Price History
            const priceHistoryMap = await getLatestPrices(uniqueSymbols);

            // 3. Build a comprehensive "Current Price Map"
            // Priority: Price History > Latest Transaction Price > 0
            const currentPriceMap: Record<string, BigNumber> = {};

            uniqueSymbols.forEach(symbol => {
                if (priceHistoryMap[symbol]) {
                    currentPriceMap[symbol] = priceHistoryMap[symbol].price;
                } else {
                    // Fallback: Find latest transaction for this symbol from the pre-grouped map
                    const symbolTxns = groupedInvestments[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (symbolTxns.length > 0) {
                        currentPriceMap[symbol] = symbolTxns[0].price;
                    } else {
                        currentPriceMap[symbol] = new BigNumber(0);
                    }
                }
            });

            // 4. Calculate Portfolio Metrics (Unrealized P/L, Market Value)
            const portfolioMetrics = getAllPortfolioMetrics(inv, currentPriceMap);

            const totalMarketValue = portfolioMetrics.reduce((sum, m) => sum.plus(m.totalMarketValue), new BigNumber(0));
            const totalUnrealizedPL = portfolioMetrics.reduce((sum, m) => sum.plus(m.unrealizedPL), new BigNumber(0));

            // 5. Calculate Realized P/L from Transactions (CAPITAL_GAIN/LOSS)
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

            // 6. Calculate Monthly Investment Metrics
            // Monthly Invested: Sum of BUY amounts in current month
            let mInvested = new BigNumber(0);
            let mUnrealizedPL = new BigNumber(0);

            // Helper maps for monthly calculations
            const monthlyBuys: Record<string, { qty: BigNumber, cost: BigNumber }> = {};
            const currentQuantities: Record<string, BigNumber> = {};

            // Populate current quantities from portfolio metrics
            portfolioMetrics.forEach(m => {
                currentQuantities[m.symbol] = m.currentQuantity;
            });

            inv.forEach(item => {
                const isMonth = new Date(item.date).getMonth() === currentMonth && new Date(item.date).getFullYear() === currentYear;

                if (isMonth && item.action === 'BUY') {
                    // Invested Amount (Cost Basis) - Activity Metric (shows how much you poured in this month)
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
                                    isLoading={isLoading}
                                    isPrivacyEnabled={isPrivacyEnabled}
                                    currency={profile?.currency || 'PHP'}
                                    onPress={() => {
                                        // navigation.navigate('Debt')
                                    }}
                                />
                            );

                        case 'transactions':
                            return (
                                <View key="transactions" style={{ marginBottom: 20 }}>
                                    <HomeTransactionsCard
                                        recentTransactions={transactions.slice(0, 5)}
                                        topExpenses={getTopExpenses(transactions, 5)}
                                        currency={profile?.currency || 'PHP'}
                                        onTransactionPress={() => navigation.navigate('History')}
                                        isPrivacyEnabled={isPrivacyEnabled}
                                        isLoading={isLoading}
                                    />
                                </View>
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
