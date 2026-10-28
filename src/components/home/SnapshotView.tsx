import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';
import { Hero, IconName, ProgressBar, Row, SectionHeader, Tone } from '@components/ds';
import { EXPENSE_CATEGORY_GROUPS, INCOME_CATEGORY_GROUPS } from '@constants/categories';
import { PrivacyFormat, DASH, formatPercent, formatPoints } from '@hooks/usePrivacyFormat';
import { SnapshotPeriod, SnapshotRowId } from '@services/core/storageService';
import { Transaction } from '@types';
import { RunwayTrend } from '@utils/financialMetrics';
import { RecentTransaction } from '@utils/historyFeed';
import {
    CashKept,
    GoalsSnapshot,
    InvestmentSnapshot,
    LoansSnapshot,
    MonthCashFlow,
    NetWorthChange,
} from '@utils/snapshotMetrics';
import { SNAPSHOT_ROW_META } from './SnapshotOrderList';

export interface SnapshotData {
    netWorth: NetWorthChange;
    runway: RunwayTrend;
    cash: CashKept;
    month: MonthCashFlow;
    prevMonth: MonthCashFlow;
    investments: InvestmentSnapshot;
    loans: LoansSnapshot;
    goals: GoalsSnapshot;
    recent: RecentTransaction[];
}

interface SnapshotViewProps {
    data: SnapshotData;
    format: PrivacyFormat;
    order: SnapshotRowId[];
    period: SnapshotPeriod;
    onTogglePeriod: () => void;
    onDetails: () => void;
    onRowPress: (id: SnapshotRowId) => void;
    onSeeAllRecent: () => void;
}

interface OverviewRow {
    subtitle: string;
    value: string;
    change?: string;
    changeTone?: Tone;
    // Discreet only.
    progress?: number | null;
}

const toneOf = (value: number, goodWhenUp = true): Tone => {
    if (value === 0) return 'neutral';
    return (value > 0) === goodWhenUp ? 'good' : 'bad';
};

const ptsChange = (now: number | null, prev: number | null, goodWhenUp = true): Pick<OverviewRow, 'change' | 'changeTone'> =>
    now === null || prev === null ? {} : { change: formatPoints(now - prev), changeTone: toneOf(Math.round(now - prev), goodWhenUp) };

// Money change line; omitted when nothing moved.
const moneyChange = (f: PrivacyFormat, delta: BigNumber, goodWhenUp = true): Pick<OverviewRow, 'change' | 'changeTone'> =>
    delta.isZero() ? {} : { change: f.money(delta, { signed: true }), changeTone: f.isHidden ? 'neutral' : toneOf(delta.toNumber(), goodWhenUp) };

const shortMonth = (offset: number) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleString('default', { month: 'short' });
};

const cashRow = (d: SnapshotData, period: SnapshotPeriod, f: PrivacyFormat): OverviewRow => {
    if (period === 'month') {
        const { month, prevMonth } = d;
        const transfers = month.transfersNet.isZero() ? '' : ` · Transfers ${f.money(month.transfersNet, { signed: true, compact: true })}`;
        const vsLabel = `vs ${shortMonth(-1)}`;
        return {
            subtitle: f.show(`Income ${f.money(month.income, { compact: true })} − Expense ${f.money(month.expense, { compact: true })}${transfers}`, 'Savings rate this month'),
            value: f.show(f.money(month.monthlyNet, { signed: true }), formatPercent(month.savingsRate)),
            ...(f.isDiscreet
                ? ptsChange(month.savingsRate, prevMonth.savingsRate)
                : {
                    change: `${vsLabel} ${f.money(prevMonth.monthlyNet, { signed: true })}`,
                    changeTone: f.isHidden ? 'neutral' : toneOf(month.monthlyNet.comparedTo(prevMonth.monthlyNet) ?? 0),
                }),
        };
    }
    const { cash } = d;
    return {
        subtitle: f.show(`In ${f.money(cash.moneyIn, { compact: true })} · Out ${f.money(cash.moneyOut, { compact: true })}`, 'Cash kept of lifetime income'),
        value: f.show(f.money(cash.cash), formatPercent(cash.keptPercent)),
        ...(f.isDiscreet
            ? ptsChange(cash.keptPercent, cash.keptPercentPrev)
            : !cash.hasPrev ? {} : moneyChange(f, cash.cash.minus(cash.cashPrev))),
    };
};

const investmentsRow = (d: SnapshotData, period: SnapshotPeriod, f: PrivacyFormat): OverviewRow => {
    const inv = d.investments;
    if (period === 'month') {
        return {
            subtitle: f.show('Invested this month', "Return on this month's buys"),
            value: f.show(f.money(inv.monthInvested), formatPercent(inv.monthBuysPercent, { signed: true, decimals: 1 })),
            ...(f.isDiscreet || inv.monthBuysPercent === null
                ? {}
                : { change: `P/L ${f.money(inv.monthBuysPL, { signed: true })}`, changeTone: f.isHidden ? 'neutral' : toneOf(inv.monthBuysPL.toNumber()) }),
        };
    }
    if (!inv.hasHoldings) {
        return { subtitle: 'No holdings yet', value: f.show(f.money(0), DASH) };
    }
    const returnText = formatPercent(inv.unrealizedPercent, { signed: true, decimals: 1 });
    return {
        subtitle: f.show(
            `Unrealized ${f.money(inv.unrealizedPL, { signed: true, compact: true })}`,
            `Unrealized return · top holding ${formatPercent(inv.topHoldingPercent)}`,
        ),
        value: f.show(f.money(inv.marketValue), returnText),
        ...(f.isDiscreet || inv.unrealizedPercent === null
            ? {}
            : { change: returnText, changeTone: toneOf(inv.unrealizedPercent) }),
    };
};

const loansRow = (d: SnapshotData, period: SnapshotPeriod, f: PrivacyFormat): OverviewRow => {
    const l = d.loans;
    if (period === 'month') {
        if (l.dueCount === 0) return { subtitle: 'No payments due this month', value: f.show(f.money(0), DASH) };
        const left = l.obligationsDue.minus(l.obligationsPaid);
        return {
            subtitle: 'Obligations paid',
            value: f.show(`${f.money(l.obligationsPaid)} of ${f.money(l.obligationsDue)}`, `${l.paidCount} of ${l.dueCount}`),
            change: f.show(`${f.money(left)} left`, `${l.dueCount - l.paidCount} left`),
            changeTone: 'neutral',
            progress: l.obligationsDue.gt(0) ? l.obligationsPaid.dividedBy(l.obligationsDue).times(100).toNumber() : null,
        };
    }
    if (!l.hasLoans) return { subtitle: 'No loans you owe', value: f.show(f.money(0), DASH) };
    const dueLine = l.dueCount === 0
        ? 'No payments due'
        : f.show(
            `${f.money(l.obligationsPaid, { compact: true })} of ${f.money(l.obligationsDue, { compact: true })} due this month`,
            `${l.paidCount} of ${l.dueCount} paid this month`,
        );
    return {
        subtitle: dueLine,
        value: f.show(f.money(l.outstanding), `${formatPercent(l.repaidPercent)} repaid`),
        ...(f.isDiscreet
            ? ptsChange(l.repaidPercent, l.repaidPercentPrev)
            : l.repaidPercentPrev === null ? {} : moneyChange(f, l.outstanding.minus(l.outstandingPrev), false)),
        progress: l.repaidPercent,
    };
};

const goalsRow = (d: SnapshotData, period: SnapshotPeriod, f: PrivacyFormat): OverviewRow => {
    const g = d.goals;
    if (g.count === 0) return { subtitle: 'No goals yet', value: f.show(f.money(0), DASH) };
    if (period === 'month') {
        const plan: Pick<OverviewRow, 'change' | 'changeTone'> = g.onPlan === null
            ? {}
            : g.onPlan ? { change: 'on plan', changeTone: 'good' } : { change: 'behind plan', changeTone: 'warning' };
        return {
            subtitle: f.show('Contributed this month', 'Goals funded this month'),
            value: f.show(f.money(g.monthContributed, { signed: true }), g.fundableCount > 0 ? `${g.fundedCount} of ${g.fundableCount}` : 'All reached'),
            ...plan,
            progress: g.fundableCount > 0 ? (g.fundedCount / g.fundableCount) * 100 : null,
        };
    }
    return {
        subtitle: f.show(
            `${formatPercent(g.progressPercent)} of ${f.money(g.target, { compact: true })}`,
            `${g.count} ${g.count === 1 ? 'goal' : 'goals'} · ${g.onTrackCount} on track`,
        ),
        value: f.show(f.money(g.total), formatPercent(g.progressPercent)),
        ...(f.isDiscreet ? ptsChange(g.progressPercent, g.progressPercentPrev) : moneyChange(f, g.monthNetContributed)),
        progress: g.progressPercent,
    };
};

const ROW_BUILDERS: Record<SnapshotRowId, (d: SnapshotData, p: SnapshotPeriod, f: PrivacyFormat) => OverviewRow> = {
    cash: cashRow,
    investments: investmentsRow,
    loans: loansRow,
    goals: goalsRow,
};

const MONTH_TITLES: Partial<Record<SnapshotRowId, string>> = { cash: 'Monthly net' };

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
    [...EXPENSE_CATEGORY_GROUPS, ...INCOME_CATEGORY_GROUPS].flatMap(g => g.items.map(i => [i.value, i.icon])),
);

export const transactionIcon = (t: Transaction): IconName => {
    if (t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT') return 'swap-horizontal-outline';
    const base = CATEGORY_ICONS[t.category];
    const outline = `${base}-outline`;
    if (base && outline in Ionicons.glyphMap) return outline as IconName;
    if (base && base in Ionicons.glyphMap) return base as IconName;
    return t.type === 'INCOME' ? 'wallet-outline' : 'receipt-outline';
};

const heroContent = (d: SnapshotData, f: PrivacyFormat) => {
    const { change, percent, now } = d.netWorth;
    const arrow = change === null || change.isZero() ? '' : change.gt(0) ? '▲ ' : '▼ ';
    const changeTone: Tone = change === null || f.isHidden ? 'neutral' : toneOf(change.toNumber());

    let changeText: string | undefined;
    if (change !== null) {
        if (change.isZero()) changeText = 'No change this month';
        else if (f.isDiscreet) changeText = `${arrow}${change.gt(0) ? 'up' : 'down'} from last month`;
        else {
            const pct = percent === null || f.isHidden ? '' : ` · ${formatPercent(Math.abs(percent), { decimals: 1 })}`;
            changeText = `${arrow}${f.money(change.abs())}${pct} this month`;
        }
    }

    const runway = d.runway.runway;
    return {
        label: f.show('Projected net worth', 'Net worth this month'),
        value: f.show(f.money(now.netWorth), change === null ? DASH : formatPercent(percent, { signed: true, decimals: 1 })),
        change: changeText,
        changeTone,
        stats: [
            { label: 'Runway', value: runway.isFinite() ? `${runway.toNumber().toFixed(1)} mo` : '∞' },
            f.show({ label: 'Assets', value: f.money(now.assets, { compact: true }) }, { label: 'Savings rate', value: formatPercent(d.month.savingsRate) }),
        ],
    };
};

const SnapshotView: React.FC<SnapshotViewProps> = ({ data, format: f, order, period, onTogglePeriod, onDetails, onRowPress, onSeeAllRecent }) => {
    const { ds } = useTheme();
    const hero = heroContent(data, f);

    return (
        <View>
            <Hero
                label={hero.label}
                value={hero.value}
                change={hero.change}
                changeTone={hero.changeTone}
                sparkline={data.netWorth.sparkline}
                stats={hero.stats}
                actionLabel="Details"
                onAction={onDetails}
                style={styles.hero}
            />

            <SectionHeader title="Overview" actionLabel={`${period === 'overall' ? 'Overall' : 'This month'} ⌄`} onAction={onTogglePeriod} />
            {order.map((id, i) => {
                const row = ROW_BUILDERS[id](data, period, f);
                const meta = SNAPSHOT_ROW_META[id];
                return (
                    <Row
                        key={id}
                        domain={meta.domain}
                        title={(period === 'month' && MONTH_TITLES[id]) || meta.label}
                        subtitle={row.subtitle}
                        value={row.value}
                        change={row.change}
                        changeTone={row.changeTone}
                        onPress={() => onRowPress(id)}
                        last={i === order.length - 1}
                    >
                        {f.isDiscreet && row.progress != null ? <ProgressBar percent={row.progress} domain={meta.domain} /> : null}
                    </Row>
                );
            })}

            <SectionHeader title="Recent" actionLabel="See all" onAction={onSeeAllRecent} />
            {data.recent.length === 0 ? (
                <Text style={[type.small, styles.emptyRecent, { color: ds.text2 }]}>No transactions yet.</Text>
            ) : data.recent.map(({ transaction: t, amount }, i) => {
                const date = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const isTransfer = t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT';
                return (
                    <Row
                        key={t.id}
                        icon={transactionIcon(t)}
                        title={t.note || t.category}
                        subtitle={t.note ? `${t.category} · ${date}` : date}
                        // Discreet leaves transaction amounts out entirely.
                        value={f.isDiscreet ? undefined : f.money(amount, { signed: true })}
                        valueTone={isTransfer ? 'neutral' : t.type === 'INCOME' && !f.isHidden ? 'good' : undefined}
                        onPress={onSeeAllRecent}
                        last={i === data.recent.length - 1}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    hero: {
        paddingTop: space[5],
    },
    emptyRecent: {
        paddingVertical: space[3],
    },
});

export default SnapshotView;
