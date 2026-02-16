import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { Card } from '..';
import { Skeleton } from '@components/common/Skeleton';

interface SpendingCashFlowCardProps {
    netFlow: BigNumber;
    spendingTrendPercent: number;
    spendingTrendDirection: 'up' | 'down' | 'flat';
    freedomImpactMonths: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading: boolean;
    onInfoPress: () => void;
}

const SpendingCashFlowCard: React.FC<SpendingCashFlowCardProps> = ({
    netFlow,
    spendingTrendPercent,
    spendingTrendDirection,
    freedomImpactMonths,
    currency,
    isPrivacyEnabled,
    isLoading,
    onInfoPress
}) => {
    const { colors } = useTheme();

    const isPositiveFlow = netFlow.gte(0);
    const flowColor = isPositiveFlow ? colors.success : colors.error;

    const impactText = freedomImpactMonths >= 0
        ? `+${freedomImpactMonths.toFixed(1)} months per year`
        : `–${Math.abs(freedomImpactMonths).toFixed(1)} months per year`;

    const impactColor = freedomImpactMonths >= 0 ? colors.success : colors.error;

    const trendText = `${spendingTrendPercent.toFixed(0)}% ${spendingTrendDirection === 'up' ? 'above' : 'below'} baseline`;
    const trendColor = spendingTrendDirection === 'up' ? colors.warning : colors.success;

    const formatMoney = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency);
    };

    if (isLoading) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Skeleton width={150} height={16} style={{ marginBottom: 20 }} />
                <View style={{ gap: 16 }}>
                    <Skeleton width={100} height={40} />
                    <Skeleton width={120} height={40} />
                </View>
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>SPENDING & CASH FLOW</Text>
                <TouchableOpacity onPress={onInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Net Flow This Month:</Text>
                    <Text style={[styles.value, { color: flowColor }]}>
                        {isPositiveFlow ? '+' : '–'}{formatMoney(netFlow.abs())}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Spending Trend:</Text>
                    <Text style={[styles.value, { color: trendColor, fontSize: 16 }]}>
                        {trendText}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Impact on Self-Sustain:</Text>
                    <Text style={[styles.value, { color: impactColor, fontSize: 16 }]}>
                        {impactText}
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
    }
});

export default SpendingCashFlowCard;
