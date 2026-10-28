import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, ScrollView, StyleSheet } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { Hero, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { RecurrenceRule } from '@types';
import { type, space } from '@styles/theme';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface RecurringExpensesSummaryProps {
    visible: boolean;
    onClose: () => void;
    recurrences: RecurrenceRule[];
    currency: string;
}

const RecurringExpensesSummaryModal: React.FC<RecurringExpensesSummaryProps> = ({
    visible,
    onClose,
    recurrences = [],
    currency
}) => {
    const { ds } = useTheme();

    const totalMonthly = useMemo(() => {
        return recurrences
            .filter(r => r.isActive && r.transactionTemplate.type === 'EXPENSE')
            .reduce((sum, r) => {
                const amount = new BigNumber(r.transactionTemplate.amount || 0);
                let monthlyAmount = new BigNumber(0);
                switch (r.frequency) {
                    case 'DAILY': monthlyAmount = amount.multipliedBy(30); break;
                    case 'WEEKLY': monthlyAmount = amount.multipliedBy(4.333); break;
                    case 'SEMI_MONTHLY': monthlyAmount = amount.multipliedBy(2); break;
                    case 'MONTHLY': monthlyAmount = amount; break;
                    case 'QUARTERLY': monthlyAmount = amount.dividedBy(3); break;
                    case 'YEARLY': monthlyAmount = amount.dividedBy(12); break;
                    default: monthlyAmount = amount;
                }
                return sum.plus(monthlyAmount);
            }, new BigNumber(0));
    }, [recurrences]);

    const upcoming = useMemo(() => {
        return recurrences
            .filter(r => r.isActive && r.transactionTemplate.type === 'EXPENSE')
            .sort((a, b) => {
                return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
            })
            .slice(0, 3);
    }, [recurrences]);

    const categoryBreakdown = useMemo(() => {
        const groups: Record<string, BigNumber> = {};

        recurrences
            .filter(r => r.isActive && r.transactionTemplate.type === 'EXPENSE')
            .forEach(r => {
                const category = r.transactionTemplate.category;

                // 1. Ensure we have a valid BigNumber instance from the template amount
                // 2. Default to 0 if amount is null/undefined/invalid
                const rawAmount = new BigNumber(r.transactionTemplate.amount ?? 0);

                // 3. Check if the BigNumber is valid (isNaN check)
                const amount = rawAmount.isNaN() ? new BigNumber(0) : rawAmount.abs();

                groups[category] = (groups[category] || new BigNumber(0)).plus(amount);
            });
        return Object.entries(groups).sort((a, b) => {
            return b[1].comparedTo(a[1]) ?? 0;
        });
    }, [recurrences]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Recurring expenses"
            subtitle="Monthly commitments"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Hero label="Total monthly commitment" value={formatCurrencyAmount(totalMonthly, currency)} />

                <SectionHeader title="Upcoming due" />
                {upcoming.map((item, i) => (
                    <Row
                        key={item.id}
                        icon="calendar-outline"
                        title={item.transactionTemplate.category}
                        subtitle={`Due ${new Date(item.nextDueDate).toLocaleDateString()}`}
                        value={formatCurrencyAmount(item.transactionTemplate.amount, currency)}
                        last={i === upcoming.length - 1}
                    />
                ))}
                {upcoming.length === 0 && (
                    <Text style={[type.small, styles.empty, { color: ds.text2 }]}>No active recurring expenses.</Text>
                )}

                <SectionHeader title="By category" />
                {categoryBreakdown.map(([cat, amount], i) => (
                    <Row
                        key={cat}
                        title={cat}
                        value={formatCurrencyAmount(amount, currency)}
                        last={i === categoryBreakdown.length - 1}
                    />
                ))}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    empty: {
        paddingVertical: space[3],
    },
});

export default RecurringExpensesSummaryModal;
