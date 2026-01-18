import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatCompactCurrency } from '../../utils/currencyUtils';
import { checkBudgetStatus, Budget } from '../../services/budgetService';

interface AllExpensesModalProps {
    visible: boolean;
    onClose: () => void;
    categoryBreakdown: {
        name: string;
        amount: number;
        percentage: number;
    }[];
    budgets: Budget[];
    currency: string;
    isPrivacyEnabled: boolean;
    onSelectCategory: (category: string) => void;
}

const AllExpensesModal: React.FC<AllExpensesModalProps> = ({
    visible,
    onClose,
    categoryBreakdown,
    budgets,
    currency,
    isPrivacyEnabled,
    onSelectCategory
}) => {
    const { colors } = useTheme();

    // Fixed colors for categories to match main view
    const CHART_COLORS = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                {/* Backdrop - handles closing */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                />

                {/* Modal Content - Plain View to avoid gesture conflicts */}
                <View
                    style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                        maxHeight: '80%',
                        width: '100%'
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <View>
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                                All Spending Categories
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                Full breakdown of your expenses
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexShrink: 1 }}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {categoryBreakdown.map((item, index) => {
                                const budget = budgets.find(b => b.category === item.name);
                                const budgetStatus = budget ? checkBudgetStatus(item.amount, budget.amount) : null;

                                return (
                                    <View key={index} style={{ marginBottom: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CHART_COLORS[index % CHART_COLORS.length], marginRight: 10 }} />
                                                <Text style={{ color: colors.text, fontSize: 14 }}>{item.name}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                                        {isPrivacyEnabled ? '***' : formatCompactCurrency(item.amount, currency)}
                                                    </Text>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                                                </View>
                                                {!isPrivacyEnabled && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            onSelectCategory(item.name);
                                                            onClose();
                                                        }}
                                                        style={{
                                                            padding: 6,
                                                            backgroundColor: colors.primary + '20',
                                                            borderRadius: 6
                                                        }}
                                                    >
                                                        <Ionicons name="trending-up" size={16} color={colors.primary} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>

                                        {/* Budget Progress Bar */}
                                        {budget && !isPrivacyEnabled && (
                                            <View style={{ marginTop: 4, paddingLeft: 20 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                                                        Budget: {formatCompactCurrency(budget.amount, currency)}
                                                    </Text>
                                                    <Text style={{
                                                        fontSize: 10,
                                                        color: budgetStatus!.status === 'over' ? '#F44336' : budgetStatus!.status === 'warning' ? '#FF9800' : '#4CAF50',
                                                        fontWeight: '600'
                                                    }}>
                                                        {budgetStatus!.percentage.toFixed(0)}%
                                                    </Text>
                                                </View>
                                                <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, overflow: 'hidden' }}>
                                                    <View style={{
                                                        height: '100%',
                                                        width: `${Math.min(budgetStatus!.percentage, 100)}%`,
                                                        backgroundColor: budgetStatus!.status === 'over' ? '#F44336' : budgetStatus!.status === 'warning' ? '#FF9800' : '#4CAF50'
                                                    }} />
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default AllExpensesModal;
