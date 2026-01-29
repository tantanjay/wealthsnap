import React, { useCallback, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import HomeTransactionsCard from '@components/home/HomeTransactionsCard';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { UserProfile, Transaction, Investment } from '@types';
import { getTopExpenses } from '@utils/financialMetrics';
import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import * as Storage from '@services/core/storageService';

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
    const [debtTotal, setDebtTotal] = useState(new BigNumber(0));
    const [isLoading, setIsLoading] = useState(true);

    // Settings Modal State
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [displayMode, setDisplayMode] = useState<Storage.HomeDisplayMode>('Overall');
    const [cardWidth, setCardWidth] = useState(0);
    const scrollRef = React.useRef<ScrollView>(null);
    const screenWidth = React.useRef(0);

    const loadData = async () => {
        setDebtTotal(new BigNumber(0)); // to remove lint
        setIsLoading(true);

        // Load persisted display mode
        const savedMode = await Storage.getHomeDisplayMode();
        if (savedMode) {
            setDisplayMode(savedMode);
        }

        // Process recurring rules first to ensure we fetch the latest transactions
        await processRecurrenceRules();

        const p = await Storage.getUserProfile();
        const t = await Storage.getCachedTransactions();
        const inv = await Storage.getCachedInvestments();

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
                oInc = oInc.plus(val);
                if (isMonth) mInc = mInc.plus(val);
            } else if (tx.type === 'EXPENSE') {
                oExp = oExp.plus(val);
                if (isMonth) mExp = mExp.plus(val);
            } else if (tx.type === 'TRANSFER') {
                if (!tx.transferDest) {
                    oTransIn = oTransIn.plus(val);
                    if (isMonth) mTransIn = mTransIn.plus(val);
                } else {
                    oTransOut = oTransOut.plus(val);
                    if (isMonth) mTransOut = mTransOut.plus(val);
                }
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

        const totalInv = inv.reduce((sum: BigNumber, item: Investment) => {
            const price = new BigNumber(item.currentPrice || item.averageBuyPrice || 0);
            const positionValue = new BigNumber(item.quantity || 0).times(price);
            return sum.plus(positionValue);
        }, new BigNumber(0));

        setInvestmentTotal(totalInv);
        setIsLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Sync ScrollView with displayMode change (e.g. from Modal)
    React.useEffect(() => {
        if (cardWidth > 0 && scrollRef.current) {
            if (cardWidth > 0 && scrollRef.current) {
                let pageIndex = 0;
                if (displayMode === 'Month') pageIndex = 1;
                else if (displayMode === 'MonthIncomeExpense') pageIndex = 2;
                scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
            }
        }
    }, [displayMode, cardWidth]);

    const handleModeChange = async (newMode: Storage.HomeDisplayMode) => {
        setDisplayMode(newMode);
        await Storage.saveHomeDisplayMode(newMode);
    };

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        const newMode: Storage.HomeDisplayMode = pageIndex === 0 ? 'Overall' : pageIndex === 1 ? 'Month' : 'MonthIncomeExpense';
        if (newMode !== displayMode) {
            handleModeChange(newMode);
        }
    };

    const formatCurrency = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, profile?.currency || 'PHP');
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Settings Icon and Privacy Toggle */}
                <View style={{ marginBottom: 20, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: colors.textSecondary }}>Welcome back,</Text>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>{profile?.name || 'User'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={togglePrivacy} style={{ padding: 8 }}>
                            <Ionicons
                                name={isPrivacyEnabled ? 'eye-off' : 'eye'}
                                size={24}
                                color={colors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsSettingsModalVisible(true)}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="settings-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Expense/Income Section */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                            Expense & Income
                        </Text>
                    </View>

                    {/* Horizontal Scrollable Balance Card */}
                    <View>
                        <ScrollView
                            ref={scrollRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleMomentumScrollEnd}
                            onLayout={(e) => {
                                const width = e.nativeEvent.layout.width;
                                if (Math.abs(width - cardWidth) > 1) {
                                    setCardWidth(width);
                                    screenWidth.current = width; // Keep ref for immediate access in other functions if needed
                                    // Initial scroll if needed
                                    if (displayMode === 'Month' && width > 0) {
                                        scrollRef.current?.scrollTo({ x: width, animated: false });
                                    }
                                }
                            }}
                            scrollEventThrottle={16}
                        >
                            {/* Card 1: Total Assets (Overall with Transfers) */}
                            <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 8 }}>Total Assets</Text>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                            </View>
                                        </View>
                                        <Ionicons name="wallet-outline" size={24} color={colors.white} />
                                    </View>
                                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                        {isLoading ? (
                                            <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            formatCurrency(
                                                overallIncome.plus(overallTransferIn)
                                                    .minus(overallExpense.plus(overallTransferOut))
                                            )
                                        )}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money In</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(overallIncome.plus(overallTransferIn))}`}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money Out</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(overallExpense.plus(overallTransferOut))}`}</Text>
                                        </View>
                                    </View>
                                    {/* Insight Button */}
                                    {isLoading ? (
                                        <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('Insights')}
                                            style={{
                                                marginTop: 15,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                paddingVertical: 10,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Ionicons name="analytics" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                            <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                        </TouchableOpacity>
                                    )}
                                </Card>
                            </View>

                            {/* Card 2: Monthly Balance (Month with Transfers) */}
                            <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 8 }}>Monthly Balance</Text>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                            </View>
                                        </View>
                                        <Ionicons name="calendar-outline" size={24} color={colors.white} />
                                    </View>
                                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                        {isLoading ? (
                                            <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            formatCurrency(
                                                monthIncome.plus(monthTransferIn)
                                                    .minus(monthExpense.plus(monthTransferOut))
                                            )
                                        )}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money In</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(monthIncome.plus(monthTransferIn))}`}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money Out</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(monthExpense.plus(monthTransferOut))}`}</Text>
                                        </View>
                                    </View>
                                    {/* Insight Button */}
                                    {isLoading ? (
                                        <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('Insights')}
                                            style={{
                                                marginTop: 15,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                paddingVertical: 10,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Ionicons name="analytics" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                            <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                        </TouchableOpacity>
                                    )}
                                </Card>
                            </View>

                            {/* Card 3: Monthly Income & Expense (Pure, no Transfers) */}
                            <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 8 }}>Monthly Income & Expense</Text>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
                                            </View>
                                        </View>
                                        <Ionicons name="swap-vertical" size={24} color={colors.white} />
                                    </View>
                                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                        {isLoading ? (
                                            <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            formatCurrency(monthIncome.minus(monthExpense))
                                        )}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Income</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(monthIncome)}`}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Expense</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(monthExpense)}`}</Text>
                                        </View>
                                    </View>
                                    {/* Insight Button */}
                                    {isLoading ? (
                                        <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('Insights')}
                                            style={{
                                                marginTop: 15,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                paddingVertical: 10,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Ionicons name="analytics" size={20} color={colors.white} style={{ marginRight: 8 }} />
                                            <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                        </TouchableOpacity>
                                    )}
                                </Card>
                            </View>

                        </ScrollView>
                    </View>
                </View>

                {/* Investment Section Placeholder */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Investments</Text>
                    <Card style={{ backgroundColor: colors.secondary, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Portfolio</Text>
                            <Ionicons name="trending-up" size={24} color={colors.white} />
                        </View>
                        <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                            {isLoading ? (
                                <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            ) : (
                                isPrivacyEnabled ? '****' : formatCurrencyAmount(investmentTotal, profile?.currency || 'USD')
                            )}
                        </Text>
                        {isLoading ? (
                            <Skeleton width="100%" height={36} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        ) : (
                            <TouchableOpacity
                                style={{
                                    marginTop: 15,
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingVertical: 8,
                                    alignItems: 'center',
                                    borderRadius: 8
                                }}
                                onPress={() => navigation.navigate('Investment')}
                            >
                                <Text style={{ color: colors.white, fontWeight: '600' }}>View Portfolio</Text>
                            </TouchableOpacity>
                        )}
                    </Card>
                </View>

                {/* Debt Section Placeholder */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Debts & Liabilities</Text>
                    <Card style={{ backgroundColor: colors.error, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Debt</Text>
                            <Ionicons name="card" size={24} color={colors.white} />
                        </View>
                        <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                            {isLoading ? (
                                <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            ) : (
                                isPrivacyEnabled ? '****' : formatCurrencyAmount(debtTotal, profile?.currency || 'USD')
                            )}
                        </Text>
                        {isLoading ? (
                            <Skeleton width="100%" height={36} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        ) : (
                            <TouchableOpacity
                                style={{
                                    marginTop: 15,
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    paddingVertical: 8,
                                    alignItems: 'center',
                                    borderRadius: 8
                                }}
                                onPress={() => {
                                    // navigation.navigate('Debt') // Placeholder for future screen
                                }}
                            >
                                <Text style={{ color: colors.white, fontWeight: '600' }}>View Debts</Text>
                            </TouchableOpacity>
                        )}
                    </Card>
                </View>

                {/* Top Transactions */}
                {/* Transactions Card with Tabs */}
                <View style={{ marginBottom: 20 }}>
                    <HomeTransactionsCard
                        recentTransactions={transactions.slice(0, 5)}
                        topExpenses={getTopExpenses(transactions, 5)}
                        currency={profile?.currency || 'USD'}
                        onTransactionPress={() => navigation.navigate('History')}
                        isPrivacyEnabled={isPrivacyEnabled}
                        isLoading={isLoading}
                    />
                </View>
            </ScrollView>
            {/* Settings Modal */}
            <BottomModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
                title="Home Settings"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ paddingTop: 10 }}>
                        {/* Expense & Income Display Section */}
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Expense & Income Display
                        </Text>

                        <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border
                                }}
                                onPress={() => handleModeChange('Overall')}
                            >
                                <Text style={{ color: colors.text, fontSize: 16 }}>Overall</Text>
                                {displayMode === 'Overall' && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border
                                }}
                                onPress={() => handleModeChange('Month')}
                            >
                                <Text style={{ color: colors.text, fontSize: 16 }}>This Month</Text>
                                {displayMode === 'Month' && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 16
                                }}
                                onPress={() => handleModeChange('MonthIncomeExpense')}
                            >
                                <Text style={{ color: colors.text, fontSize: 16 }}>Monthly Income & Expense</Text>
                                {displayMode === 'MonthIncomeExpense' && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        </View>


                        {/* Investment Settings Placeholder */}
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Investments
                        </Text>
                        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, opacity: 0.6 }}>
                            <Text style={{ color: colors.text, fontStyle: 'italic' }}>No options available yet</Text>
                        </View>

                        {/* Debt Settings Placeholder */}
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Debts & Liabilities
                        </Text>
                        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, opacity: 0.6 }}>
                            <Text style={{ color: colors.text, fontStyle: 'italic' }}>No options available yet</Text>
                        </View>
                    </View>
                </ScrollView>
            </BottomModal>
        </ScreenWrapper>
    );
};
export default HomeScreen;
