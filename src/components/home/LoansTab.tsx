import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import { EmptyState } from '@components/common/EmptyState';
import DebtStatusModal from '@components/debts/DebtStatusModal';
import { Hero, ProgressBar, Row, SectionHeader, SegmentedControl, Tone } from '@components/ds';
import { Button } from '@components/index';
import { useAlert } from '@context/AlertContext';
import { useTheme } from '@context/ThemeContext';
import { DASH, PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { type, space } from '@styles/theme';
import { Debt, DebtStatus, Transaction } from '@types';
import * as Storage from '@services/core/storageService';
import { getAllDebts, saveDebt, deleteDebt } from '@services/domain/debtService';
import { saveTransaction, deleteTransaction, getCachedTransactions } from '@services/domain/transactionService';
import { calculateBurnRate, getBurnRateBase } from '@utils/financialMetrics';
import * as DebtMetrics from '@utils/debtMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { calculateLoansSnapshot } from '@utils/snapshotMetrics';
import { generateUUID } from '@utils/uuid';

type LoanSide = 'owe' | 'owed';
type Strategy = 'SNOWBALL' | 'AVALANCHE';

interface LoansTabProps {
    format: PrivacyFormat;
    currency: string;
    // Opens Record, where new loans are created and existing ones edited.
    onOpenRecord: (params?: object) => void;
}

const STRATEGIES: { key: Strategy; label: string }[] = [
    { key: 'AVALANCHE', label: 'Avalanche' },
    { key: 'SNOWBALL', label: 'Snowball' },
];

const SIDES = [{ key: 'owe' as const, label: 'You owe' }, { key: 'owed' as const, label: 'Owed to you' }];

const isPayable = (d: Debt) => (d.direction || 'PAYABLE') === 'PAYABLE';
const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

interface LoanRow {
    debt: Debt;
    balance: BigNumber;
    progress: number;
    nextDue: Date | null;
    // Minimum reached this month (getNextDueDate already rolled to next month).
    paid: boolean;
    isOverdue: boolean;
    isDueSoon: boolean;
}

const buildRow = (debt: Debt, transactions: Transaction[], now: Date): LoanRow => {
    const balance = DebtMetrics.calculateCurrentDebtBalance(debt, transactions);
    const { nextDue, isOverdue, isDueSoon } = DebtMetrics.getDebtUrgency(debt, transactions);
    const paid = !!nextDue && debt.minPayment.gt(0) &&
        (nextDue.getFullYear() * 12 + nextDue.getMonth()) > (now.getFullYear() * 12 + now.getMonth());
    return { debt, balance, progress: DebtMetrics.calculateDebtProgress(debt.initialAmount, balance), nextDue, paid, isOverdue, isDueSoon };
};

// Same order the Debts screen used: overdue, then due soon, then the payoff strategy (owe) or largest first (owed).
const byUrgency = (a: LoanRow, b: LoanRow) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.isDueSoon !== b.isDueSoon) return a.isDueSoon ? -1 : 1;
    return 0;
};

const LoansTab: React.FC<LoansTabProps> = ({ format: f, currency, onOpenRecord }) => {
    const { ds } = useTheme();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [side, setSide] = useState<LoanSide>('owe');
    const [strategy, setStrategy] = useState<Strategy>('AVALANCHE');
    const [statusModalDebt, setStatusModalDebt] = useState<Debt | null>(null);
    const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);

    const debtsById = useMemo(() => new Map(debts.map(d => [d.id, d])), [debts]);

    const isInitialStrategyLoad = useRef(true);
    useEffect(() => {
        Storage.getDebtStrategy().then(saved => {
            if (saved === 'SNOWBALL' || saved === 'AVALANCHE') setStrategy(saved);
            isInitialStrategyLoad.current = false;
        });
    }, []);

    const changeStrategy = (next: Strategy) => {
        setStrategy(next);
        if (!isInitialStrategyLoad.current) Storage.saveDebtStrategy(next);
    };

    const loadData = useCallback(async () => {
        try {
            const [d, t] = await Promise.all([getAllDebts(), getCachedTransactions()]);
            setDebts(d);
            setTransactions(t);
        } catch (error) {
            console.error('Failed to load loans:', error);
        } finally {
            setHasLoaded(true);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const data = useMemo(() => {
        const now = new Date();
        const rows = debts.map(d => buildRow(d, transactions, now));
        const active = rows.filter(r => r.balance.gt(0) && r.debt.status === 'ACTIVE');
        const owe = active.filter(r => isPayable(r.debt)).sort((a, b) => byUrgency(a, b) || (strategy === 'SNOWBALL'
            ? a.balance.minus(b.balance).toNumber()
            : b.debt.interestRate.minus(a.debt.interestRate).toNumber()));
        const owed = active.filter(r => !isPayable(r.debt)).sort((a, b) => byUrgency(a, b) || b.balance.minus(a.balance).toNumber());
        const resolved = rows.filter(r => r.balance.lte(0) || r.debt.status === 'PAID_OFF' || r.debt.status === 'FORGIVEN');

        // Payoff plan: the Debts screen's math, on payable balances patched to what's left.
        const patched = owe.map(r => ({ ...r.debt, initialAmount: r.balance, originalAmount: r.debt.initialAmount }));
        const totalDebt = owe.reduce((sum, r) => sum.plus(r.balance), new BigNumber(0));
        const yearlyInterest = patched.reduce((sum, d) => {
            if (d.interestType === 'NONE') return sum;
            const base = d.interestType === 'FLAT' ? d.originalAmount : d.initialAmount;
            return sum.plus(base.times(d.interestRate.div(100)));
        }, new BigNumber(0));
        const burnRate = calculateBurnRate(getBurnRateBase(transactions), 6);
        const plan = DebtMetrics.calculateDebtPayoffStrategy(patched, 0, strategy);

        return {
            owe,
            owed,
            resolved,
            snapshot: calculateLoansSnapshot(transactions, debts, now),
            owedSnapshot: calculateLoansSnapshot(transactions, debts, now, 'RECEIVABLE'),
            interestLeakPerHour: yearlyInterest.div(365).div(24),
            // Discreet: interest as a share of what's still owed (docs/METRICS.md, Loan Payoff Plan).
            interestSharePercent: totalDebt.gt(0) ? plan.totalInterest.div(totalDebt).times(100).toNumber() : null,
            blendedRatePercent: totalDebt.gt(0) ? yearlyInterest.div(totalDebt).times(100).toNumber() : null,
            timeCostMonths: burnRate.gt(0) ? totalDebt.div(burnRate).toNumber() : 0,
            debtFreeDate: plan.freedomDate,
            // Calendar months, so it agrees with the "Debt-free by" month beside it.
            monthsToGo: plan.freedomDate
                ? Math.max(0, (plan.freedomDate.getFullYear() - now.getFullYear()) * 12 + plan.freedomDate.getMonth() - now.getMonth())
                : null,
            totalInterest: plan.totalInterest,
            unpayableNames: owe.filter(r => plan.unpayableDebtIds.includes(r.debt.id)).map(r => r.debt.name),
        };
    }, [debts, transactions, strategy]);

    const { showAlert } = useAlert();

    // Always saves the original record; rows only carry display values.
    const handleUpdateStatus = async (debt: Debt, status: DebtStatus) => {
        const original = debtsById.get(debt.id);
        if (!original) return;
        if (status === 'ACTIVE' && DebtMetrics.calculateCurrentDebtBalance(original, transactions).lte(0)) {
            showAlert(
                'Nothing Left to Reactivate',
                "This debt's payment history already shows it fully paid ($0 remaining), so reactivating won't bring back an outstanding balance. If more is actually owed, log a new payment or edit the debt instead.",
                [{ text: 'OK', style: 'cancel' }]
            );
            return;
        }
        await saveDebt({ ...original, status, updatedAt: new Date().toISOString() });
        await loadData();
    };

    const handleEditDebt = (debt: Debt) => {
        const original = debtsById.get(debt.id) || debt;
        onOpenRecord({
            debt: {
                ...original,
                initialAmount: original.initialAmount.toString(),
                interestRate: original.interestRate.toString(),
                minPayment: original.minPayment.toString(),
                fees: original.fees?.toString(),
                termMonths: original.termMonths?.toString(),
            },
        });
    };

    const handleDeleteDebt = async (id: string, deleteLinked: boolean) => {
        if (deleteLinked) {
            for (const tx of transactions.filter(t => t.debtId === id)) {
                await deleteTransaction(tx.id);
            }
        }
        await deleteDebt(id);
        await loadData();
    };

    const renderLoanRow = (r: LoanRow, i: number, list: LoanRow[]) => {
        const receivable = !isPayable(r.debt);
        const repaid = `${formatPercent(r.progress)} repaid`;
        let status: { text: string; tone: Tone } | null = null;
        if (r.paid) status = { text: receivable ? 'Received' : 'Paid', tone: 'good' };
        else if (r.isOverdue) status = { text: 'Overdue', tone: 'bad' };
        else if (r.isDueSoon) status = { text: 'Due soon', tone: 'warning' };

        let subtitle = r.debt.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
        if (r.nextDue) {
            const due = `${r.paid ? 'Next due' : 'Due'} ${shortDate(r.nextDue)}`;
            subtitle = f.isDiscreet || r.debt.minPayment.lte(0) ? due : `${due} · ${f.money(r.debt.minPayment)}`;
        }

        return (
            <Row
                key={r.debt.id}
                title={r.debt.name}
                subtitle={subtitle}
                value={f.show(f.money(r.balance), repaid)}
                change={status?.text ?? (f.isDiscreet ? undefined : repaid)}
                changeTone={status?.tone ?? 'neutral'}
                onPress={() => setStatusModalDebt(r.debt)}
                last={i === list.length - 1}
            >
                <ProgressBar percent={r.progress} domain="loans" />
            </Row>
        );
    };

    // Same rules both ways (docs/METRICS.md, Loans Repaid / Obligations Paid): what you owe and repay,
    // or what's owed to you and has been repaid to you.
    const sideHero = (owed: boolean) => {
        const l = owed ? data.owedSnapshot : data.snapshot;
        const stillDue = l.obligationsDue.minus(l.obligationsPaid);
        if (f.isDiscreet) {
            return {
                label: owed ? 'Collected so far' : 'Repaid so far',
                value: formatPercent(l.repaidPercent),
                change: l.dueCount > 0
                    ? `${l.paidCount} of ${l.dueCount} ${owed ? 'repayments received' : 'payments made'} this month`
                    : `No ${owed ? 'repayments' : 'payments'} due this month`,
                changeTone: (l.dueCount > 0 && l.paidCount === l.dueCount ? 'good' : 'neutral') as Tone,
            };
        }
        const parts: string[] = [];
        let changeTone: Tone = 'neutral';
        if (l.repaidPercentPrev !== null) {
            const delta = l.outstanding.minus(l.outstandingPrev);
            if (!delta.isZero()) {
                parts.push(`${delta.lt(0) ? '▼' : '▲'} ${f.money(delta.abs())} this month`);
                if (!f.isHidden) changeTone = delta.lt(0) ? 'good' : 'bad';
            }
        }
        if (l.dueCount > 0) {
            parts.push(stillDue.gt(0) ? `${f.money(stillDue)} still ${owed ? 'expected' : 'due'}` : `all ${owed ? 'received' : 'paid'} this month`);
        }
        return { label: owed ? 'Owed to you' : 'Outstanding', value: f.money(l.outstanding), change: parts.join(' · ') || undefined, changeTone };
    };

    if (!hasLoaded) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={ds.accent} />
            </View>
        );
    }

    if (debts.length === 0) {
        return (
            <ScrollView contentContainerStyle={styles.content}>
                <EmptyState
                    icon="card-outline"
                    title="No loans yet"
                    subtitle="Loans you owe and money owed to you show up here once you add one from Record."
                    ctaLabel="Add a loan"
                    onCtaPress={() => onOpenRecord()}
                />
            </ScrollView>
        );
    }

    const hero = sideHero(side === 'owed');
    const list = side === 'owe' ? data.owe : data.owed;
    const resolved = data.resolved.filter(r => isPayable(r.debt) === (side === 'owe'));
    const leak = f.isOpen ? formatCurrencyAmount(data.interestLeakPerHour, currency) : f.money(data.interestLeakPerHour);

    return (
        <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <SegmentedControl options={SIDES} value={side} onChange={setSide} style={styles.segment} />

                <Hero label={hero.label} value={hero.value} change={hero.change} changeTone={hero.changeTone} style={styles.hero} />

                {side === 'owe' && data.unpayableNames.length > 0 && (
                    <View style={styles.warning}>
                        <Ionicons name="warning-outline" size={18} color={ds.warning} />
                        <Text style={[type.small, styles.warningText, { color: ds.text }]}>
                            {data.unpayableNames.join(', ')} {data.unpayableNames.length === 1 ? "doesn't" : "don't"} cover the interest at the current minimum payment, so the balance won&apos;t shrink. Pay above the minimum to make progress.
                        </Text>
                    </View>
                )}

                <SectionHeader title="Active" actionLabel="New loan" onAction={() => onOpenRecord()} />
                {list.length === 0 ? (
                    <Text style={[type.small, styles.empty, { color: ds.text2 }]}>
                        {side === 'owe' ? 'Nothing you owe right now.' : 'Nobody owes you right now.'}
                    </Text>
                ) : list.map(renderLoanRow)}

                {side === 'owe' && data.owe.length > 0 && (
                    <>
                        <SectionHeader title="Payoff plan" menu={{ options: STRATEGIES, value: strategy, onSelect: key => changeStrategy(key as Strategy) }} />
                        <Text style={[type.small, { color: ds.text2 }]}>
                            {strategy === 'AVALANCHE' ? 'Highest interest rate first: the least interest overall.' : 'Smallest balance first: quick wins.'}
                        </Text>
                        <Row
                            icon="calendar-outline"
                            title="Debt-free by"
                            subtitle="At minimum payments"
                            value={data.debtFreeDate ? monthYear(data.debtFreeDate) : DASH}
                            change={data.monthsToGo !== null ? `${data.monthsToGo} months to go` : undefined}
                        />
                        <Row
                            icon="trending-down-outline"
                            title="Interest still to pay"
                            subtitle={f.show(undefined, 'On top of what you owe')}
                            value={f.show(f.money(data.totalInterest), formatPercent(data.interestSharePercent, { signed: true }))}
                        />
                        <Row
                            icon="water-outline"
                            title="Interest cost"
                            subtitle={f.show("Every hour, at today's rates", 'A year, across what you owe')}
                            value={f.show(leak, formatPercent(data.blendedRatePercent, { decimals: 1 }))}
                        />
                        <Row
                            icon="hourglass-outline"
                            title="Time cost"
                            subtitle="Months of self-sustain borrowed"
                            value={`${data.timeCostMonths.toFixed(1)} mo`}
                            last
                        />
                    </>
                )}

                {resolved.length > 0 && (
                    <>
                        <SectionHeader title="Paid off" />
                        {resolved.map((r, i) => {
                            const lastPayment = transactions
                                .filter(t => t.debtId === r.debt.id && (t.type === 'TRANSFER_OUT' || t.type === 'EXPENSE' || t.type === 'TRANSFER_IN'))
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            const taken = new Date(r.debt.startDate || r.debt.createdAt);
                            const resolution = DebtMetrics.getDebtResolution(r.debt, r.balance) ?? 'PAID';
                            const interestType = isPayable(r.debt) ? 'EXPENSE' : 'INCOME';
                            const interestPaid = transactions
                                .filter(t => t.debtId === r.debt.id && t.type === interestType && (t.category === 'Interest' || t.subCategory === 'INTEREST'))
                                .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));
                            const interestPct = r.debt.initialAmount.gt(0) ? interestPaid.div(r.debt.initialAmount).times(100).toNumber() : null;
                            return (
                                <Row
                                    key={r.debt.id}
                                    title={r.debt.name}
                                    subtitle={`${DebtMetrics.DEBT_RESOLUTION_LABELS[resolution]} · ${monthYear(taken)} → ${monthYear(lastPayment ? new Date(lastPayment.date) : new Date())}`}
                                    value={f.isDiscreet ? undefined : f.money(r.debt.initialAmount)}
                                    change={interestPaid.isZero() ? undefined : `${f.show(f.money(interestPaid, { signed: true }), formatPercent(interestPct, { signed: true }))} interest`}
                                    onPress={() => setStatusModalDebt(r.debt)}
                                    last={i === resolved.length - 1}
                                />
                            );
                        })}
                    </>
                )}

                {side === 'owe' && (
                    <Disclaimer>
                        This math exposes the raw cost of your debt. It doesn&apos;t account for bank re-pricing or hidden fees. Use this to plan your attack, but verify the final numbers with your lender.
                    </Disclaimer>
                )}
            </ScrollView>

            <DebtStatusModal
                visible={!!statusModalDebt}
                onClose={() => setStatusModalDebt(null)}
                debt={statusModalDebt}
                onUpdateStatus={handleUpdateStatus}
                onEdit={handleEditDebt}
                onDelete={handleDeleteDebt}
                onRecordPayment={setPaymentDebt}
                linkedTransaction={statusModalDebt ? transactions.find(t => t.debtId === statusModalDebt.id) || null : null}
            />

            <PaymentSheet
                debt={paymentDebt}
                balance={paymentDebt ? DebtMetrics.calculateCurrentDebtBalance(paymentDebt, transactions) : new BigNumber(0)}
                currency={currency}
                onClose={() => setPaymentDebt(null)}
                onSaved={loadData}
            />
        </>
    );
};

interface PaymentSheetProps {
    // The original debt record (not a display copy).
    debt: Debt | null;
    balance: BigNumber;
    currency: string;
    onClose: () => void;
    onSaved: () => Promise<void>;
}

// The Debts screen's "Record Payment" sheet: principal / interest / fee legs, pre-split from the minimum payment.
const PaymentSheet: React.FC<PaymentSheetProps> = ({ debt, balance, currency, onClose, onSaved }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestAmount, setInterestAmount] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!debt) return;
        const { principal, interest } = DebtMetrics.calculateNextPaymentBreakdown(debt, balance.abs());
        // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form each time a debt is picked
        setPrincipalAmount(principal.toFixed(2));
        setInterestAmount(interest.toFixed(2));
        setFeeAmount('');
    // Only re-split when a different debt is picked, not when balances reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debt?.id]);

    const handleSubmit = async () => {
        if (!debt) return;
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
            // You owe: repaying is cash out and interest a cost. Owed to you: cash in and interest income.
            const payable = isPayable(debt);
            const base = { date: now, transferAccount: debt.type, isRecurring: false, debtId: debt.id, createdAt: now, updatedAt: now };

            let principalTxId = '';
            if (!pAmount.isNaN() && pAmount.gt(0)) {
                principalTxId = generateUUID();
                await saveTransaction({
                    ...base,
                    id: principalTxId,
                    type: payable ? 'TRANSFER_OUT' : 'TRANSFER_IN',
                    amount: pAmount.abs(),
                    category: 'Loans',
                    subCategory: 'PRINCIPAL',
                    note: `Debt Payment: ${debt.name}`,
                });
            }
            if (!iAmount.isNaN() && iAmount.gt(0)) {
                await saveTransaction({
                    ...base,
                    id: generateUUID(),
                    type: payable ? 'EXPENSE' : 'INCOME',
                    amount: iAmount.abs(),
                    category: 'Interest',
                    subCategory: 'INTEREST',
                    note: `Interest Payment: ${debt.name}`,
                    linkedTransactionId: principalTxId || undefined,
                });
            }
            if (!fAmount.isNaN() && fAmount.gt(0)) {
                await saveTransaction({
                    ...base,
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: fAmount.abs(),
                    category: 'Fees',
                    subCategory: 'FEES',
                    note: `Fee/Insurance Payment: ${debt.name}`,
                    linkedTransactionId: principalTxId || undefined,
                });
            }
            await onSaved();
            onClose();
        } catch (error) {
            console.error('Payment Error:', error);
            showAlert('Error', 'Failed to save payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = new BigNumber(principalAmount || 0).plus(interestAmount || 0).plus(feeAmount || 0);
    const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];
    const field = (label: string, help: string, value: string, onChange: (v: string) => void) => (
        <View>
            <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '600' }}>{label}</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 12 }}>{help}</Text>
            <TextInput
                style={inputStyle}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={value}
                onChangeText={onChange}
            />
        </View>
    );

    return (
        <BottomModal
            visible={!!debt}
            onClose={onClose}
            title={debt && !isPayable(debt) ? 'Record Repayment' : 'Record Payment'}
            subtitle={debt ? `For ${debt.name}` : ''}
        >
            <ScrollView>
                <View style={{ gap: 16 }}>
                    {field('Principal Payment', 'Reduces the balance.', principalAmount, setPrincipalAmount)}
                    {field('Interest Payment', 'Cost of borrowing. Does not reduce the balance.', interestAmount, setInterestAmount)}
                    {field('Fee / Insurance Payment', "Mandatory add-ons like mortgage or fire insurance. Fees don't reduce the principal.", feeAmount, setFeeAmount)}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>Total Payment</Text>
                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>{formatCurrencyAmount(total, currency)}</Text>
                    </View>

                    {debt && total.minus(debt.minPayment).abs().gt(0.01) && (
                        <View style={[styles.note, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                                {total.lt(debt.minPayment)
                                    ? 'Payment adjusted to clear likely remaining balance.'
                                    : 'This amount differs from your standard minimum payment.'}
                            </Text>
                        </View>
                    )}

                    <Button title={isSubmitting ? 'Recording...' : 'Confirm Payment'} onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: 8 }} />
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    segment: {
        marginTop: space[4],
    },
    hero: {
        paddingTop: space[5],
    },
    warning: {
        flexDirection: 'row',
        gap: space[2],
        marginTop: space[4],
    },
    warningText: {
        flex: 1,
    },
    empty: {
        paddingVertical: space[3],
    },
    loading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7] * 2,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    note: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
});

export default LoansTab;
