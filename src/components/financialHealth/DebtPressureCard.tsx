import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface DebtPressureCardProps {
    monthlyPayments: BigNumber;
    interestCost: BigNumber;
    freedomDelayYears: number;
    scenarioAddedPayment: number;
    scenarioMonthsSaved: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading: boolean;
    isDebtFree: boolean;
    onInfoPress: () => void;
}

const DebtPressureCard: React.FC<DebtPressureCardProps> = ({
    monthlyPayments,
    interestCost,
    freedomDelayYears,
    scenarioAddedPayment,
    scenarioMonthsSaved,
    currency,
    isPrivacyEnabled,
    isLoading,
    isDebtFree,
    onInfoPress
}) => {
    const { colors } = useTheme();

    const formatMoney = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency);
    };

    if (isLoading) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Skeleton width={120} height={16} style={{ marginBottom: 20 }} />
                <Skeleton width="100%" height={24} style={{ marginBottom: 12 }} />
                <Skeleton width="80%" height={24} />
            </Card>
        );
    }

    if (isDebtFree) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Text style={[styles.header, { color: colors.textSecondary }]}>DEBT PRESSURE</Text>
                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>No active debt.</Text>
                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20 }}>No interest drag.</Text>
                <Text style={{ color: colors.success, fontSize: 16, fontWeight: 'bold' }}>Self-sustain fully compounding.</Text>
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>DEBT PRESSURE</Text>
                <TouchableOpacity onPress={onInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Mandatory Payments:</Text>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {formatMoney(monthlyPayments)} / month
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Interest Cost:</Text>
                    <Text style={[styles.value, { color: colors.error }]}>
                        {formatMoney(interestCost)} / month
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Self-sustain Impact:</Text>
                    <Text style={[styles.value, { color: colors.error, fontSize: 16, fontWeight: '500' }]}>
                        Debt delays self-sustain by {freedomDelayYears.toFixed(1)} years
                    </Text>
                </View>
            </View>

            {scenarioMonthsSaved > 0 && (
                <>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>If you add {formatMoney(new BigNumber(scenarioAddedPayment))}/month:</Text>
                            <Text style={[styles.value, { color: colors.success, fontSize: 16 }]}>
                                Self-sustain moves {scenarioMonthsSaved} months earlier
                            </Text>
                        </View>
                    </View>
                </>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    header: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    column: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    spacer: {
        height: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        opacity: 0.1,
        marginVertical: 16,
    }
});

export default DebtPressureCard;
