import { View, Text, TouchableOpacity, FlatList, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '../common/BottomModal';
import { Card } from '..';
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
            style={{ height: '70%' }}
            contentStyle={{ flex: 1 }}
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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                                        {item.name || item.transactionTemplate.category}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary }}>
                                        {item.frequency} • {formatCurrencyAmount(item.transactionTemplate.amount, currency)}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                        Next due: {new Date(item.nextDueDate).toLocaleDateString()}
                                    </Text>
                                </View>

                                <View style={{ alignItems: 'center', gap: 15 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>
                                            {item.isActive ? 'Active' : 'Paused'}
                                        </Text>
                                        <Switch
                                            value={item.isActive}
                                            onValueChange={() => onToggleRule(item)}
                                            trackColor={{ false: colors.border, true: colors.primary }}
                                            thumbColor={item.isActive ? '#fff' : '#f4f3f4'}
                                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => onDeleteRule(item.id)}
                                        style={{ padding: 5 }}
                                    >
                                        <Ionicons name="trash-outline" size={24} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Card>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </BottomModal>
    );
};
