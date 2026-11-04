import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ChangeLine, Group, Row, Sheet } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { PrivacyFormat } from '@hooks/usePrivacyFormat';
import { DebtScenario, FinancialHealthData } from '@hooks/useFinancialHealth';
import { HEALTH_METRIC_IDS, HealthMetricId } from '@services/core/storageService';
import { type, space } from '@styles/theme';
import { HEALTH_METRIC_META, HealthEntry } from './financialHealthPool';
import { DebtDetail, Formula, HowCalculated, RunwayDetail, SheetHero, SpendingDetail, StatLine, WealthDetail } from './FinancialHealthDetails';

export type HealthSheetTarget = HealthMetricId | 'all';

// Formula + one explanation line for the numbers without a full Financial Health sheet.
const SIMPLE_EXPLANATIONS: Record<Exclude<HealthMetricId, 'runway' | 'spending' | 'debt' | 'wealth'>, { formula: string; explanation: string }> = {
    budget: {
        formula: 'Spent in budgeted categories ÷ Total budgets × 100',
        explanation: "What share of this month's budgets you've used. Purchases funded from a savings goal don't count: the goal was their budget.",
    },
    netflow: {
        formula: '(Income + Transfers in) − (Expenses + Transfers out)',
        explanation: 'Goal contributions and goal-funded purchases net out. Discreet shows it as a share of the month\'s income.',
    },
    savings: {
        formula: '(Income − Expenses − Debt principal repaid) ÷ Income × 100',
        explanation: 'Goal-funded purchases aren\'t counted as spent. 20% or more reads as healthy.',
    },
    income: {
        formula: 'Sum of income for the month',
        explanation: 'Discreet compares it with your average over up to 6 prior full months.',
    },
    expense: {
        formula: 'Expenses for the month, excluding goal-funded purchases',
        explanation: 'Goal purchases show separately as "+ from goals", since their cash left when you contributed to the goal. Discreet shows expenses as a share of income.',
    },
    burn: {
        formula: 'Average monthly spending (up to 6 full months) + Debt minimum payments + Goal contributions',
        explanation: "Debt interest is inside the minimum payments, so it isn't counted twice; debt fees are. Discreet shows it as a share of your average monthly income.",
    },
    daily: {
        formula: 'Expenses this month ÷ Days elapsed (a past month ÷ its length)',
        explanation: 'Compare months or set a daily target. Discreet compares it with your daily average over the 3 prior full months.',
    },
    annual: {
        formula: 'Burn rate × 12',
        explanation: 'A year of your current monthly costs. Discreet shows it as a share of a year of your average income.',
    },
    topcat: {
        formula: 'Largest expense category for the month',
        explanation: 'Goal-funded purchases are included, as in the spending breakdown.',
    },
};

const BudgetColorGuide: React.FC = () => {
    const { ds } = useTheme();
    const rows: [string, string, string][] = [
        ['Up to 70%', 'Healthy, plenty left', ds.success],
        ['70–90%', 'Getting close to the limit', ds.warning],
        ['Above 90%', 'Over budget or very close', ds.danger],
    ];
    return (
        <View style={styles.guide}>
            {rows.map(([range, meaning, color]) => (
                <View key={range} style={styles.guideRow}>
                    <View style={[styles.guideDot, { backgroundColor: color }]} />
                    <Text style={[type.small, { color: ds.text }]}>{range}</Text>
                    <Text style={[type.small, { color: ds.text2 }]}>{meaning}</Text>
                </View>
            ))}
        </View>
    );
};

interface FinancialHealthSheetProps {
    target: HealthSheetTarget | null;
    onClose: () => void;
    onSelect: (id: HealthMetricId) => void;
    entries: Record<HealthMetricId, HealthEntry>;
    grid: HealthMetricId[];
    health: FinancialHealthData | null;
    scenario: DebtScenario;
    format: PrivacyFormat;
}

// One sheet for "Show all" and every metric's detail: picking a row swaps the content, never stacks a second modal.
const FinancialHealthSheet: React.FC<FinancialHealthSheetProps> = ({ target, onClose, onSelect, entries, grid, health, scenario, format }) => {
    const { ds } = useTheme();

    const renderAll = () => (
        <Group>
            {HEALTH_METRIC_IDS.map((id, i) => {
                const meta = HEALTH_METRIC_META[id];
                const entry = entries[id];
                const slot = grid.indexOf(id);
                return (
                    <Row
                        key={id}
                        icon={meta.icon}
                        title={meta.label}
                        value={entry.value}
                        onPress={() => onSelect(id)}
                        last={i === HEALTH_METRIC_IDS.length - 1}
                    >
                        {slot >= 0
                            ? <Text style={[type.captionMedium, { color: ds.accent }]}>Card {slot + 1}</Text>
                            : <ChangeLine text={entry.change} tone={format.isHidden ? 'neutral' : entry.changeTone} />}
                    </Row>
                );
            })}
        </Group>
    );

    const renderSimple = (id: keyof typeof SIMPLE_EXPLANATIONS) => {
        const entry = entries[id];
        const { formula, explanation } = SIMPLE_EXPLANATIONS[id];
        return (
            <>
                <SheetHero
                    label={HEALTH_METRIC_META[id].label}
                    value={entry.value}
                    change={entry.change}
                    changeTone={format.isHidden ? 'neutral' : entry.changeTone}
                />
                <HowCalculated>
                    <Formula formula={formula} explanation={explanation} />
                    {id === 'budget' && <BudgetColorGuide />}
                </HowCalculated>
            </>
        );
    };

    const renderDetail = (id: HealthMetricId) => {
        if (id === 'runway' || id === 'spending' || id === 'debt' || id === 'wealth') {
            if (!health) {
                return (
                    <>
                        <SheetHero label={HEALTH_METRIC_META[id].label} value={entries[id].value} change="Loading" />
                        <Group><StatLine label="Calculating from your latest data" value="" last /></Group>
                    </>
                );
            }
            if (id === 'runway') return <RunwayDetail data={health} format={format} />;
            if (id === 'spending') return <SpendingDetail data={health} format={format} />;
            if (id === 'debt') return <DebtDetail data={health} format={format} scenario={scenario} />;
            return <WealthDetail data={health} format={format} />;
        }
        return renderSimple(id);
    };

    return (
        <Sheet
            visible={target !== null}
            onClose={onClose}
            title={target === 'all' ? 'Financial health' : undefined}
            subtitle={target === 'all' ? `All ${HEALTH_METRIC_IDS.length} numbers. Tap one for details.` : undefined}
        >
            {/* Keyed so a collapsible's open state doesn't carry over to the next metric. */}
            <View key={target ?? 'none'}>
                {target === 'all' && renderAll()}
                {target && target !== 'all' && renderDetail(target)}
            </View>
        </Sheet>
    );
};

const styles = StyleSheet.create({
    guide: {
        gap: space[2],
        marginTop: space[1],
    },
    guideRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    guideDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});

export default FinancialHealthSheet;
