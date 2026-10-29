import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { ImportSummary } from '@services/integrations';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { SEVERITY_ICON } from '@utils/severity';
import { Group, Row } from '@components/ds';
import { type, space, layout } from '@styles/theme';

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
    const { ds } = useTheme();

    // Loading state
    if (isProcessing) {
        return (
            <View style={[styles.container, { backgroundColor: ds.canvas }]}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={ds.accent} />
                    <Text style={[type.body, styles.loadingText, { color: ds.text }]}>
                        Validating file...
                    </Text>
                    <Text style={[type.small, styles.subText, { color: ds.text2 }]}>
                        Please wait while we check your data
                    </Text>
                </View>
            </View>
        );
    }

    // Saving state
    if (isSaving) {
        return (
            <View style={[styles.container, { backgroundColor: ds.canvas }]}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={ds.accent} />
                    <Text style={[type.body, styles.loadingText, { color: ds.text }]}>
                        Importing transactions...
                    </Text>
                    <Text style={[type.small, styles.subText, { color: ds.text2 }]}>
                        Please do not close the app
                    </Text>
                </View>
            </View>
        );
    }

    // Summary state
    if (summary) {
        const isPositive = summary.netBalance.isGreaterThanOrEqualTo(0);

        return (
            <View style={[styles.container, { backgroundColor: ds.canvas }]}>
                <View style={styles.summaryContent}>
                    <Ionicons name={SEVERITY_ICON.success} size={48} color={ds.success} style={styles.icon} />

                    <Text style={[type.title, { color: ds.text, marginBottom: space[1] }]}>
                        Ready to Import
                    </Text>

                    <Text style={[type.small, styles.subtitle, { color: ds.text2 }]}>
                        All data validated successfully
                    </Text>

                    <Group style={styles.stats}>
                        <Row title="Total Transactions" value={summary.totalTransactions.toString()} />
                        <Row title="Total Income" value={formatCurrencyAmount(summary.totalIncome, currency)} valueTone="good" />
                        <Row title="Total Expense" value={formatCurrencyAmount(summary.totalExpense, currency)} valueTone="bad" />
                        <Row
                            title="Net Balance"
                            value={formatCurrencyAmount(summary.netBalance, currency)}
                            valueTone={isPositive ? 'good' : 'bad'}
                            last
                        />
                    </Group>

                    <Text style={[type.small, styles.confirmText, { color: ds.text2 }]}>
                        Do you want to import these transactions?
                    </Text>

                    <View style={styles.actions}>
                        <Button
                            title="Yes, Import"
                            onPress={onConfirm}
                        />
                        <Button
                            variant="outline"
                            title="No, Cancel"
                            onPress={onCancel}
                            style={{ marginTop: space[3] }}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: layout.groupInset,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: space[5],
    },
    subText: {
        marginTop: space[2],
    },
    summaryContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        marginBottom: space[4],
    },
    subtitle: {
        marginBottom: space[6],
    },
    stats: {
        width: '100%',
        marginBottom: space[5],
    },
    confirmText: {
        textAlign: 'center',
        marginBottom: space[5],
    },
    actions: {
        width: '100%',
    },
});

export default ImportProcessScreen;
