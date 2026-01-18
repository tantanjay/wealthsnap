import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import BottomModal from './BottomModal';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { RecurrenceRule } from '../../types';
import { formatCurrencyAmount } from '../../utils/currencyUtils';

interface RecurringRulesListModalProps {
    visible: boolean;
    onClose: () => void;
    rules: RecurrenceRule[];
    onToggleRule: (rule: RecurrenceRule) => void;
    onDeleteRule: (id: string) => void;
    currency: string;
}

export const RecurringRulesListModal: React.FC<RecurringRulesListModalProps> = ({
    visible,
    onClose,
    rules,
    onToggleRule,
    onDeleteRule,
    currency
}) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Recurring Transactions"
        >
            {rules.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary }}>No recurring rules found.</Text>
                </View>
            ) : (
                <FlatList
                    data={rules}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <Card style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{item.name || item.transactionTemplate.category}</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={() => onToggleRule(item)}>
                                        <Text style={{ color: item.isActive ? colors.success : colors.textSecondary, fontWeight: '600' }}>
                                            {item.isActive ? 'Active' : 'Paused'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDeleteRule(item.id)}>
                                        <Text style={{ color: colors.error, fontWeight: '600' }}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={{ color: colors.textSecondary }}>
                                {item.frequency} • {formatCurrencyAmount(item.transactionTemplate.amount, currency)}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                Next due: {new Date(item.nextDueDate).toLocaleDateString()}
                            </Text>
                        </Card>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </BottomModal>
    );
};
