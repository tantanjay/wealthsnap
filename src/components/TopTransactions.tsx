import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components';
import { Transaction } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrencyAmount } from '../utils/currencyUtils';

interface TopTransactionsProps {
    transactions: Transaction[];
    currency: string;
    onTransactionPress?: (transaction: Transaction) => void;
}

const TopTransactions: React.FC<TopTransactionsProps> = ({ transactions, currency, onTransactionPress }) => {
    const { colors } = useTheme();

    const getCategoryIcon = (category: string): string => {
        // Map category to icon - simplified version
        const iconMap: { [key: string]: string } = {
            'Food': 'fast-food',
            'Groceries': 'cart',
            'Shopping': 'bag',
            'Transportation': 'car',
            'Entertainment': 'film',
            'Bills': 'receipt',
            'Salary': 'briefcase',
            'Business': 'business',
        };
        return iconMap[category] || 'wallet';
    };

    if (transactions.length === 0) {
        return (
            <Card>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                    Top Transactions This Month
                </Text>
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                        No transactions yet this month
                    </Text>
                </View>
            </Card>
        );
    }

    return (
        <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                    Top Transactions This Month
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Top {transactions.length}
                </Text>
            </View>

            <FlatList
                data={transactions}
                scrollEnabled={false}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => onTransactionPress?.(item)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            borderBottomWidth: index < transactions.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                        }}
                    >
                        {/* Rank Badge */}
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                        }}>
                            <Text style={{ color: index < 3 ? '#000' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                                {index + 1}
                            </Text>
                        </View>

                        {/* Icon */}
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: item.type === 'EXPENSE' ? '#F4433620' : '#4CAF5020',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                        }}>
                            <Ionicons
                                name={getCategoryIcon(item.category) as any}
                                size={20}
                                color={item.type === 'EXPENSE' ? '#F44336' : '#4CAF50'}
                            />
                        </View>

                        {/* Details */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {item.note || item.category}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {item.category} • {new Date(item.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>

                        {/* Amount */}
                        <Text style={{
                            color: item.type === 'EXPENSE' ? '#F44336' : '#4CAF50',
                            fontSize: 16,
                            fontWeight: 'bold'
                        }}>
                            {item.type === 'EXPENSE' ? '-' : '+'}{formatCurrencyAmount(item.amount, currency)}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </Card>
    );
};

export default TopTransactions;
