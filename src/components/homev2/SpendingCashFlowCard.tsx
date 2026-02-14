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
    onInfoPress: (title: string, content: string) => void;
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

    // "Impact on Freedom" narrative
    // +0.6 months per year
    const impactText = freedomImpactMonths >= 0
        ? `+${freedomImpactMonths.toFixed(1)} months per year`
        : `–${Math.abs(freedomImpactMonths).toFixed(1)} months per year`;

    const impactColor = freedomImpactMonths >= 0 ? colors.success : colors.error;

    // Spending Trend Narrative
    // "18% below baseline"
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
                <TouchableOpacity onPress={() => onInfoPress('Cash Flow', 'This card tracks money coming in vs going out, and how your spending habits impact your Financial Freedom date.')}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Net Flow This Month:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Net Flow', 'Net Flow = Income - Expenses (including transfers). Positive means you are saving money; negative means you are burning cash.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: flowColor }]}>
                        {isPositiveFlow ? '+' : '–'}{formatMoney(netFlow.abs())}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Spending Trend:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Spending Trend', 'Compares your spending this month to your 3-month average. Keeping this low helps extend your runway.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.value, { color: trendColor, fontSize: 16 }]}>
                        {trendText}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Impact on Freedom:</Text>
                        <TouchableOpacity
                            style={{ marginLeft: 6 }}
                            onPress={() => onInfoPress('Impact on Freedom', 'Estimated change in your Financial Freedom timeline based on current savings rate. Positive means you are reaching freedom faster.')}
                        >
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
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
