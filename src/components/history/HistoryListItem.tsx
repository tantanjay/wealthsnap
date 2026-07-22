import React from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { Transaction, Investment, Debt } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';

export type HistoryItem = Transaction | Investment | Debt;

export const isInvestment = (item: HistoryItem): item is Investment => {
    return (item as Investment).symbol !== undefined && (item as Investment).action !== undefined;
};

export const isDebt = (item: HistoryItem): item is Debt => {
    return (item as Debt).minPayment !== undefined && (item as Debt).initialAmount !== undefined;
};

interface HistoryListItemProps {
    item: HistoryItem;
    formatCurrency: (amount: BigNumber, currency?: string) => string;
    investmentMap: Record<string, Investment>;
    linkedPLByInvestmentId: Record<string, Transaction | undefined>;
    profileCurrency?: string;
    onSelectTransaction: (t: Transaction) => void;
    onSelectInvestment: (inv: Investment) => void;
    onSelectDebt: (debt: Debt) => void;
}

/**
 * One row of the History list. Wrapped in React.memo below so that unrelated re-renders
 * of HistoryScreen (typing in search, toggling a filter, opening/closing a details modal)
 * don't force every currently-mounted row to re-render - only rows whose own props
 * actually changed do. This is what SectionList/VirtualizedList's own "large list is slow
 * to update" warning is asking for (its message literally suggests PureComponent /
 * shouldComponentUpdate, which React.memo is the modern equivalent of).
 */
const HistoryListItem: React.FC<HistoryListItemProps> = ({
    item,
    formatCurrency,
    investmentMap,
    linkedPLByInvestmentId,
    profileCurrency,
    onSelectTransaction,
    onSelectInvestment,
    onSelectDebt,
}) => {
    const { colors } = useTheme();

    if (isInvestment(item)) {
        const inv = item;
        // Distinct color for investments (Purple/Blue)
        const iconColor = '#8E24AA';

        // Conversion Logic for Display
        const rate = inv.exchangeRate ? new BigNumber(inv.exchangeRate) : new BigNumber(1);
        // If rate > 1, we assume stored values are in Profile Currency and need conversion for display
        // But only if we want to show in "Native" currency.
        // Since inv.currency might be 'USD', we definitely want to match values to the symbol.

        const nativePrice = inv.price.dividedBy(rate);
        const nativeTotal = nativePrice.multipliedBy(inv.quantity);

        // Find linked P/L for SELL actions
        let plElement = null;
        if (inv.action === 'SELL') {
            const linkedTx = linkedPLByInvestmentId[inv.id];
            if (linkedTx) {
                const isGain = linkedTx.type === 'CAPITAL_GAIN';
                const nativePL = linkedTx.amount.dividedBy(rate);

                plElement = (
                    <Text>
                        {" • "}<Text style={{ color: isGain ? colors.success : colors.error, fontWeight: 'bold' }}>
                            {isGain ? '+' : '-'}{formatCurrency(nativePL.abs(), inv.currency)}
                        </Text>
                    </Text>
                );
            }
        }

        return (
            <TouchableOpacity onPress={() => onSelectInvestment(inv)} style={{ marginBottom: 8 }} activeOpacity={0.9}>
                <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: iconColor }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: iconColor + '15',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Ionicons name="stats-chart" size={18} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    {inv.symbol} <Text style={{ fontSize: 14, color: colors.textSecondary }}>({inv.action})</Text>
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                    {inv.quantity.toString()} units @ {formatCurrencyAmount(nativePrice, inv.currency || profileCurrency || 'PHP')}
                                    {plElement}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{
                                fontSize: 16, fontWeight: 'bold',
                                color: colors.text
                            }}>
                                {formatCurrency(nativeTotal, inv.currency)}
                            </Text>
                            <View style={{ backgroundColor: iconColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                <Text style={{ color: iconColor, fontSize: 10, fontWeight: 'bold' }}>INVESTMENT</Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }

    if (isDebt(item)) {
        const debt = item;
        const isPayable = debt.direction === 'PAYABLE';
        const iconColor = isPayable ? colors.error : colors.success;
        const iconName = isPayable ? "arrow-down-circle-outline" : "arrow-up-circle-outline";

        return (
            <TouchableOpacity onPress={() => onSelectDebt(debt)} style={{ marginBottom: 8 }} activeOpacity={0.9}>
                <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: iconColor }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: iconColor + '15',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Ionicons name={iconName} size={18} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    {debt.name}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                    {debt.type.replace(/_/g, ' ')} • {debt.interestRate.toString()}% {debt.interestType}
                                </Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{
                                fontSize: 16, fontWeight: 'bold',
                                color: colors.text
                            }}>
                                {formatCurrencyAmount(debt.initialAmount, debt.currency)}
                            </Text>
                            <View style={{ backgroundColor: iconColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                <Text style={{ color: iconColor, fontSize: 10, fontWeight: 'bold' }}>DEBT</Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }

    const t = item as Transaction;
    const isExpense = t.type === 'EXPENSE';
    const isTransferIn = t.type === 'TRANSFER_IN';
    const isTransferOut = t.type === 'TRANSFER_OUT';
    const isTransfer = isTransferIn || isTransferOut;
    const isNegativeFlow = isExpense || isTransferOut;

    // Determine Icon and Color based on logic
    let iconName: any = "wallet";
    let statusColor = isExpense ? colors.error : colors.success;

    if (isTransfer) {
        statusColor = isTransferIn ? colors.success : colors.error;
        iconName = isTransferIn ? "arrow-down-circle-outline" : "arrow-up-circle-outline";
    } else if (t.creationMethod === 'AI') {
        iconName = "sparkles";
    } else if (t.isRecurring) {
        iconName = "repeat";
    }

    const getDisplayName = () => {
        if (isTransfer) {
            const toTitleCase = (value?: string) =>
                value
                    ?.toLowerCase()
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());

            return isTransferIn ? `From ${toTitleCase(t.transferAccount)}` : `To ${toTitleCase(t.transferAccount)}`;
        }
        return t.category;
    };

    // Resolve Currency and Amount for Display
    // If linked to investment, respect investment currency and rate
    let displayAmount = t.amount;
    let displayCurrency = undefined;

    if (t.investmentId && investmentMap[t.investmentId]) {
        const inv = investmentMap[t.investmentId];
        displayCurrency = inv.currency;
        if (inv.exchangeRate) {
            displayAmount = displayAmount.dividedBy(inv.exchangeRate);
        }
    }

    return (
        <TouchableOpacity
            onPress={() => {
                // Prevent opening options for auto-generated transactions
                // Exception: Allow Debt Repayments (TRANSFER_OUT + PRINCIPAL) so they can be deleted
                const isDebtRepayment = t.type === 'TRANSFER_OUT' && t.subCategory === 'PRINCIPAL';

                if ((t.investmentId || t.debtId) && !isDebtRepayment) return;
                onSelectTransaction(t);
            }}
            activeOpacity={(t.investmentId || t.debtId) && !(t.type === 'TRANSFER_OUT' && t.subCategory === 'PRINCIPAL') ? 1 : 0.7}
            style={{ marginBottom: 8 }}
        >
            <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: statusColor + '15',
                            justifyContent: 'center', alignItems: 'center'
                        }}>
                            <Ionicons name={iconName} size={18} color={statusColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                {getDisplayName()}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                {t.note || t.subCategory || t.type}
                            </Text>
                        </View>
                    </View>
                    <Text style={{
                        color: isNegativeFlow ? colors.error : colors.success,
                        fontSize: 16, fontWeight: 'bold'
                    }}>
                        {isNegativeFlow ? '-' : '+'}{formatCurrency(displayAmount, displayCurrency)}
                    </Text>
                </View>
            </Card>
        </TouchableOpacity>
    );
};

export default React.memo(HistoryListItem);
