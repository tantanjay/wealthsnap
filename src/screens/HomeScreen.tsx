import React, { useCallback, useState } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components';
import { processRecurrenceRules } from '../services/recurrenceService';
import { getUserProfile, getCachedTransactions, getCachedInvestments, saveHomeDisplayMode, getHomeDisplayMode } from '../services/storageService';
import { UserProfile, Transaction, Investment } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { usePrivacy } from '../context/PrivacyContext';

import { formatCurrencyAmount } from '../utils/currencyUtils';
import { getTopTransactions } from '../utils/financialMetrics';
import HomeTransactionsCard from '../components/home/HomeTransactionsCard';
import { Skeleton } from '../components/common/Skeleton';
import BottomModal from '../components/common/BottomModal';



const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Calculated values for both modes
    const [overallIncome, setOverallIncome] = useState(0);
    const [overallExpense, setOverallExpense] = useState(0);
    const [monthIncome, setMonthIncome] = useState(0);
    const [monthExpense, setMonthExpense] = useState(0);

    const [investmentTotal, setInvestmentTotal] = useState(0);
    const [debtTotal, setDebtTotal] = useState(0); // Placeholder for Debt
    const [isLoading, setIsLoading] = useState(true);

    // Settings Modal State
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [displayMode, setDisplayMode] = useState<'Overall' | 'Month'>('Overall');
    const [cardWidth, setCardWidth] = useState(0);
    const scrollRef = React.useRef<ScrollView>(null);
    const screenWidth = React.useRef(0);

    const loadData = async () => {
        setDebtTotal(0); // to remove lint
        setIsLoading(true);

        // Load persisted display mode
        const savedMode = await getHomeDisplayMode();
        if (savedMode) {
            setDisplayMode(savedMode);
        }

        // Process recurring rules first to ensure we fetch the latest transactions
        await processRecurrenceRules();

        const p = await getUserProfile();
        const t = await getCachedTransactions();
        const inv = await getCachedInvestments();

        setProfile(p);
        setTransactions(t);

        // Calculate both Overall and Month totals once
        let oInc = 0, oExp = 0, mInc = 0, mExp = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        t.forEach((tx: Transaction) => {
            // Overall
            if (tx.type === 'INCOME') oInc += tx.amount;
            else oExp += tx.amount;

            // Month
            const tDate = new Date(tx.date);
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (tx.type === 'INCOME') mInc += tx.amount;
                else mExp += tx.amount;
            }
        });

        setOverallIncome(oInc);
        setOverallExpense(oExp);
        setMonthIncome(mInc);
        setMonthExpense(mExp);


        const totalInv = inv.reduce((sum: number, item: Investment) => sum + (item.quantity * (item.currentPrice || item.averageBuyPrice)), 0);
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
            const pageIndex = displayMode === 'Overall' ? 0 : 1;
            scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
        }
    }, [displayMode, cardWidth]);

    const handleModeChange = async (newMode: 'Overall' | 'Month') => {
        setDisplayMode(newMode);
        await saveHomeDisplayMode(newMode);
    };

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;

        // Simple debouncing/snap detection could be done, but momentumScrollEnd is safer for page change
    };

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        const newMode = pageIndex === 0 ? 'Overall' : 'Month';
        if (newMode !== displayMode) {
            handleModeChange(newMode);
        }
    };


    const formatCurrency = (amount: number) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, profile?.currency || 'USD');
    };

    // Determine values to show based on current displayMode (for other parts of UI if needed, though we map directly in ScrollView now)
    // Actually we render both cards in ScrollView.

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
                            {/* Card 1: Overall */}
                            <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 8 }}>Total Balance</Text>
                                            {/* Dots for pagination indication */}
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                        {isLoading ? (
                                            <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            formatCurrency(overallIncome - overallExpense)
                                        )}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Income</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(overallIncome)}`}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Expense</Text>
                                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(overallExpense)}`}</Text>
                                        </View>
                                    </View>
                                    {/* Insight Button */}
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
                                </Card>
                            </View>

                            {/* Card 2: Current Month */}
                            <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 8 }}>Monthly Balance</Text>
                                            {/* Dots for pagination indication */}
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white, opacity: 0.3 }} />
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                        {isLoading ? (
                                            <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                        ) : (
                                            formatCurrency(monthIncome - monthExpense)
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
                    </Card>
                </View>

                {/* Top Transactions */}
                {/* Transactions Card with Tabs */}
                <View style={{ marginBottom: 20 }}>
                    <HomeTransactionsCard
                        recentTransactions={transactions.slice(0, 5)}
                        topTransactions={getTopTransactions(transactions.filter(t => t.type === 'EXPENSE'), 5)}
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
                                padding: 16
                            }}
                            onPress={() => handleModeChange('Month')}
                        >
                            <Text style={{ color: colors.text, fontSize: 16 }}>This Month</Text>
                            {displayMode === 'Month' && (
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
            </BottomModal>
        </ScreenWrapper>
    );
};
export default HomeScreen;
