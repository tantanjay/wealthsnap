import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '../../common/BottomModal';
import { useTheme } from '../../../context/ThemeContext';
import { Transaction } from '../../../types';
import { formatCurrencyAmount } from '../../../utils/currencyUtils';
import { getMonthEndProjection } from '../../../utils/financialMetrics';

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
    const { colors } = useTheme();

    const projection = useMemo(() => {
        return getMonthEndProjection(transactions);
    }, [transactions]);

    const savingsRate = projection.projectedIncome > 0
        ? ((projection.projectedSavings / projection.projectedIncome) * 100)
        : 0;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Month-End Projection"
            subtitle={`${projection.daysRemaining} days remaining`}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
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
                    flexDirection: 'row',
                    backgroundColor: colors.primary + '15',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 5,
                    alignItems: 'center'
                }}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, flex: 1, fontSize: 13, lineHeight: 18 }}>
                        <Text style={{ fontWeight: 'bold' }}>New Account?</Text> If you have less than 1 month of history, this uses a simple daily average. Once you track more months, it switches to Smart Projection based on your historical patterns!
                    </Text>
                </View>
            </ScrollView>
        </BottomModal>
    );
};

export default MonthEndProjectionModal;
