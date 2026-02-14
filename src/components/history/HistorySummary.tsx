import React from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';

interface FinancialSummary {
    totalIncome: BigNumber;
    totalExpense: BigNumber;
}

interface SafeToSpendData {
    amount: BigNumber;
    dailyBurnRate: BigNumber;
    projectedVariableSpend: BigNumber;
    remainingDebtObligations: BigNumber;
}

interface HistorySummaryProps {
    summary: FinancialSummary;
    safeToSpendData: SafeToSpendData;
    isLoading: boolean;
    formatCurrency: (amount: BigNumber) => string;
    onShowSafeToSpendInfo: () => void;
}

export const HistorySummary: React.FC<HistorySummaryProps> = ({
    summary,
    safeToSpendData,
    isLoading,
    formatCurrency,
    onShowSafeToSpendInfo
}) => {
    const { colors } = useTheme();

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
            <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Projected Safe to Spend</Text>
                    <TouchableOpacity onPress={onShowSafeToSpendInfo}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                {isLoading ? <Skeleton width={120} height={32} /> : (
                    <View>
                        <Text style={{ color: safeToSpendData.amount.isGreaterThanOrEqualTo(0) ? colors.success : colors.error, fontSize: 28, fontWeight: 'bold' }}>
                            {formatCurrency(safeToSpendData.amount)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 2, marginBottom: 2, flexWrap: 'wrap' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                🔥 Burn: {formatCurrency(safeToSpendData.dailyBurnRate)}/day
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                🧾 Living Costs: {formatCurrency(safeToSpendData.projectedVariableSpend)}
                            </Text>
                        </View>
                        {safeToSpendData.remainingDebtObligations.isGreaterThan(0) && (
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                🏦 Debt: {formatCurrency(safeToSpendData.remainingDebtObligations)}
                            </Text>
                        )}
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                            Estimate · Based on recent activity
                        </Text>
                    </View>
                )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Income</Text>
                    <Text style={{ color: colors.success, fontSize: 16, fontWeight: '600' }}>
                        {formatCurrency(summary.totalIncome)}
                    </Text>
                </View>
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Expenses</Text>
                    <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>
                        {formatCurrency(summary.totalExpense)}
                    </Text>
                </View>
            </View>
        </View>
    );
};
