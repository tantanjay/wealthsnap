import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import BottomModal from '../../common/BottomModal';
import { Button } from '../../index';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';

interface ImportDataModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectFile: () => void;
    isLoading?: boolean;
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({
    visible,
    onClose,
    onSelectFile,
    isLoading = false
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    const ColumnInfo = ({ name, description }: { name: string; description: string }) => (
        <View style={styles.columnRow}>
            <Text style={[styles.columnName, { color: colors.primary }]}>{name}</Text>
            <Text style={[styles.columnDesc, { color: colors.textSecondary }]}>{description}</Text>
        </View>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Import Transactions"
            subtitle="Import from CSV or TSV file"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Important Notice */}
                <View style={[styles.noticeBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
                    <Ionicons name="warning" size={20} color={colors.warning} />
                    <Text style={[styles.noticeText, { color: colors.text }]}>
                        Columns must be in exact order shown below. Other formats will be rejected.
                    </Text>
                </View>

                {/* File Format */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Required Format</Text>

                <View style={[styles.formatBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ColumnInfo name="1. Date" description="yyyy-MM-dd format (e.g., 2026-01-15)" />
                    <ColumnInfo name="2. Category" description="Must match existing category names" />
                    <ColumnInfo name="3. Income" description="Decimal amount or - for empty" />
                    <ColumnInfo name="4. Expense" description="Decimal amount or - for empty" />
                    <ColumnInfo name="5. Notes" description="Optional, max 50 characters" />
                </View>

                {/* Rules */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Rules</Text>

                <View style={styles.rulesList}>
                    <RuleItem
                        icon="calendar-outline"
                        text="No future dates allowed"
                        colors={colors}
                    />
                    <RuleItem
                        icon="swap-horizontal"
                        text="Each row must have Income OR Expense, not both"
                        colors={colors}
                    />
                    <RuleItem
                        icon="copy-outline"
                        text="Duplicates will be flagged as errors"
                        colors={colors}
                    />
                </View>

                {/* Example */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Example</Text>

                <View style={[styles.exampleBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                        Date,Category,Income,Expense,Notes{'\n'}
                        2026-01-15,Food,-,25.50,Lunch{'\n'}
                        2026-01-16,Salary,5000,-,Monthly
                    </Text>
                </View>

                {/* AI Assistance */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Assistance</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="sparkles" size={20} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Difficult to format?</Text>
                    </View>

                    <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                        If your data is in a different format, you can use AI to convert it. Simply copy our prompt and paste it along with your data into ChatGPT, Gemini, or any AI tool you use.
                    </Text>

                    <Button
                        variant="secondary"
                        title="Copy AI Prompt"
                        icon="copy-outline"
                        onPress={async () => {
                            const prompt = `I have a list of transactions to import. Please format them into a CSV with exactly these headers: Date,Category,Income,Expense,Notes\n\nRules:\n1. Date format: yyyy-MM-dd\n2. Use '-' for empty Income or Expense fields\n3. No currency symbols\n4. Do not include future dates\n\nHere is my data:`;
                            await Clipboard.setStringAsync(prompt);
                            // You might want to show a toast/alert here
                            showAlert('Success', 'AI Prompt copied to clipboard!');
                        }}
                        style={{ marginTop: 12 }}
                    />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        title={isLoading ? "Loading..." : "Select File"}
                        onPress={onSelectFile}
                        disabled={isLoading}
                    />
                    <Button
                        variant="outline"
                        title="Cancel"
                        onPress={onClose}
                        style={{ marginTop: 10 }}
                        disabled={isLoading}
                    />
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const RuleItem = ({ icon, text, colors }: { icon: string; text: string; colors: any }) => (
    <View style={styles.ruleItem}>
        <Ionicons name={icon as any} size={16} color={colors.textSecondary} />
        <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
        gap: 10,
    },
    noticeText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 4,
    },
    formatBox: {
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    columnRow: {
        marginBottom: 8,
    },
    columnName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    columnDesc: {
        fontSize: 12,
    },
    rulesList: {
        marginBottom: 16,
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    ruleText: {
        fontSize: 13,
    },
    exampleBox: {
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    exampleText: {
        fontSize: 11,
        fontFamily: 'monospace',
        lineHeight: 16,
    },
    actions: {
        marginTop: 4,
        marginBottom: 10,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    cardDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
});

export default ImportDataModal;
