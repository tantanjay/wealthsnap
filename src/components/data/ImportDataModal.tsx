import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import { Group, Row, SectionHeader, IconName } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';

interface ImportDataModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectFile: () => void;
    isLoading?: boolean;
}

const COLUMNS = [
    { name: '1. Date', description: 'yyyy-MM-dd format (e.g., 2026-01-15)' },
    { name: '2. Category', description: 'Must match existing category names' },
    { name: '3. Income', description: 'Decimal amount or - for empty' },
    { name: '4. Expense', description: 'Decimal amount or - for empty' },
    { name: '5. Notes', description: 'Optional, max 50 characters' },
];

const RULES: { icon: IconName; text: string }[] = [
    { icon: 'calendar-outline', text: 'No future dates allowed' },
    { icon: 'swap-horizontal-outline', text: 'Each row must have Income OR Expense, not both' },
    { icon: 'copy-outline', text: 'Duplicates will be flagged as errors' },
];

const ImportDataModal: React.FC<ImportDataModalProps> = ({
    visible,
    onClose,
    onSelectFile,
    isLoading = false
}) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    const copyPrompt = async () => {
        const prompt = `I have a list of transactions to import. Please format them into a CSV with exactly these headers: Date,Category,Income,Expense,Notes\n\nRules:\n1. Date format: yyyy-MM-dd\n2. Use '-' for empty Income or Expense fields\n3. No currency symbols\n4. Do not include future dates\n\nHere is my data:`;
        await Clipboard.setStringAsync(prompt);
        showAlert('Success', 'AI Prompt copied to clipboard!');
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Import transactions"
            subtitle="Import from CSV or TSV file"
            maxHeight="85%"
            footer={
                <>
                    <Pressable
                        onPress={onSelectFile}
                        disabled={isLoading}
                        style={[styles.button, { backgroundColor: ds.accent }, isLoading && styles.disabled]}
                        accessibilityRole="button"
                    >
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{isLoading ? 'Loading…' : 'Select file'}</Text>
                    </Pressable>
                    <Pressable onPress={onClose} disabled={isLoading} style={[styles.textButton, isLoading && styles.disabled]} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                </>
            }
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Disclaimer severity="warning" style={styles.notice}>
                    Columns must be in exact order shown below. Other formats will be rejected.
                </Disclaimer>

                <SectionHeader grouped title="Required format" />
                <Group>
                    {COLUMNS.map((column, i) => (
                        <Row key={column.name} title={column.name} subtitle={column.description} last={i === COLUMNS.length - 1} />
                    ))}
                </Group>

                <SectionHeader grouped title="Rules" />
                <Group>
                    {RULES.map((rule, i) => (
                        <Row key={rule.text} icon={rule.icon} title={rule.text} last={i === RULES.length - 1} />
                    ))}
                </Group>

                <SectionHeader grouped title="Example" />
                <Group padded>
                    <View style={[styles.example, { backgroundColor: ds.inset }]}>
                        <Text style={[type.smallNum, { color: ds.text2 }]}>
                            Date,Category,Income,Expense,Notes{'\n'}
                            2026-01-15,Food,-,25.50,Lunch{'\n'}
                            2026-01-16,Salary,5000,-,Monthly
                        </Text>
                    </View>
                </Group>

                <SectionHeader grouped title="AI assistance" />
                <Group>
                    <Text style={[type.small, styles.groupIntro, { color: ds.text2 }]}>
                        If your data is in a different format, you can use AI to convert it. Simply copy our prompt and paste it along with your data into ChatGPT, Gemini, or any AI tool you use.
                    </Text>
                    <Row icon="sparkles-outline" title="Copy AI prompt" subtitle="Difficult to format? Let AI convert it" onPress={copyPrompt} last />
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    notice: {
        marginTop: 0,
    },
    example: {
        borderRadius: radius.sm,
        padding: space[3],
    },
    groupIntro: {
        paddingTop: space[3],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ImportDataModal;
