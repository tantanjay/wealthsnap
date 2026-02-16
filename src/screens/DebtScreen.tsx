import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Debt, Transaction, UserProfile } from '@types';
import * as Storage from '@services/core/storageService';
import { getAllDebts } from '@services/domain/debtService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { calculateBurnRate } from '@utils/financialMetrics';
import { calculateDebtPayoffStrategy, calculateCurrentDebtBalance } from '@utils/debtMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import BottomModal from '@components/common/BottomModal';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { saveTransaction } from '@services/domain/transactionService';
import { generateUUID } from '@utils/uuid';
import { Button } from '@components/index';

const { width } = Dimensions.get('window');

const DebtScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
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

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setPaymentModalVisible(true);
    };

    const handlePaymentSubmit = async () => {
        if (!selectedDebt) return;

        const pAmount = parseFloat(principalAmount);
        const iAmount = parseFloat(interestAmount);

        if ((isNaN(pAmount) || pAmount <= 0) && (isNaN(iAmount) || iAmount <= 0)) {
            showAlert('Invalid Amount', 'Please enter a valid amount for Principal or Interest.');
            return;
        }

        try {
            setIsSubmitting(true);
            const now = new Date().toISOString();

            let principalTxId = '';
            // 1. Principal Payment (TRANSFER_OUT)
            if (!isNaN(pAmount) && pAmount > 0) {
                const principalTx: Transaction = {
                    id: generateUUID(),
                    type: 'TRANSFER_OUT',
                    amount: new BigNumber(Math.abs(pAmount)),
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

            // 2. Interest Payment (EXPENSE)
            if (!isNaN(iAmount) && iAmount > 0) {
                const interestTx: Transaction = {
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(Math.abs(iAmount)),
                    category: 'Fees',
                    subCategory: 'INTEREST',
                    date: now,
                    transferAccount: selectedDebt.type,
                    note: `Interest Payment: ${selectedDebt.name}`,
                    isRecurring: false,
                    debtId: selectedDebt.id,
                    linkedTransactionId: principalTxId,
                    createdAt: now,
                    updatedAt: now
                };
                await saveTransaction(interestTx);
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
                        <TouchableOpacity
                            style={[styles.payButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleOpenPayment(debt)}
                        >
                            <Text style={styles.payButtonText}>Pay</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Payment Modal */}
                <BottomModal
                    visible={paymentModalVisible}
                    onClose={() => setPaymentModalVisible(false)}
                    title="Record Payment"
                    subtitle={selectedDebt ? `For ${selectedDebt.name}` : ''}
                >
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

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Total Payment</Text>
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>
                                {formatCurrencyAmount(new BigNumber((parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0)), currency)}
                            </Text>
                        </View>

                        {/* Info Box for Adjusted Payment */}
                        {selectedDebt && (
                            (() => {
                                const currentTotal = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0);
                                const minPay = selectedDebt.minPayment.toNumber();
                                // Check if significantly different from Min Payment (tolerance 0.01)
                                const isDifferent = Math.abs(currentTotal - minPay) > 0.01;

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
                                                {currentTotal < minPay
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
