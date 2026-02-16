import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Debt, Transaction, UserProfile } from '@types';
import * as Storage from '@services/core/storageService';
import { getAllDebts } from '@services/domain/debtService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { calculateBurnRate } from '@utils/financialMetrics';
import { calculateDebtPayoffStrategy, calculateTotalDebtObligations, calculateCurrentDebtBalance } from '@utils/debtMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';

const { width } = Dimensions.get('window');

const DebtScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('AVALANCHE');
    const [extraPayment, setExtraPayment] = useState<number>(0); // User input for extra payment simulation

    // Calculated State
    const [totalDebt, setTotalDebt] = useState<BigNumber>(new BigNumber(0));
    const [debtFreeDate, setDebtFreeDate] = useState<Date | null>(null);
    const [totalInterestToPay, setTotalInterestToPay] = useState<BigNumber>(new BigNumber(0));
    const [interestLeakPerHour, setInterestLeakPerHour] = useState<BigNumber>(new BigNumber(0));
    const [lifeLostMonths, setLifeLostMonths] = useState<number>(0);
    const [payoffOrder, setPayoffOrder] = useState<Debt[]>([]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [p, d, t] = await Promise.all([
                Storage.getUserProfile(),
                getAllDebts(),
                getCachedTransactions()
            ]);
            setProfile(p);
            setDebts(d);
            setTransactions(t);
            calculateMetrics(d, t, p, strategy, extraPayment);
        } catch (error) {
            console.error('Failed to load debt data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateMetrics = (
        currentDebts: Debt[],
        currentTxns: Transaction[],
        userProfile: UserProfile | null,
        currentStrategy: 'SNOWBALL' | 'AVALANCHE',
        currentExtra: number
    ) => {
        const activeDebts = currentDebts.filter(d => d.status === 'ACTIVE');

        // 1. Calculate Real Current Balances
        const debtsWithBalances = activeDebts.map(d => {
            const balance = calculateCurrentDebtBalance(d, currentTxns);
            return { ...d, initialAmount: balance }; // Patching initialAmount for the helper
        }).filter(d => d.initialAmount.gt(0));

        const totalBalance = debtsWithBalances.reduce((sum, d) => sum.plus(d.initialAmount), new BigNumber(0));
        setTotalDebt(totalBalance);

        // 2. Interest Leak (Hourly)
        let yearlyInterest = new BigNumber(0);
        debtsWithBalances.forEach(d => {
            const rate = d.interestRate.div(100);
            yearlyInterest = yearlyInterest.plus(d.initialAmount.times(rate));
        });
        // Hourly = Yearly / 365 / 24
        const hourlyLeak = yearlyInterest.div(365).div(24);
        setInterestLeakPerHour(hourlyLeak);

        // 3. Debt vs Life (Runway)
        const burnRate = calculateBurnRate(currentTxns, 6);
        // If burn rate is 0, avoid division by zero
        if (burnRate.gt(0)) {
            const monthsLost = totalBalance.div(burnRate).toNumber();
            setLifeLostMonths(monthsLost);
        } else {
            setLifeLostMonths(0);
        }

        // 4. Payoff Strategy
        const { freedomDate, totalInterest, payoffDates } = calculateDebtPayoffStrategy(
            debtsWithBalances,
            currentExtra,
            currentStrategy
        );
        setDebtFreeDate(freedomDate);
        setTotalInterestToPay(totalInterest);

        // 5. Payoff Order
        let sorted = [...debtsWithBalances];
        if (currentStrategy === 'SNOWBALL') {
            sorted.sort((a, b) => a.initialAmount.minus(b.initialAmount).toNumber());
        } else {
            sorted.sort((a, b) => b.interestRate.minus(a.interestRate).toNumber());
        }
        setPayoffOrder(sorted);
    };

    useFocusEffect(useCallback(() => {
        loadData();
    }, []));

    // Re-calculate when strategy or extra payment changes (client-side only for speed)
    useEffect(() => {
        if (!isLoading) {
            calculateMetrics(debts, transactions, profile, strategy, extraPayment);
        }
    }, [strategy, extraPayment]);

    const currency = profile?.currency || 'PHP';

    return (
        <ScreenWrapper scrollable={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Debt Strategy</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* 1. The Clock (Debt-Free Date) */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>ESTIMATED DEBT-FREE DATE</Text>
                    <View style={styles.row}>
                        <Ionicons name="calendar-outline" size={32} color={colors.primary} style={{ marginRight: 10 }} />
                        <View>
                            <Text style={[styles.hugeText, { color: colors.text }]}>
                                {debtFreeDate ? debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '---'}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                {debtFreeDate ? `${Math.ceil((debtFreeDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months to go` : 'Calculated based on min payments'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 2. Interest Leak "Dripping Tap" */}
                <View style={[styles.warningCard]}>
                    <View style={styles.leakContainer}>
                        <Ionicons name="water" size={28} color="#FF3B30" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }}>Interest Leak</Text>
                            <Text style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
                                You are losing <Text style={{ fontWeight: 'bold' }}>{formatCurrencyAmount(interestLeakPerHour, currency)}</Text> every single hour to interest.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 3. Debt vs Life */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 12 }]}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Total Debt</Text>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                                {formatCurrencyAmount(totalDebt, currency)}
                            </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Time Cost</Text>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                                {lifeLostMonths.toFixed(1)} Months
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>of self-sustain borrowed</Text>
                        </View>
                    </View>
                </View>

                {/* 4. Strategy Toggle */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12 }]}>PAYOFF STRATEGY</Text>

                    <View style={[styles.toggleContainer, { backgroundColor: colors.background }]}>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                strategy === 'AVALANCHE' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setStrategy('AVALANCHE')}
                        >
                            <Text style={[
                                styles.toggleText,
                                strategy === 'AVALANCHE' ? { color: '#FFF' } : { color: colors.textSecondary }
                            ]}>Avalanche (Fastest)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton,
                                strategy === 'SNOWBALL' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setStrategy('SNOWBALL')}
                        >
                            <Text style={[
                                styles.toggleText,
                                strategy === 'SNOWBALL' ? { color: '#FFF' } : { color: colors.textSecondary }
                            ]}>Snowball (Easiest)</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12, fontStyle: 'italic' }}>
                        {strategy === 'AVALANCHE'
                            ? "Target highest interest rates first. Mathematically superior."
                            : "Target smallest balances first. Psychologically rewarding."}
                    </Text>

                    <View style={{ marginTop: 16, backgroundColor: colors.background, padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 14 }}>
                            Total Interest to Pay: <Text style={{ fontWeight: 'bold' }}>{formatCurrencyAmount(totalInterestToPay, currency)}</Text>
                        </Text>
                    </View>
                </View>

                {/* 5. Priority List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority Payoff Order</Text>
                {payoffOrder.map((debt, index) => (
                    <View key={debt.id} style={[styles.debtItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.rankCircle}>
                            <Text style={styles.rankText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {formatCurrencyAmount(debt.initialAmount, currency)} • {debt.interestRate.toNumber()}% APR
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                {formatCurrencyAmount(debt.minPayment, currency)}/mo
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Min Payment</Text>
                        </View>
                    </View>
                ))}

            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
    },
    content: {
        paddingBottom: 100,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    warningCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#FFE5E5',
        borderWidth: 1,
        borderColor: '#FFCDC2'
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    hugeText: {
        fontSize: 26,
        fontWeight: '800',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        marginLeft: 4,
    },
    debtItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    rankCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rankText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    debtName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
});

export default DebtScreen;
