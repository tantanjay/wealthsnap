import React from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { DOMAIN_ICONS, Domain, domainColor, domainSoftColor } from '@components/ds';
import { type, space } from '@styles/theme';
import { Transaction, Investment, Debt } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';

export type HistoryItem = Transaction | Investment | Debt;

export const isInvestment = (item: HistoryItem): item is Investment => {
    return (item as Investment).symbol !== undefined && (item as Investment).action !== undefined;
};

export const isDebt = (item: HistoryItem): item is Debt => {
    return (item as Debt).minPayment !== undefined && (item as Debt).initialAmount !== undefined;
};

// Cosmetic only - enum-like values (transferAccount, subCategory tags like INITIAL_FUNDING/
// GOAL_SPEND, TransactionType) are stored SCREAMING_SNAKE_CASE, but should never show that
// way in the UI. Never run this on free text (note) - only on values we control the shape of.
const toTitleCase = (value?: string) =>
    value
        ?.toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

interface HistoryListItemProps {
    item: HistoryItem;
    formatCurrency: (amount: BigNumber, currency?: string) => string;
    investmentMap: Record<string, Investment>;
    linkedPLByInvestmentId: Record<string, Transaction | undefined>;
    debtLegsByPrincipalId: Record<string, Transaction[] | undefined>;
    savingsGoalNameMap: Record<string, string>;
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
    debtLegsByPrincipalId,
    savingsGoalNameMap,
    profileCurrency,
    onSelectTransaction,
    onSelectInvestment,
    onSelectDebt,
}) => {
    const { ds } = useTheme();

    // Row recipe (docs/DESIGN.md §3): domain-tinted or neutral icon tile, title + secondary, trailing value.
    const leadingTile = (domain: Domain) => (
        <View style={[styles.tile, { backgroundColor: domainSoftColor(ds, domain) }]}>
            <Ionicons name={DOMAIN_ICONS[domain]} size={18} color={domainColor(ds, domain)} />
        </View>
    );

    if (isInvestment(item)) {
        const inv = item;

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
                        {" • "}<Text style={{ color: isGain ? ds.success : ds.danger }}>
                            {isGain ? '+' : '-'}{formatCurrency(nativePL.abs(), inv.currency)}
                        </Text>
                    </Text>
                );
            }
        }

        return (
            <Pressable onPress={() => onSelectInvestment(inv)} style={[styles.row, { borderBottomColor: ds.hairline }]}>
                {leadingTile('invest')}
                <View style={styles.main}>
                    <Text style={[type.body, { color: ds.text }]}>
                        {inv.symbol} <Text style={[type.small, { color: ds.text2 }]}>({inv.action})</Text>
                    </Text>
                    <Text style={[type.smallNum, { color: ds.text2 }]} numberOfLines={1}>
                        {inv.quantity.toString()} units @ {formatCurrencyAmount(nativePrice, inv.currency || profileCurrency || 'PHP')}
                        {plElement}
                    </Text>
                </View>
                <View style={styles.end}>
                    <Text style={[type.bodyNum, { color: ds.text }]}>
                        {formatCurrency(nativeTotal, inv.currency)}
                    </Text>
                    <Text style={[type.caption, { color: ds.text2 }]}>{inv.type}</Text>
                </View>
            </Pressable>
        );
    }

    if (isDebt(item)) {
        const debt = item;
        const isPayable = debt.direction === 'PAYABLE';
        const amountColor = isPayable ? ds.danger : ds.success;

        return (
            <Pressable onPress={() => onSelectDebt(debt)} style={[styles.row, { borderBottomColor: ds.hairline }]}>
                {leadingTile('loans')}
                <View style={styles.main}>
                    <Text style={[type.body, { color: ds.text }]}>
                        {debt.name}
                    </Text>
                    <Text style={[type.smallNum, { color: ds.text2 }]} numberOfLines={1}>
                        {debt.type.replace(/_/g, ' ')} • {debt.interestRate.toString()}% {debt.interestType}
                    </Text>
                </View>
                <View style={styles.end}>
                    <Text style={[type.bodyNum, { color: amountColor }]}>
                        {formatCurrencyAmount(debt.initialAmount, debt.currency)}
                    </Text>
                    <Text style={[type.caption, { color: ds.text2 }]}>{isPayable ? 'I OWE' : 'OWED TO ME'}</Text>
                </View>
            </Pressable>
        );
    }

    const t = item as Transaction;
    const isExpense = t.type === 'EXPENSE';
    const isTransferIn = t.type === 'TRANSFER_IN';
    const isTransferOut = t.type === 'TRANSFER_OUT';
    const isTransfer = isTransferIn || isTransferOut;
    const isNegativeFlow = isExpense || isTransferOut;

    // Determine Icon and Color based on logic
    let iconName: React.ComponentProps<typeof Ionicons>['name'] = "wallet-outline";

    if (isTransfer) {
        iconName = isTransferIn ? "arrow-down-circle-outline" : "arrow-up-circle-outline";
    } else if (t.creationMethod === 'AI') {
        iconName = "sparkles-outline";
    } else if (t.isRecurring) {
        iconName = "repeat-outline";
    }

    const getDisplayName = () => {
        if (isTransfer) {
            // A transfer's own note (e.g. a debt payment's "Debt Payment: <name>", or
            // something the user typed themselves) is always more specific than the generic
            // "To Loan"/"To Other Account" account-type wording - prefer it as the title.
            if (t.note) return t.note;
            const base = isTransferIn ? `From ${toTitleCase(t.transferAccount)}` : `To ${toTitleCase(t.transferAccount)}`;
            // Debt transfers only ever show the debt's generic type (e.g. "To Credit Card") -
            // there's no existing instance-name-append precedent to copy for that. Savings
            // Goals is new: append the specific goal's name so "To Savings Goal" reads as
            // "To Savings Goal (Travel Fund)".
            // Falls back to a generic label if the goal was since deleted (its ledger rows
            // keep their savingsGoalId tag forever, but the name isn't preserved anywhere
            // once the goal row itself is gone) - same reasoning as monthlySummaryBuilder.ts.
            const goalName = t.savingsGoalId
                ? (savingsGoalNameMap[t.savingsGoalId] || 'Deleted Goal')
                : undefined;
            return goalName ? `${base} (${goalName})` : base;
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

    // Prevent opening options for auto-generated transactions.
    // Exception: Allow Debt Repayments (TRANSFER_OUT + PRINCIPAL) so they can be deleted.
    // Savings Goals: the CONTRIBUTION/INITIAL_FUNDING leg stays tappable (so a past
    // contribution can be canceled/deleted) and the real-spend EXPENSE leg stays
    // tappable (it's the user-meaningful transaction, same as debt's PRINCIPAL leg) -
    // but the auto-generated GOAL_SPEND/WITHDRAWAL/SWEEP TRANSFER_IN legs are locked,
    // same as debt's interest/fee legs. Undoing those happens via deleting the paired
    // EXPENSE (cascades automatically) or the goal's own Options modal, not from here.
    const isDebtRepayment = t.type === 'TRANSFER_OUT' && t.subCategory === 'PRINCIPAL';
    const isTappableGoalLeg = !!t.savingsGoalId && (
        t.type === 'EXPENSE' ||
        (t.type === 'TRANSFER_OUT' && (t.subCategory === 'CONTRIBUTION' || t.subCategory === 'INITIAL_FUNDING'))
    );
    const isLocked = ((t.investmentId || t.debtId) && !isDebtRepayment) || (!!t.savingsGoalId && !isTappableGoalLeg);

    // A transfer whose title above (getDisplayName) already used its own note drops the
    // generic account-type subtitle entirely (not just swaps it in) to avoid repeating the
    // same info twice and to keep a merged debt payment card slim.
    const isNotedTransferRow = isTransfer && !!t.note;
    // No "Expense"/"Income"/"Transfer In" fallback here on purpose - that's just the same
    // information the icon color and +/- sign already carry, not a real label.
    const subtitleText = t.note || toTitleCase(t.subCategory);

    // The "money left the goal" transfer this expense is paired with no longer gets its own
    // card (folded away in HistoryScreen's sections builder) - name the goal here instead so
    // that funding source isn't lost.
    const goalFundedName = t.type === 'EXPENSE' && t.savingsGoalId
        ? (savingsGoalNameMap[t.savingsGoalId] || 'Deleted Goal')
        : undefined;

    // A debt payment's Interest/Fees legs are folded into this Principal leg's card the same
    // way - surface what they were instead of just dropping them.
    const debtLegs = (t.debtId && t.subCategory === 'PRINCIPAL') ? (debtLegsByPrincipalId[t.id] || []) : [];
    const debtInterestLeg = debtLegs.find(l => l.subCategory === 'INTEREST');
    const debtFeeLeg = debtLegs.find(l => l.subCategory === 'FEES');
    const hasDebtBreakdown = !!(debtInterestLeg || debtFeeLeg);

    // Net total actually paid/received this payment - principal, interest, and fees each
    // carry their own sign (a fee is always a cost, even on a receivable's interest income),
    // so the headline amount below has to sum them rather than just showing principal alone.
    let debtNetAmount = t.type === 'TRANSFER_OUT' ? t.amount.negated() : t.amount;
    if (debtInterestLeg) {
        debtNetAmount = debtInterestLeg.type === 'EXPENSE'
            ? debtNetAmount.minus(debtInterestLeg.amount)
            : debtNetAmount.plus(debtInterestLeg.amount);
    }
    if (debtFeeLeg) {
        debtNetAmount = debtNetAmount.minus(debtFeeLeg.amount);
    }
    const isDebtNetNegative = debtNetAmount.isNegative();

    return (
        <Pressable
            onPress={() => {
                if (isLocked) return;
                onSelectTransaction(t);
            }}
            style={[styles.row, { borderBottomColor: ds.hairline }]}
        >
            {t.savingsGoalId
                ? leadingTile('goals')
                : t.debtId
                    ? leadingTile('loans')
                    : (
                        <View style={[styles.tile, { backgroundColor: ds.tileNeutral }]}>
                            <Ionicons name={iconName} size={18} color={ds.text2} />
                        </View>
                    )}
            <View style={styles.main}>
                <Text style={[type.body, { color: ds.text }]}>
                    {getDisplayName()}
                </Text>
                {!isNotedTransferRow && (subtitleText || goalFundedName) && (
                    <Text style={[type.small, { color: ds.text2 }]} numberOfLines={1}>
                        {subtitleText}
                        {goalFundedName && (
                            <Text>
                                {subtitleText ? " • " : ""}{goalFundedName}
                            </Text>
                        )}
                    </Text>
                )}
                {hasDebtBreakdown && (
                    <Text style={type.smallNum} numberOfLines={1}>
                        <Text style={{ color: t.type === 'TRANSFER_OUT' ? ds.danger : ds.success }}>
                            {t.type === 'TRANSFER_OUT' ? '-' : '+'}{formatCurrency(t.amount)} principal
                        </Text>
                        {debtInterestLeg && (
                            <Text style={{ color: debtInterestLeg.type === 'INCOME' ? ds.success : ds.danger }}>
                                {" • "}{debtInterestLeg.type === 'INCOME' ? '+' : '-'}{formatCurrency(debtInterestLeg.amount)} interest
                            </Text>
                        )}
                        {debtFeeLeg && (
                            <Text style={{ color: ds.danger }}>
                                {" • -"}{formatCurrency(debtFeeLeg.amount)} fees
                            </Text>
                        )}
                    </Text>
                )}
            </View>
            <Text style={[
                type.bodyNum,
                { color: hasDebtBreakdown ? (isDebtNetNegative ? ds.danger : ds.success) : (isNegativeFlow ? ds.danger : ds.success) }
            ]}>
                {hasDebtBreakdown
                    ? `${isDebtNetNegative ? '-' : '+'}${formatCurrency(debtNetAmount.abs())}`
                    : `${isNegativeFlow ? '-' : '+'}${formatCurrency(displayAmount, displayCurrency)}`}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
        minHeight: 56,
        borderBottomWidth: 1,
    },
    tile: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
    end: {
        alignItems: 'flex-end',
    },
});

export default React.memo(HistoryListItem);
