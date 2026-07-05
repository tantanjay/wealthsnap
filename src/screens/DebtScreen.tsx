import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Debt, Transaction, UserProfile } from '@types';
import * as Storage from '@services/core/storageService';
import { getAllDebts } from '@services/domain/debtService';
import { saveTransaction, getCachedTransactions } from '@services/domain/transactionService';
import { calculateBurnRate } from '@utils/financialMetrics';
import * as DebtMetrics from '@utils/debtMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import BottomModal from '@components/common/BottomModal';
import { generateUUID } from '@utils/uuid';
import { Button } from '@components/index';

const DebtScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('AVALANCHE');
    const [extraPayment] = useState<number>(0); // User input for extra payment simulation

    // Calculated State
    const [paidDebts, setPaidDebts] = useState<Debt[]>([]);
    const [totalDebt, setTotalDebt] = useState<BigNumber>(new BigNumber(0));
    const [debtFreeDate, setDebtFreeDate] = useState<Date | null>(null);
    const [totalInterestToPay, setTotalInterestToPay] = useState<BigNumber>(new BigNumber(0));
    const [interestLeakPerHour, setInterestLeakPerHour] = useState<BigNumber>(new BigNumber(0));
    const [lifeLostMonths, setLifeLostMonths] = useState<number>(0);
    const [payoffOrder, setPayoffOrder] = useState<Debt[]>([]);

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const calculateMetrics = useCallback((
        currentDebts: Debt[],
        currentTxns: Transaction[],
        userProfile: UserProfile | null,
        currentStrategy: 'SNOWBALL' | 'AVALANCHE',
        currentExtra: number
    ) => {
        // 1. Calculate Real Current Balances
        const allDebtsWithBalances = currentDebts.map(d => {
            const balance = DebtMetrics.calculateCurrentDebtBalance(d, currentTxns);
            // Patching initialAmount to current balance for display/sorting helpers below,
            // but keep the true original principal so FLAT-interest debts can still be
            // projected correctly (FLAT interest is based on the original amount, not this patched balance).
            return { ...d, initialAmount: balance, originalAmount: d.initialAmount };
        });

        const activeDebts = allDebtsWithBalances.filter(d => d.initialAmount.gt(0) && d.status === 'ACTIVE');
        const paidDebtsList = allDebtsWithBalances.filter(d => d.initialAmount.lte(0) || d.status === 'PAID_OFF');

        setPaidDebts(paidDebtsList);

        const debtsWithBalances = activeDebts;

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
        const { freedomDate, totalInterest } = DebtMetrics.calculateDebtPayoffStrategy(
            debtsWithBalances,
            currentExtra,
            currentStrategy
        );
        setDebtFreeDate(freedomDate);
        setTotalInterestToPay(totalInterest);

        // 5. Payoff Order
        let sorted = [...debtsWithBalances];

        // Helper to check overdue status
        const checkOverdue = (d: Debt) => {
            const nextDue = DebtMetrics.getNextDueDate(d, currentTxns);
            if (!nextDue) return false;

            // Strictly compare DATES (ignore time)
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // If nextDue is strictly BEFORE today, it's overdue.
            return nextDue < todayStart;
        };

        const checkDueSoon = (d: Debt) => {
            const nextDue = DebtMetrics.getNextDueDate(d, currentTxns);
            if (!nextDue) return false;

            const now = new Date();
            // Calculate days until due
            const timeDiff = nextDue.getTime() - now.getTime();
            const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

            return daysUntil >= 0 && daysUntil <= 3;
        };

        sorted.sort((a, b) => {
            const aOverdue = checkOverdue(a);
            const bOverdue = checkOverdue(b);

            // 1. Priority: Overdue (True comes first)
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            // 2. Priority: Due Soon (True comes first)
            const aDueSoon = checkDueSoon(a);
            const bDueSoon = checkDueSoon(b);

            if (aDueSoon && !bDueSoon) return -1;
            if (!aDueSoon && bDueSoon) return 1;

            // 3. Strategy
            if (currentStrategy === 'SNOWBALL') {
                return a.initialAmount.minus(b.initialAmount).toNumber();
            } else {
                return b.interestRate.minus(a.interestRate).toNumber();
            }
        });
        setPayoffOrder(sorted);
    }, []);

    const loadData = useCallback(async () => {
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
    }, [calculateMetrics, strategy, extraPayment]);

    const handleOpenPayment = (debt: Debt) => {
        setSelectedDebt(debt);

        // Auto-calculate Split based on Debt Type
        const currentBalance = debt.initialAmount.abs(); // In payoffOrder, this IS the current balance
        const rate = debt.interestRate.toNumber() / 100;
        const monthlyRate = rate / 12;

        let estimatedInterest = new BigNumber(0);

        if (debt.interestType === 'NONE') {
            estimatedInterest = new BigNumber(0);
        } else if (debt.interestType === 'FLAT') {
            // Need original amount for accurate FLAT calc
            const originalDebt = debts.find(d => d.id === debt.id);
            const originalAmount = originalDebt ? originalDebt.initialAmount.abs() : currentBalance;
            estimatedInterest = originalAmount.times(monthlyRate);
        } else {
            // FIXED / VARIABLE (Reducing Balance)
            estimatedInterest = currentBalance.times(monthlyRate);
        }

        const minPay = debt.minPayment;
        let estimatedPrincipal = minPay.minus(estimatedInterest);

        // Cap principal payment at remaining balance
        if (estimatedPrincipal.gt(currentBalance)) {
            estimatedPrincipal = currentBalance;
        }

        // edge case: if interest > minPayment (negative amortization scenario)
        if (estimatedPrincipal.lt(0)) estimatedPrincipal = new BigNumber(0);

        setPrincipalAmount(estimatedPrincipal.toFixed(2));
        setInterestAmount(estimatedInterest.toFixed(2));
        setFeeAmount(''); // Reset fee
        setPaymentModalVisible(true);
    };

    const handlePaymentSubmit = async () => {
        if (!selectedDebt) return;

        const pAmount = new BigNumber(principalAmount || 0);
        const iAmount = new BigNumber(interestAmount || 0);
        const fAmount = new BigNumber(feeAmount || 0);

        if ((pAmount.isNaN() || pAmount.lte(0)) && (iAmount.isNaN() || iAmount.lte(0))) {
            showAlert('Invalid Amount', 'Please enter a valid amount for Principal or Interest.');
            return;
        }

        try {
            setIsSubmitting(true);
            const now = new Date().toISOString();

            // PAYABLE (you owe): repaying reduces your cash and interest is a cost.
            // RECEIVABLE (owed to you): being repaid increases your cash and interest is income.
            const isPayable = (selectedDebt.direction || 'PAYABLE') === 'PAYABLE';

            let principalTxId = '';
            // 1. Principal Payment
            if (!pAmount.isNaN() && pAmount.gt(0)) {
                const principalTx: Transaction = {
                    id: generateUUID(),
                    type: isPayable ? 'TRANSFER_OUT' : 'TRANSFER_IN',
                    amount: pAmount.abs(),
                    category: 'Loans',
                    subCategory: 'PRINCIPAL',
                    date: now,
                    note: `Debt Payment: ${selectedDebt.name}`,
                    transferAccount: selectedDebt.type,
                    isRecurring: false,
                    debtId: selectedDebt.id,
                    createdAt: now,
                    updatedAt: now
                };
                await saveTransaction(principalTx);
                principalTxId = principalTx.id;
            }

            // 2. Interest Payment (EXPENSE if you're paying it, INCOME if you're earning it)
            if (!iAmount.isNaN() && iAmount.gt(0)) {
                const interestTx: Transaction = {
                    id: generateUUID(),
                    type: isPayable ? 'EXPENSE' : 'INCOME',
                    amount: iAmount.abs(),
                    category: 'Interest',
                    subCategory: 'INTEREST',
                    date: now,
                    transferAccount: selectedDebt.type,
                    note: `Interest Payment: ${selectedDebt.name}`,
                    isRecurring: false,
                    debtId: selectedDebt.id,
                    linkedTransactionId: principalTxId || undefined,
                    createdAt: now,
                    updatedAt: now
                };
                await saveTransaction(interestTx);
            }

            // 3. Fee/Insurance Payment (EXPENSE)
            if (!fAmount.isNaN() && fAmount.gt(0)) {
                const feeTx: Transaction = {
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: fAmount.abs(),
                    category: 'Fees',
                    subCategory: 'FEES',
                    date: now,
                    transferAccount: selectedDebt.type,
                    note: `Fee/Insurance Payment: ${selectedDebt.name}`,
                    isRecurring: false,
                    debtId: selectedDebt.id,
                    linkedTransactionId: principalTxId || undefined,
                    createdAt: now,
                    updatedAt: now
                };
                await saveTransaction(feeTx);
            }

            // Refresh data
            await loadData();
            setPaymentModalVisible(false);
        } catch (error) {
            console.error('Payment Error:', error);
            showAlert('Error', 'Failed to save payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useFocusEffect(useCallback(() => {
        loadData();
    }, [loadData]));

    // Re-calculate when strategy or extra payment changes (client-side only for speed)
    useEffect(() => {
        if (!isLoading) {
            calculateMetrics(debts, transactions, profile, strategy, extraPayment);
        }
    }, [strategy, extraPayment, calculateMetrics, debts, transactions, profile, isLoading]);

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
                            This math exposes the raw cost of your debt. It doesn&apos;t account for bank re-pricing or hidden fees. Use this to plan your attack, but verify the final numbers with your lender.
                        </Text>
                    </View>
                </View>

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
                {payoffOrder.map((debt, index) => {
                    // RETRIEVE original debt to get true initial amount
                    const originalDebt = debts.find(d => d.id === debt.id);
                    const trueOriginal = originalDebt ? originalDebt.initialAmount : debt.initialAmount;
                    const trueCurrent = debt.initialAmount; // From payoffOrder (patched)

                    // Recalculate progress correctly
                    const progressPercent = DebtMetrics.calculateDebtProgress(trueOriginal, trueCurrent);

                    // Breakdowns
                    const { principal, interest } = DebtMetrics.calculateNextPaymentBreakdown(originalDebt || debt, trueCurrent);

                    // Next Due Date
                    const nextDue = DebtMetrics.getNextDueDate(originalDebt || debt, transactions);

                    // Fix Overdue Logic: Strictly compare DATES (ignore time)
                    const isOverdue = nextDue && (() => {
                        const now = new Date();
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        // If nextDue is strictly BEFORE today (yesterday or older), it's overdue.
                        return nextDue < todayStart;
                    })();

                    const daysUntil = nextDue ? Math.ceil((nextDue.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const isDueSoon = daysUntil <= 3 && daysUntil >= 0;

                    return (
                        <View key={debt.id} style={[styles.debtItem, { backgroundColor: colors.surface, borderColor: isDueSoon || isOverdue ? (isOverdue ? colors.error : '#FF9500') : colors.border }]}>
                            {/* Header Part */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={[styles.rankCircle, { backgroundColor: index === 0 ? colors.primary : colors.border }]}>
                                        <Text style={[styles.rankText, { color: index === 0 ? '#FFF' : colors.text }]}>{index + 1}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                            {debt.interestRate.toNumber()}% APR • {debt.type.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
                                        {formatCurrencyAmount(trueCurrent, currency)}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Remaining</Text>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={{ height: 6, backgroundColor: colors.background, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: index === 0 ? colors.primary : colors.success }} />
                            </View>

                            {/* Info Row: Payment & Due Date */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Payment Breakdown */}
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}> NEXT PAYMENT</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>
                                            {formatCurrencyAmount(debt.minPayment, currency)}
                                        </Text>
                                    </View>
                                    {/* Mini Ratio Bar */}
                                    <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center' }}>
                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.success, marginRight: 4 }} />
                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginRight: 8 }}>
                                            {formatCurrencyAmount(principal, currency)}
                                        </Text>
                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.error, marginRight: 4 }} />
                                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                            {formatCurrencyAmount(interest, currency)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Due Date */}
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {(isOverdue || isDueSoon) && (
                                            <Ionicons name="alert-circle" size={14} color={isOverdue ? colors.error : '#FF9500'} style={{ marginRight: 4 }} />
                                        )}
                                        <Text style={{
                                            color: isOverdue ? colors.error : (isDueSoon ? '#FF9500' : colors.text),
                                            fontWeight: 'bold',
                                            fontSize: 12
                                        }}>
                                            {nextDue ? nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                        </Text>
                                    </View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                        {isOverdue ? 'Overdue' : (isDueSoon ? 'Due Soon' : 'Due Date')}
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.payButton, { backgroundColor: colors.primary, marginTop: 6, marginRight: 0 }]}
                                        onPress={() => handleOpenPayment(debt)}
                                    >
                                        <Text style={styles.payButtonText}>PAY NOW</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {/* 6. Paid Debts List */}
                {paidDebts.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Paid Off 🎉</Text>
                        {paidDebts.map((debt) => {
                            // Calculate Details
                            const debtTransactions = transactions.filter(t => t.debtId === debt.id);

                            // 1. Taken Date
                            const takenDate = debt.startDate ? new Date(debt.startDate) : new Date(debt.createdAt);

                            // 2. Paid Date (Last Transaction Date)
                            const lastPayment = debtTransactions
                                .filter(t => t.type === 'TRANSFER_OUT' || t.type === 'EXPENSE')
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            const paidDate = lastPayment ? new Date(lastPayment.date) : new Date();

                            // 3. Original Amount (Retrieve from original list as 'debt' here has patched balance)
                            const originalDebt = debts.find(d => d.id === debt.id);
                            const originalAmount = originalDebt ? originalDebt.initialAmount : new BigNumber(0);

                            // 4. Interest Paid
                            const totalInterestPaid = debtTransactions
                                .filter(t => t.type === 'EXPENSE' && (t.category === 'Interest' || t.subCategory === 'INTEREST'))
                                .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

                            return (
                                <View key={debt.id} style={[styles.debtItem, { backgroundColor: colors.surface, borderColor: colors.success, opacity: 0.9 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={[styles.rankCircle, { backgroundColor: colors.success }]}>
                                                <Ionicons name="checkmark" size={16} color="#FFF" />
                                            </View>
                                            <View>
                                                <Text style={[styles.debtName, { color: colors.text, textDecorationLine: 'line-through' }]}>{debt.name}</Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                                                    {debt.type.replace('_', ' ')}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Watermark / Badge */}
                                        <View style={{
                                            borderWidth: 2,
                                            borderColor: colors.success,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 4,
                                            transform: [{ rotate: '-10deg' }],
                                            marginLeft: 8
                                        }}>
                                            <Text style={{ color: colors.success, fontWeight: 'bold', fontSize: 12 }}>PAID</Text>
                                        </View>
                                    </View>

                                    {/* Details Row */}
                                    <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, justifyContent: 'space-between' }}>
                                        <View>
                                            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Timeline</Text>
                                            <Text style={{ fontSize: 12, color: colors.text }}>
                                                {takenDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                {' → '}
                                                {paidDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 }}>Total Cost</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600', marginRight: 6 }}>
                                                    {formatCurrencyAmount(originalAmount, currency)}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: colors.error, fontWeight: '600' }}>
                                                    {formatCurrencyAmount(totalInterestPaid, currency)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* Payment Modal */}
                <BottomModal
                    visible={paymentModalVisible}
                    onClose={() => setPaymentModalVisible(false)}
                    title="Record Payment"
                    subtitle={selectedDebt ? `For ${selectedDebt.name}` : ''}
                >
                    <ScrollView>
                        <View style={{ gap: 16 }}>
                            <View>
                                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>Principal Payment</Text>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12 }}>
                                    Reduces your debt balance. (Type: Transfer Out)
                                </Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={principalAmount}
                                    onChangeText={setPrincipalAmount}
                                />
                            </View>

                            <View>
                                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>Interest Payment</Text>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12 }}>
                                    Cost of borrowing. Does not reduce balance. (Type: Expense)
                                </Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={interestAmount}
                                    onChangeText={setInterestAmount}
                                />
                            </View>

                            <View>
                                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>Fee / Insurance Payment</Text>
                                <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12 }}>
                                    Expense for mandatory add-ons like MRI (Mortgage Redemption Insurance) or Fire Insurance.
                                </Text>
                                <View style={{
                                    backgroundColor: colors.background,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    padding: 12,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: 12
                                }}>
                                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1, fontStyle: 'italic' }}>
                                        Fees usually don&apos;t reduce your principal balance but are required for protection.
                                    </Text>
                                </View>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={feeAmount}
                                    onChangeText={setFeeAmount}
                                />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Total Payment</Text>
                                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>
                                    {formatCurrencyAmount(new BigNumber(principalAmount || 0).plus(interestAmount || 0).plus(feeAmount || 0), currency)}
                                </Text>
                            </View>

                            {/* Info Box for Adjusted Payment */}
                            {selectedDebt && (
                                (() => {
                                    const currentTotal = new BigNumber(principalAmount || 0).plus(interestAmount || 0).plus(feeAmount || 0);
                                    const minPay = selectedDebt.minPayment;
                                    // Check if significantly different from Min Payment (tolerance 0.01)
                                    const isDifferent = currentTotal.minus(minPay).abs().gt(0.01);

                                    if (isDifferent) {
                                        return (
                                            <View style={{
                                                backgroundColor: colors.background,
                                                // subtle border or highlight
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                padding: 12,
                                                borderRadius: 8,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                marginTop: 4
                                            }}>
                                                <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                                <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                                                    {currentTotal.lt(minPay)
                                                        ? "Payment adjusted to clear likely remaining balance."
                                                        : "This amount differs from your standard minimum payment."}
                                                </Text>
                                            </View>
                                        );
                                    }
                                    return null;
                                })()
                            )}

                            <Button
                                title={isSubmitting ? "Recording..." : "Confirm Payment"}
                                onPress={handlePaymentSubmit}
                                loading={isSubmitting}
                                style={{ marginTop: 8 }}
                            />
                        </View>
                    </ScrollView>
                </BottomModal>

            </ScrollView >
        </ScreenWrapper >
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
    disclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    disclaimerText: {
        fontSize: 11,
        fontStyle: 'italic',
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
        flexDirection: 'column',
        alignItems: 'stretch',
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
    payButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 12,
    },
    payButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
});

export default DebtScreen;
