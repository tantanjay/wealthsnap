import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { ProgressBar, SectionHeader, toneColor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { PrivacyFormat } from '@hooks/usePrivacyFormat';
import { type, space } from '@styles/theme';
import { budgetTone } from './financialHealthPool';

export interface BudgetLine {
    category: string;
    spent: BigNumber;
    budget: BigNumber;
    percent: number;
}

interface BudgetsSectionProps {
    // Sorted most-used first.
    lines: BudgetLine[];
    // "October", or "Oct 26" while browsing a past month.
    monthLabel: string;
    format: PrivacyFormat;
}

// Only the most-used budgets show on the page; "Show all" lists every one in a sheet.
const COLLAPSED_COUNT = 5;

const countSummary = (lines: BudgetLine[]): string => {
    const over = lines.filter(l => l.percent > 100).length;
    const close = lines.filter(l => l.percent > 70 && l.percent <= 100).length;
    const fine = lines.length - over - close;
    return [
        over > 0 ? `${over} over` : null,
        close > 0 ? `${close} close to the limit` : null,
        fine > 0 ? `${fine} on track` : null,
    ].filter(Boolean).join(' · ');
};

// Each budget's share used this month; same colors as Budget Health. Hidden when no budgets are set.
const BudgetsSection: React.FC<BudgetsSectionProps> = ({ lines, monthLabel, format: f }) => {
    const { ds } = useTheme();
    const [showAll, setShowAll] = useState(false);
    if (lines.length === 0) return null;

    const hasMore = lines.length > COLLAPSED_COUNT;
    const title = `Budgets · ${monthLabel}`;

    const renderRows = (list: BudgetLine[]) => list.map((line, i) => {
        const tone = budgetTone(line.percent);
        return (
            <View key={line.category} style={[styles.row, { borderBottomColor: ds.hairline, borderBottomWidth: i === list.length - 1 ? 0 : 1 }]}>
                <View style={styles.top}>
                    <Text style={[type.body, styles.name, { color: ds.text }]} numberOfLines={1}>{line.category}</Text>
                    {/* Discreet leaves the amounts out; the % carries it. */}
                    {!f.isDiscreet && (
                        <Text style={[type.smallNum, { color: ds.text2 }]} numberOfLines={1}>
                            {f.money(line.spent, { compact: true })} / {f.money(line.budget, { compact: true })}
                        </Text>
                    )}
                    <Text style={[type.bodyNum, styles.percent, { color: toneColor(ds, tone) }]}>{line.percent.toFixed(0)}%</Text>
                </View>
                <ProgressBar percent={line.percent} tone={tone === 'neutral' ? undefined : tone} style={styles.bar} />
            </View>
        );
    });

    return (
        <View>
            <SectionHeader
                title={title}
                actionLabel={hasMore ? `Show all (${lines.length})` : undefined}
                onAction={hasMore ? () => setShowAll(true) : undefined}
            />
            <Text style={[type.small, styles.summary, { color: ds.text2 }]}>{countSummary(lines)}</Text>
            {renderRows(lines.slice(0, COLLAPSED_COUNT))}

            <BottomModal visible={showAll} onClose={() => setShowAll(false)} title={title} subtitle={countSummary(lines)} maxHeight="85%">
                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderRows(lines)}
                </ScrollView>
            </BottomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    summary: {
        marginBottom: space[1],
    },
    row: {
        paddingVertical: space[2],
    },
    top: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: space[3],
    },
    name: {
        flex: 1,
        minWidth: 0,
    },
    percent: {
        minWidth: 48,
        textAlign: 'right',
    },
    bar: {
        marginTop: space[1],
    },
});

export default BudgetsSection;
