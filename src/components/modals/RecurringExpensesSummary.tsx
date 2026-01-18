import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import BottomModal from './BottomModal';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { formatCurrencyAmount } from '../../utils/currencyUtils';
import { getAllRecurrenceRules } from '../../services/storageService';

interface RecurringExpensesSummaryProps {
    visible: boolean;
    onClose: () => void;
    transactions: Transaction[];
    currency: string;
}

const RecurringExpensesSummary: React.FC<RecurringExpensesSummaryProps> = ({
    visible,
    onClose,
    transactions,
    currency
}) => {
    const { colors } = useTheme();
    const [recurrences, setRecurrences] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (visible) {
            loadRecurrences();
        }
    }, [visible]);

    const loadRecurrences = async () => {
        const data = await getAllRecurrenceRules();
        setRecurrences(data.filter(r => r.transactionTemplate.type === 'EXPENSE'));
    };

    const monthlyTotal = useMemo(() => {
        return recurrences.reduce((sum, r) => {
            const amount = r.transactionTemplate.amount;
            let monthlyAmount = 0;
            switch (r.frequency) {
                case 'DAILY': monthlyAmount = amount * 30; break;
                case 'WEEKLY': monthlyAmount = amount * 4.33; break;
                case 'SEMI_MONTHLY': monthlyAmount = amount * 2; break;
                case 'MONTHLY': monthlyAmount = amount; break;
                case 'QUARTERLY': monthlyAmount = amount / 3; break;
                case 'YEARLY': monthlyAmount = amount / 12; break;
            }
            return sum + monthlyAmount;
        }, 0);
    }, [recurrences]);

    const yearlyTotal = monthlyTotal * 12;

    const groupedByCategory = useMemo(() => {
        const groups: { [key: string]: number } = {};
        recurrences.forEach(r => {
            const amount = r.transactionTemplate.amount;
            const category = r.transactionTemplate.category;
            let monthlyAmount = 0;
            switch (r.frequency) {
                case 'DAILY': monthlyAmount = amount * 30; break;
                case 'WEEKLY': monthlyAmount = amount * 4.33; break;
                case 'SEMI_MONTHLY': monthlyAmount = amount * 2; break;
                case 'MONTHLY': monthlyAmount = amount; break;
                case 'QUARTERLY': monthlyAmount = amount / 3; break;
                case 'YEARLY': monthlyAmount = amount / 12; break;
            }
            groups[category] = (groups[category] || 0) + monthlyAmount;
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]);
    }, [recurrences]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Recurring Expenses"
            subtitle="Monthly commitments"
        >
            {/* Summary Cards */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.primary + '10',
                    padding: 15,
                    borderRadius: 12
                }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Monthly</Text>
                    <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>
                        {formatCurrencyAmount(monthlyTotal, currency)}
                    </Text>
                </View>
                <View style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    padding: 15,
                    borderRadius: 12
                }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Yearly</Text>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                        {formatCurrencyAmount(yearlyTotal, currency)}
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* By Category */}
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>
                    By Category
                </Text>
                {groupedByCategory.map(([category, amount], index) => (
                    <View key={index} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderBottomWidth: index < groupedByCategory.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border
                    }}>
                        <Text style={{ color: colors.text, fontSize: 14 }}>{category}</Text>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                            {formatCurrencyAmount(amount, currency)}/mo
                        </Text>
                    </View>
                ))}

                {recurrences.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                            No recurring expenses set up yet
                        </Text>
                    </View>
                )}
            </ScrollView>
        </BottomModal>
    );
};

export default RecurringExpensesSummary;
