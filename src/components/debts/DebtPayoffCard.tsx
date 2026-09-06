import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import { useTheme } from '@context/ThemeContext';
import { Debt, Transaction } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import * as DebtMetrics from '@utils/debtMetrics';

type PatchedDebt = Debt & { originalAmount?: BigNumber };

interface DebtPayoffCardProps {
    // `debt.initialAmount` is expected pre-patched to the real current balance (see
    // allDebtsWithBalances in DebtScreen), matching calculateDebtProgress/breakdown's contract.
    debt: PatchedDebt;
    originalDebt?: Debt;
    transactions: Transaction[];
    currency: string;
    variant: 'payable' | 'receivable';
    // 1-based rank within Priority Payoff Order - only meaningful for 'payable'; the #1 debt
    // gets the highlighted rank circle/progress color.
    rank?: number;
    onPressSettings: (debt: Debt) => void;
    onPressPay: (debt: Debt) => void;
}

/**
 * One debt row shared by DebtScreen's "Priority Payoff Order" and "Owed to You" lists -
 * previously two ~100-line copy-pasted render blocks that had already drifted apart in
 * small ways (e.g. "PAID" vs "PAID OFF"-style label mismatches). `variant` parameterizes the
 * handful of things that actually differ between paying down a debt vs collecting one owed to you.
 */
const DebtPayoffCard: React.FC<DebtPayoffCardProps> = ({
    debt,
    originalDebt,
    transactions,
    currency,
    variant,
    rank,
    onPressSettings,
    onPressPay,
}) => {
    const { colors } = useTheme();
    const isPayable = variant === 'payable';
    const isTopPriority = isPayable && rank === 1;
    // Payable's #1 priority debt gets the "primary" highlight; every other payable debt is
    // neutral (border), and any receivable ("Owed to You") debt is success-colored throughout.
    const rankCircleColor = isPayable ? (isTopPriority ? colors.primary : colors.border) : colors.success;
    const progressColor = isPayable ? (isTopPriority ? colors.primary : colors.success) : colors.success;

    const trueOriginal = originalDebt ? originalDebt.initialAmount : debt.initialAmount;
    const trueCurrent = debt.initialAmount;
    const progressPercent = DebtMetrics.calculateDebtProgress(trueOriginal, trueCurrent);
    const { principal, interest } = DebtMetrics.calculateNextPaymentBreakdown(originalDebt || debt, trueCurrent);
    const { nextDue, isOverdue, isDueSoon } = DebtMetrics.getDebtUrgency(originalDebt || debt, transactions);

    const cardBorderColor = isOverdue ? colors.error : (isDueSoon ? '#FF9500' : colors.border);

    return (
        <View style={[styles.debtItem, { backgroundColor: colors.surface, borderColor: cardBorderColor }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.rankCircle, { backgroundColor: rankCircleColor }]}>
                        {isPayable
                            ? <Text style={[styles.rankText, { color: isTopPriority ? '#FFF' : colors.text }]}>{rank}</Text>
                            : <Ionicons name="arrow-down" size={14} color="#FFF" />}
                    </View>
                    <View>
                        <Text style={[styles.debtName, { color: colors.text }]}>{debt.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                            {debt.interestRate.toNumber()}% APR • {debt.type.replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 6 }]}
                        onPress={() => onPressSettings(originalDebt || debt)}
                    >
                        <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={{ color: isPayable ? colors.text : colors.success, fontWeight: 'bold', fontSize: 16 }}>
                        {formatCurrencyAmount(trueCurrent, currency)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{isPayable ? 'Remaining' : 'Owed to You'}</Text>
                </View>
            </View>

            <View style={{ height: 6, backgroundColor: colors.background, borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: progressColor }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>
                        {isPayable ? ' NEXT PAYMENT' : ' NEXT EXPECTED'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>
                            {formatCurrencyAmount(debt.minPayment, currency)}
                        </Text>
                    </View>
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
                        {isOverdue ? 'Overdue' : (isDueSoon ? 'Due Soon' : (isPayable ? 'Due Date' : 'Expected'))}
                    </Text>

                    <TouchableOpacity
                        style={[styles.payButton, { backgroundColor: isPayable ? colors.primary : colors.success, marginRight: 0, marginTop: 6 }]}
                        onPress={() => onPressPay(debt)}
                    >
                        <Text style={styles.payButtonText}>{isPayable ? 'PAY NOW' : 'LOG REPAYMENT'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rankText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    debtName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    iconButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
});

export default DebtPayoffCard;
