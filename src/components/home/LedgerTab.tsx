import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, SectionList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import TransactionOptionsModal from '@components/transaction/TransactionOptionsModal';
import InvestmentOptionsModal from '@components/investments/modals/InvestmentOptionsModal';
import DebtOptionsModal from '@components/debts/DebtOptionsModal';
import { HistoryCalendar } from '@components/history/HistoryCalendar';
import { HistoryItem } from '@components/history/HistoryListItem';
import { EmptyState } from '@components/common/EmptyState';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useHistoryData } from '@hooks/useHistoryData';
import { PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { type, space, radius } from '@styles/theme';
import { Debt, Investment, Transaction } from '@types';
import { deleteTransaction } from '@services/domain/transactionService';
import { deleteInvestment } from '@services/domain/investmentService';
import { deleteDebt } from '@services/domain/debtService';
import { addMonthsAnchored } from '@services/domain/recurrenceService';
import { HistoryFilter, HistorySection, groupHistoryByDay, matchesHistoryFilter, matchesHistorySearch } from '@utils/historyFeed';
import { calculateMonthMoneyInOut } from '@utils/snapshotMetrics';
import { isMoneyIn, transactionIcon } from './SnapshotView';

export type LedgerView = 'LIST' | 'CALENDAR';

interface LedgerTabProps {
    format: PrivacyFormat;
    view: LedgerView;
    onChangeView: (view: LedgerView) => void;
    // Record, prefilled for editing ({ transaction } / { investment } / { debt }) or empty for a new entry.
    onOpenRecord: (params?: object) => void;
}

const CHIPS: { key: HistoryFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'INCOME', label: 'Income' },
    { key: 'EXPENSE', label: 'Expense' },
    { key: 'CASH_FLOW', label: 'Transfers' },
];

const titleCase = (value?: string) => value?.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const isTransfer = (t: Transaction) => t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT';

// Signed cash effect; a debt payment's principal row carries its merged interest/fee legs, as on History.
const rowAmount = (t: Transaction, legs: Transaction[]): BigNumber => {
    let amount = isMoneyIn(t) ? t.amount.abs() : t.amount.abs().negated();
    legs.forEach(l => { amount = isMoneyIn(l) ? amount.plus(l.amount.abs()) : amount.minus(l.amount.abs()); });
    return amount;
};

const LedgerTab: React.FC<LedgerTabProps> = ({ format: f, view, onChangeView, onOpenRecord }) => {
    const { ds } = useTheme();
    const data = useHistoryData();
    const { transactions, investments, investmentMap, savingsGoalNameMap, debtLegsByPrincipalId, profile } = data;
    const debtsById = useMemo(() => new Map(data.debts.map(d => [d.id, d])), [data.debts]);

    const [filter, setFilter] = useState<HistoryFilter>('ALL');
    const [query, setQuery] = useState('');
    const [month, setMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

    // Realized gain/loss rows are display-only legs of a sale; the sale's own transfer already shows.
    const cashTransactions = useMemo(
        () => transactions.filter(t => t.type !== 'CAPITAL_GAIN' && t.type !== 'CAPITAL_LOSS'),
        [transactions],
    );

    const sections = useMemo((): HistorySection[] => {
        if (view === 'CALENDAR') {
            const day = selectedDate.toDateString();
            return groupHistoryByDay(cashTransactions.filter(t => new Date(t.date).toDateString() === day));
        }
        return groupHistoryByDay(cashTransactions.filter(t => matchesHistoryFilter(t, filter) && matchesHistorySearch(t, query)));
    }, [cashTransactions, view, selectedDate, filter, query]);

    const monthFlow = useMemo(() => calculateMonthMoneyInOut(transactions, new Date()), [transactions]);
    const calendarMonthTx = useMemo(() => transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    }), [transactions, month]);
    const calendarMonthInv = useMemo(() => investments.filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    }), [investments, month]);

    // Locked rows (an investment's or debt's own legs) open their parent record instead, as History's cards do.
    const handlePress = (t: Transaction) => {
        if (t.investmentId) {
            const inv = investmentMap[t.investmentId];
            if (inv) setSelectedInvestment(inv);
            return;
        }
        const isDebtRepayment = t.type === 'TRANSFER_OUT' && t.subCategory === 'PRINCIPAL';
        if (t.debtId && !isDebtRepayment) {
            const debt = debtsById.get(t.debtId);
            if (debt) setSelectedDebt(debt);
            return;
        }
        const isTappableGoalLeg = t.type === 'EXPENSE' ||
            (t.type === 'TRANSFER_OUT' && (t.subCategory === 'CONTRIBUTION' || t.subCategory === 'INITIAL_FUNDING'));
        if (t.savingsGoalId && !isTappableGoalLeg) return;
        setSelectedTransaction(t);
    };

    const rowText = (t: Transaction): { title: string; subtitle?: string } => {
        const goal = t.savingsGoalId ? (savingsGoalNameMap[t.savingsGoalId] || 'Deleted goal') : undefined;
        if (isTransfer(t)) {
            const base = t.note || `${t.type === 'TRANSFER_IN' ? 'From' : 'To'} ${titleCase(t.transferAccount) || 'account'}`;
            return { title: base, subtitle: goal ? `Goal · ${goal}` : titleCase(t.subCategory) || 'Transfer' };
        }
        const parts = [t.note ? t.category : titleCase(t.subCategory), goal && t.type === 'EXPENSE' ? `from ${goal}` : undefined];
        return { title: t.note || t.category, subtitle: parts.filter(Boolean).join(' · ') || undefined };
    };

    const renderItem = ({ item: historyItem, index, section }: { item: HistoryItem; index: number; section: HistorySection }) => {
        // The Ledger feed holds transactions only.
        const item = historyItem as Transaction;
        const { title, subtitle } = rowText(item);
        const legs = item.debtId && item.subCategory === 'PRINCIPAL' ? (debtLegsByPrincipalId[item.id] || []) : [];
        const amount = rowAmount(item, legs);
        return (
            <Row
                icon={transactionIcon(item)}
                title={title}
                subtitle={subtitle}
                // Discreet leaves transaction amounts out entirely.
                value={f.isDiscreet ? undefined : f.money(amount, { signed: true })}
                valueTone={isTransfer(item) ? 'neutral' : item.type === 'INCOME' && !f.isHidden ? 'good' : undefined}
                onPress={() => handlePress(item)}
                last={index === section.data.length - 1}
            />
        );
    };

    const renderSectionHeader = ({ section }: { section: HistorySection }) => (
        <View style={styles.dayHeader}>
            <Text style={[type.smallStrong, { color: ds.text }]}>{section.title}</Text>
            {!f.isDiscreet && (
                <Text style={[type.smallNum, { color: ds.text2 }]}>{f.money(section.totalAmount, { signed: true })}</Text>
            )}
        </View>
    );

    const shortMonth = new Date().toLocaleString('en-US', { month: 'short' });
    const viewLink = (label: string, icon: React.ComponentProps<typeof Ionicons>['name'], next: LedgerView) => (
        <Pressable onPress={() => onChangeView(next)} hitSlop={space[2]} style={styles.link}>
            <Ionicons name={icon} size={14} color={ds.accent} />
            <Text style={[type.smallMedium, { color: ds.accent }]}>{label}</Text>
        </Pressable>
    );

    const listHeader = view === 'CALENDAR' ? (
        <View style={styles.header}>
            <View style={styles.monthNav}>
                <Pressable onPress={() => setMonth(addMonthsAnchored(month, -1))} hitSlop={space[2]} accessibilityLabel="Previous month">
                    <Ionicons name="chevron-back" size={20} color={ds.text2} />
                </Pressable>
                <Text style={[type.bodyStrong, styles.monthLabel, { color: ds.text }]}>
                    {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable onPress={() => setMonth(addMonthsAnchored(month, 1))} hitSlop={space[2]} accessibilityLabel="Next month">
                    <Ionicons name="chevron-forward" size={20} color={ds.text2} />
                </Pressable>
                {viewLink('List', 'list-outline', 'LIST')}
            </View>
            <HistoryCalendar
                currentDate={month}
                transactions={calendarMonthTx}
                investments={calendarMonthInv}
                recurrenceRules={data.recurrenceRules}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currency={profile?.currency}
                hideAmounts={!f.isOpen}
            />
        </View>
    ) : (
        <View style={styles.header}>
            <View style={[styles.field, { backgroundColor: ds.inset }]}>
                <Ionicons name="search-outline" size={18} color={ds.text2} />
                <TextInput
                    style={[type.body, styles.input, { color: ds.text }]}
                    placeholder="Search transactions"
                    placeholderTextColor={ds.text3}
                    value={query}
                    onChangeText={setQuery}
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')} hitSlop={space[2]} accessibilityLabel="Clear search">
                        <Ionicons name="close-circle" size={18} color={ds.text3} />
                    </Pressable>
                )}
            </View>
            <View style={styles.chips}>
                {CHIPS.map(chip => {
                    const on = chip.key === filter;
                    return (
                        <Pressable
                            key={chip.key}
                            onPress={() => setFilter(chip.key)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[styles.chip, on && { backgroundColor: ds.inset }]}
                        >
                            <Text style={[type.smallMedium, { color: on ? ds.text : ds.text2 }]}>{chip.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
            <View style={styles.flow}>
                {/* Discreet has no scale-free In; Out shows as a share of In instead. */}
                {!f.isDiscreet && (
                    <Text style={[type.smallNum, { color: ds.text }]}>
                        <Text style={{ color: ds.text2 }}>In · {shortMonth}</Text>{' '}
                        <Text style={f.isOpen ? { color: ds.success } : undefined}>{f.money(monthFlow.moneyIn)}</Text>
                    </Text>
                )}
                <Text style={[type.smallNum, { color: ds.text }]}>
                    <Text style={{ color: ds.text2 }}>Out · {shortMonth}</Text>{' '}
                    {f.show(f.money(monthFlow.moneyOut), `${formatPercent(monthFlow.outPercentOfIn)} of in`)}
                </Text>
                {viewLink('Calendar', 'calendar-outline', 'CALENDAR')}
            </View>
        </View>
    );

    if (data.isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={ds.accent} />
            </View>
        );
    }

    if (cashTransactions.length === 0) {
        return (
            <View style={styles.content}>
                <EmptyState
                    icon="receipt-outline"
                    title="No transactions yet"
                    subtitle="Every transaction you log shows up here, grouped by day."
                    ctaLabel="Add your first transaction"
                    onCtaPress={() => onOpenRecord()}
                />
            </View>
        );
    }

    return (
        <>
            <SectionList<HistoryItem, HistorySection>
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                    <Text style={[type.small, styles.empty, { color: ds.text2 }]}>
                        {view === 'CALENDAR' ? 'Nothing recorded on this day.' : 'No transactions match.'}
                    </Text>
                }
                stickySectionHeadersEnabled={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            />

            <TransactionOptionsModal
                visible={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onEdit={t => { setSelectedTransaction(null); onOpenRecord({ transaction: { ...t, amount: t.amount.toString() } }); }}
                onDelete={async id => { await deleteTransaction(id); data.reload(); setSelectedTransaction(null); }}
                currency={profile?.currency}
            />

            <InvestmentOptionsModal
                visible={!!selectedInvestment}
                investment={selectedInvestment}
                linkedTransaction={selectedInvestment ? transactions.find(t => t.investmentId === selectedInvestment.id) || null : null}
                onClose={() => setSelectedInvestment(null)}
                onEdit={inv => {
                    setSelectedInvestment(null);
                    onOpenRecord({
                        investment: {
                            ...inv,
                            quantity: inv.quantity.toString(),
                            price: inv.price.toString(),
                            fees: inv.fees ? inv.fees.toString() : undefined,
                            exchangeRate: inv.exchangeRate ? inv.exchangeRate.toString() : undefined,
                        },
                    });
                }}
                onDelete={async (id, deleteLinked) => {
                    if (deleteLinked) {
                        for (const tx of transactions.filter(t => t.investmentId === id)) await deleteTransaction(tx.id);
                    }
                    await deleteInvestment(id);
                    data.reload();
                    setSelectedInvestment(null);
                }}
                currency={profile?.currency}
            />

            <DebtOptionsModal
                visible={!!selectedDebt}
                debt={selectedDebt}
                linkedTransaction={selectedDebt ? transactions.find(t => t.debtId === selectedDebt.id) || null : null}
                onClose={() => setSelectedDebt(null)}
                onDelete={async (id, deleteLinked) => {
                    if (deleteLinked) {
                        for (const tx of transactions.filter(t => t.debtId === id)) await deleteTransaction(tx.id);
                    }
                    await deleteDebt(id);
                    data.reload();
                    setSelectedDebt(null);
                }}
                onEdit={debt => {
                    onOpenRecord({
                        debt: {
                            ...debt,
                            initialAmount: debt.initialAmount.toString(),
                            interestRate: debt.interestRate.toString(),
                            minPayment: debt.minPayment.toString(),
                            fees: debt.fees?.toString(),
                            termMonths: debt.termMonths?.toString(),
                        },
                    });
                    setSelectedDebt(null);
                }}
                currency={profile?.currency}
            />
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    header: {
        paddingTop: space[4],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        borderRadius: radius.md,
        paddingHorizontal: space[3],
    },
    input: {
        flex: 1,
        paddingVertical: space[3],
    },
    chips: {
        flexDirection: 'row',
        gap: space[2],
        marginTop: space[3],
    },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    flow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[5],
        marginTop: space[4],
    },
    link: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginBottom: space[3],
    },
    monthLabel: {
        minWidth: 0,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: space[6],
        marginBottom: space[1],
    },
    empty: {
        paddingVertical: space[5],
    },
    loading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7] * 2,
    },
});

export default LedgerTab;
