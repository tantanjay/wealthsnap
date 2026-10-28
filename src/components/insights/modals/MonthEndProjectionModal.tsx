import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Hero, ProgressBar, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { type, space } from '@styles/theme';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { getMonthEndProjection } from '@utils/financialMetrics';
import { SEVERITY_ICON } from '@utils/severity';

interface MonthEndProjectionProps {
    visible: boolean;
    onClose: () => void;
    transactions: Transaction[];
    currency: string;
}

const MonthEndProjectionModal: React.FC<MonthEndProjectionProps> = ({
    visible,
    onClose,
    transactions,
    currency
}) => {
    const { ds } = useTheme();

    const projection = useMemo(() => {
        return getMonthEndProjection(transactions);
    }, [transactions]);

    const savingsRate = projection.projectedIncome.isGreaterThan(0)
        ? projection.projectedSavings
            .dividedBy(projection.projectedIncome)
            .times(100)
        : new BigNumber(0);

    const savingsTone = projection.projectedSavings.isGreaterThanOrEqualTo(0) ? 'good' : 'bad';

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Month-end projection"
            subtitle={`${projection.daysRemaining} days remaining`}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Hero
                    label="Projected savings"
                    value={formatCurrencyAmount(projection.projectedSavings, currency)}
                    change={`${savingsRate.toFixed(1)}% savings rate`}
                    changeTone={savingsRate.isGreaterThanOrEqualTo(0) ? savingsTone : 'bad'}
                    stats={projection.debtPrincipalRepaid.isGreaterThan(0)
                        ? [{ label: 'After debt principal repaid', value: formatCurrencyAmount(projection.debtPrincipalRepaid, currency) }]
                        : undefined}
                />

                <View style={styles.progress}>
                    <View style={styles.progressLine}>
                        <Text style={[type.small, { color: ds.text2 }]}>Month progress</Text>
                        <Text style={[type.smallMediumNum, { color: ds.text }]}>{Math.round(projection.progress)}%</Text>
                    </View>
                    <ProgressBar percent={projection.progress} />
                </View>

                <SectionHeader title="Income" />
                <Row title="Current" value={formatCurrencyAmount(projection.currentIncome, currency)} />
                <Row title="Projected" value={formatCurrencyAmount(projection.projectedIncome, currency)} valueTone="good" last />

                <SectionHeader title="Expenses" />
                <Row title="Current" value={formatCurrencyAmount(projection.currentExpense, currency)} />
                <Row title="Projected" value={formatCurrencyAmount(projection.projectedExpense, currency)} valueTone="bad" last />

                <View style={styles.insight}>
                    <Ionicons name={SEVERITY_ICON.info} size={20} color={ds.text2} />
                    <Text style={[type.small, styles.insightText, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.text }]}>New account? </Text>
                        If you have less than 1 month of history, this uses a simple daily average. Once you track more months, it switches to Smart Projection based on your historical patterns.
                    </Text>
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    progress: {
        marginTop: space[5],
    },
    progressLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    insight: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[3],
        marginTop: space[6],
    },
    insightText: {
        flex: 1,
    },
});

export default MonthEndProjectionModal;
