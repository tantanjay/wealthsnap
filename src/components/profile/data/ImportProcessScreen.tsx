import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { ImportSummary } from '@services/integrations';

interface ImportProcessScreenProps {
    isProcessing: boolean;
    isSaving: boolean;
    summary: ImportSummary | null;
    currency: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ImportProcessScreen: React.FC<ImportProcessScreenProps> = ({
    isProcessing,
    isSaving,
    summary,
    currency,
    onConfirm,
    onCancel
}) => {
    const { colors } = useTheme();

    // Format currency
    const formatAmount = (amount: number) => {
        return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Loading state
    if (isProcessing) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>
                        Validating file...
                    </Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                        Please wait while we check your data
                    </Text>
                </View>
            </View>
        );
    }

    // Saving state 
    if (isSaving) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.success} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>
                        Importing transactions...
                    </Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>
                        Please do not close the app
                    </Text>
                </View>
            </View>
        );
    }

    // Summary state  
    if (summary) {
        const isPositive = summary.netBalance >= 0;

        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.summaryContent}>
                    {/* Success Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        Ready to Import
                    </Text>

                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        All data validated successfully
                    </Text>

                    {/* Stats */}
                    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <StatRow
                            label="Total Transactions"
                            value={summary.totalTransactions.toString()}
                            colors={colors}
                        />
                        <StatRow
                            label="Total Income"
                            value={formatAmount(summary.totalIncome)}
                            valueColor={colors.success}
                            colors={colors}
                        />
                        <StatRow
                            label="Total Expense"
                            value={formatAmount(summary.totalExpense)}
                            valueColor={colors.error}
                            colors={colors}
                        />
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <StatRow
                            label="Net Balance"
                            value={formatAmount(summary.netBalance)}
                            valueColor={isPositive ? colors.success : colors.error}
                            isBold
                            colors={colors}
                        />
                    </View>

                    <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                        Do you want to import these transactions?
                    </Text>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            title="Yes, Import"
                            onPress={onConfirm}
                        />
                        <Button
                            variant="outline"
                            title="No, Cancel"
                            onPress={onCancel}
                            style={{ marginTop: 10 }}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return null;
};

const StatRow = ({
    label,
    value,
    valueColor,
    isBold,
    colors
}: {
    label: string;
    value: string;
    valueColor?: string;
    isBold?: boolean;
    colors: any;
}) => (
    <View style={styles.statRow}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[
            styles.statValue,
            { color: valueColor || colors.text },
            isBold && { fontWeight: '700', fontSize: 18 }
        ]}>
            {value}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
    },
    subText: {
        fontSize: 14,
        marginTop: 8,
    },
    summaryContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 24,
    },
    statsCard: {
        width: '100%',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statLabel: {
        fontSize: 14,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    confirmText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    actions: {
        width: '100%',
    },
});

export default ImportProcessScreen;
