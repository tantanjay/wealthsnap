import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BigNumber } from 'bignumber.js';

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
    lines: BudgetLine[];
    // "October", or "Oct 26" while browsing a past month.
    monthLabel: string;
    format: PrivacyFormat;
}

// Each budget's share used this month; same colors as Budget Health. Hidden when no budgets are set.
const BudgetsSection: React.FC<BudgetsSectionProps> = ({ lines, monthLabel, format: f }) => {
    const { ds } = useTheme();
    if (lines.length === 0) return null;

    return (
        <View>
            <SectionHeader title={`Budgets · ${monthLabel}`} />
            {lines.map((line, i) => {
                const tone = budgetTone(line.percent);
                return (
                    <View key={line.category} style={[styles.row, { borderBottomColor: ds.hairline, borderBottomWidth: i === lines.length - 1 ? 0 : 1 }]}>
                        <View style={styles.top}>
                            <View style={styles.main}>
                                <Text style={[type.body, { color: ds.text }]} numberOfLines={1}>{line.category}</Text>
                                {!f.isDiscreet && (
                                    <Text style={[type.smallNum, { color: ds.text2 }]}>{f.money(line.spent)} of {f.money(line.budget)}</Text>
                                )}
                            </View>
                            <Text style={[type.bodyNum, { color: toneColor(ds, tone) }]}>{line.percent.toFixed(0)}%</Text>
                        </View>
                        <ProgressBar percent={line.percent} tone={tone === 'neutral' ? undefined : tone} />
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        paddingVertical: space[3],
    },
    top: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
});

export default BudgetsSection;
