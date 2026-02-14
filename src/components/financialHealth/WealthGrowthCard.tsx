import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface WealthGrowthCardProps {
    portfolioValue: BigNumber;
    annualReturnPercent: number;
    freedomAccelerationMonths: number;
    scenarioInvestAmount: number; // e.g., 300
    scenarioYearsEarlier: number; // e.g., 2.1
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading: boolean;
    hasInvestments: boolean;
    onInfoPress: (title: string, content: string) => void;
}

const WealthGrowthCard: React.FC<WealthGrowthCardProps> = ({
    portfolioValue,
    annualReturnPercent,
    freedomAccelerationMonths,
    scenarioInvestAmount,
    scenarioYearsEarlier,
    currency,
    isPrivacyEnabled,
    isLoading,
    hasInvestments,
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

    if (!hasInvestments) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Text style={[styles.header, { color: colors.textSecondary }]}>WEALTH GROWTH</Text>

                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20 }}>
                    No active investments.
                </Text>

                <View style={styles.divider} />

                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>
                    If you invest {formatMoney(new BigNumber(scenarioInvestAmount))}/month at 7%:
                </Text>
                <Text style={{ color: colors.success, fontSize: 16, fontWeight: 'bold' }}>
                    Freedom arrives {scenarioYearsEarlier.toFixed(1)} years earlier.
                </Text>
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>WEALTH GROWTH</Text>
                <TouchableOpacity onPress={() => onInfoPress('Wealth Growth', 'This card tracks your investment performance and how it accelerates your journey to Financial Freedom.')}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Portfolio Value:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Portfolio Value', 'Total current market value of all your investment holdings.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {formatMoney(portfolioValue)}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>12-Month Return:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('12-Month Return', 'How much your portfolio has grown (or shrunk) over the last year, expressed as a percentage.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: annualReturnPercent >= 0 ? colors.success : colors.error }]}>
                        {annualReturnPercent > 0 ? '+' : ''}{annualReturnPercent.toFixed(1)}%
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Freedom Acceleration:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Freedom Acceleration', 'Your investments are "buying" you extra time. This is how many additional months of runway your investment gains are generating.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.success, fontSize: 16, fontWeight: '500' }]}>
                        Investments add +{freedomAccelerationMonths.toFixed(1)} months of runway
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>If you invest {formatMoney(new BigNumber(scenarioInvestAmount))}/month:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Faster Freedom', 'Shows how much sooner you could reach Financial Freedom if you consistently invested this amount monthly at an assumed 7% return.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: colors.success, fontSize: 16 }]}>
                        Freedom arrives {scenarioYearsEarlier.toFixed(1)} years earlier
                    </Text>
                </View>
            </View>
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

export default WealthGrowthCard;
