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
    scenarioAddedPayment: number; // e.g., 200
    scenarioMonthsSaved: number; // e.g., 11
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading: boolean;
    isDebtFree: boolean;
    onInfoPress: (title: string, content: string) => void;
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

                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>
                    No active debt.
                </Text>
                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20 }}>
                    No interest drag.
                </Text>

                <Text style={{ color: colors.success, fontSize: 16, fontWeight: 'bold' }}>
                    Freedom fully compounding.
                </Text>
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>DEBT PRESSURE</Text>
                <TouchableOpacity onPress={() => onInfoPress('Debt Pressure', 'This card summarizes the cost of your debt and how it delays your Financial Freedom.')}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Mandatory Payments:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Mandatory Payments', 'Total minimum monthly payments required by your lenders. This cash is locked and cannot be used for investing or saving.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {formatMoney(monthlyPayments)} / month
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Interest Cost:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Interest Cost', 'The amount of money you lose to interest every month. This is "dead money" that provides no value to you.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.error }]}>
                        {formatMoney(interestCost)} / month
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Freedom Impact:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Freedom Delay', 'How much longer you have to work because of this debt. It calculates the opportunity cost of paying interest instead of investing.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.error, fontSize: 16, fontWeight: '500' }]}>
                        Debt delays financial freedom by {freedomDelayYears.toFixed(1)} years
                    </Text>
                </View>
            </View>

            {scenarioMonthsSaved > 0 && (
                <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                        <View style={styles.column}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>If you add {formatMoney(new BigNumber(scenarioAddedPayment))}/month:</Text>
                                <TouchableOpacity
                                    style={{ marginLeft: 6 }}
                                    onPress={() => onInfoPress('Faster Freedom', 'Shows how much sooner you could be debt-free (and reach Financial Freedom) if you paid a little extra each month.')}
                                >
                                    <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.value, { color: colors.success, fontSize: 16 }]}>
                                Freedom moves {scenarioMonthsSaved} months earlier
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
        backgroundColor: '#E0E0E0', // Will be overridden by theme if we passed it, handled mainly via opacity in Views usually
        opacity: 0.1,
        marginVertical: 16,
    }
});

export default DebtPressureCard;
