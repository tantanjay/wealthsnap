import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { RecurrenceRule } from '@types';
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
    const { colors } = useTheme();

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
                const amount = r.transactionTemplate.amount;

                groups[category] = (groups[category] || new BigNumber(0)).plus(amount.abs());
            });
        return Object.entries(groups).sort((a, b) => {
            return b[1].comparedTo(a[1]) ?? 0;
        });
    }, [recurrences]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Recurring Expenses"
            subtitle="Monthly commitments"
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Total Section */}
                <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 5 }}>Total Monthly Commitment</Text>
                    <Text style={{ color: colors.text, fontSize: 28, fontWeight: 'bold' }}>
                        {formatCurrencyAmount(totalMonthly, currency)}
                    </Text>
                </View>

                {/* Upcoming Due */}
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Upcoming Due</Text>
                <View style={{ marginBottom: 20 }}>
                    {upcoming.map(item => (
                        <View key={item.id} style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 12,
                            backgroundColor: colors.surface,
                            marginBottom: 8,
                            borderRadius: 12
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.primary + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{item.transactionTemplate.category}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        Due {new Date(item.nextDueDate).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ color: colors.text, fontWeight: '600' }}>
                                {formatCurrencyAmount(item.transactionTemplate.amount, currency)}
                            </Text>
                        </View>
                    ))}
                    {upcoming.length === 0 && (
                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No active recurring expenses.</Text>
                    )}
                </View>

                {/* Breakdown */}
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>By Category</Text>
                <View style={{ marginBottom: 20 }}>
                    {categoryBreakdown.map(([cat, amount]) => (
                        <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: colors.textSecondary }}>{cat}</Text>
                            <Text style={{ color: colors.text, fontWeight: '500' }}>{formatCurrencyAmount(amount, currency)}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </BottomModal>
    );
};

export default RecurringExpensesSummaryModal;
