import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { formatCurrencyAmount } from '../../utils/currencyUtils';
import { getMonthEndProjection } from '../../utils/financialMetrics';

interface MonthEndProjectionProps {
    visible: boolean;
    onClose: () => void;
    transactions: Transaction[];
    currency: string;
}

const MonthEndProjection: React.FC<MonthEndProjectionProps> = ({
    visible,
    onClose,
    transactions,
    currency
}) => {
    const { colors } = useTheme();

    const projection = useMemo(() => {
        return getMonthEndProjection(transactions);
    }, [transactions]);

    const savingsRate = projection.projectedIncome > 0
        ? ((projection.projectedSavings / projection.projectedIncome) * 100)
        : 0;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                        maxHeight: '75%',
                        width: '100%'
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <View>
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>
                                Month-End Projection
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                {projection.daysRemaining} days remaining
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Month Progress</Text>
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                                {Math.round(projection.progress)}%
                            </Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{
                                height: '100%',
                                width: `${projection.progress}%`,
                                backgroundColor: colors.primary
                            }} />
                        </View>
                    </View>

                    {/* Income Projection */}
                    <View style={{
                        backgroundColor: '#4CAF5010',
                        padding: 15,
                        borderRadius: 12,
                        marginBottom: 12
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="trending-up" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Income</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current</Text>
                            <Text style={{ color: colors.text, fontSize: 14 }}>
                                {formatCurrencyAmount(projection.currentIncome, currency)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Projected</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold' }}>
                                {formatCurrencyAmount(projection.projectedIncome, currency)}
                            </Text>
                        </View>
                    </View>

                    {/* Expense Projection */}
                    <View style={{
                        backgroundColor: '#F4433610',
                        padding: 15,
                        borderRadius: 12,
                        marginBottom: 12
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="trending-down" size={20} color="#F44336" style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Expenses</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current</Text>
                            <Text style={{ color: colors.text, fontSize: 14 }}>
                                {formatCurrencyAmount(projection.currentExpense, currency)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Projected</Text>
                            <Text style={{ color: '#F44336', fontSize: 18, fontWeight: 'bold' }}>
                                {formatCurrencyAmount(projection.projectedExpense, currency)}
                            </Text>
                        </View>
                    </View>

                    {/* Projected Savings */}
                    <View style={{
                        backgroundColor: colors.primary + '10',
                        padding: 15,
                        borderRadius: 12,
                        marginBottom: 15
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                                    Projected Savings
                                </Text>
                                <Text style={{
                                    color: projection.projectedSavings >= 0 ? '#4CAF50' : '#F44336',
                                    fontSize: 24,
                                    fontWeight: 'bold'
                                }}>
                                    {formatCurrencyAmount(projection.projectedSavings, currency)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>
                                    Savings Rate
                                </Text>
                                <Text style={{
                                    color: savingsRate >= 0 ? '#4CAF50' : '#F44336',
                                    fontSize: 20,
                                    fontWeight: 'bold'
                                }}>
                                    {savingsRate.toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Insight */}
                    <View style={{
                        padding: 12,
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}>
                        <Ionicons name="information-circle" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                            Based on your current daily spending pattern
                        </Text>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default MonthEndProjection;
