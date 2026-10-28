import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { EmptyState } from '@components/common/EmptyState';
import { ChangeLine, IconName, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { getAllBudgets, setBudget } from '@services/domain/budgetService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { getCategoryAverages } from '@utils/financialMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS } from '@constants/categories';
import { type, space, radius } from '@styles/theme';

// Below this, a gap isn't worth surfacing - keeps the list to the categories that matter
const SYNC_THRESHOLD_PCT = 15;
const SYNC_THRESHOLD_MIN = 50;
const HISTORY_MONTHS = 12;
// A category active in fewer than this many of the history window's months gets its average
// footnoted as "occasional" - the average is still a real number (this cost smoothed evenly
// across the window), but it isn't a recurring monthly cost the way the suggestion otherwise implies.
const INFREQUENT_MONTHS_THRESHOLD = 3;

/**
 * Rounds to a "nice" number scaled to the amount's own magnitude (keeps ~2 significant
 * digits) rather than a fixed currency-code lookup - a ₱8,437 average becomes ₱8,400
 * (nearest 100), a $437 average becomes $440 (nearest 10), automatically, for any currency.
 */
const roundToNiceAmount = (amount: number): number => {
    if (amount <= 0) return 0;
    const digits = Math.floor(Math.log10(amount)) + 1;
    const step = Math.pow(10, Math.max(digits - 2, 1));
    return Math.round(amount / step) * step;
};

interface SuggestionRow {
    category: string;
    currentBudget: number | null;
    suggestedAmount: number;
    amountText: string;
    isInfrequent: boolean;
    activeMonths: number;
    totalMonths: number;
}

interface SmartSuggestionsModalProps {
    visible: boolean;
    onClose: () => void;
    currency: string;
    onApplied: () => void;
}

const SmartSuggestionsModal: React.FC<SmartSuggestionsModalProps> = ({ visible, onClose, currency, onApplied }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [rows, setRows] = useState<SuggestionRow[]>([]);
    // Distinguishes "we have spending history and it already matches your budgets" from
    // "there's no history to compare against yet" (e.g. a brand-new user still in their
    // first calendar month) - getCategoryAverages excludes the current in-progress month,
    // so an empty `averages` result there means no data, not a genuine match.
    const [hasHistory, setHasHistory] = useState(true);

    const getCategoryIcon = (categoryValue: string): IconName => {
        for (const group of EXPENSE_CATEGORY_GROUPS) {
            const cat = group.items.find(c => c.value === categoryValue);
            if (cat) return cat.icon as IconName;
        }
        return 'ellipsis-horizontal';
    };

    const loadSuggestions = useCallback(async () => {
        setLoading(true);
        try {
            const [transactions, budgets, recurrenceRules] = await Promise.all([
                getCachedTransactions(),
                getAllBudgets(),
                getAllRecurrenceRules()
            ]);

            const averages = getCategoryAverages(transactions, HISTORY_MONTHS);
            setHasHistory(Object.keys(averages).length > 0);
            const budgetMap = new Map(budgets.map(b => [b.category, b.amount.toNumber()]));
            // Recurring categories (Rent, Insurance, etc.) already have a known, fixed
            // amount - an average-based suggestion would just be second-guessing it.
            const recurringCategories = new Set(
                recurrenceRules.filter(r => r.isActive).map(r => r.transactionTemplate.category)
            );

            const suggestions: (SuggestionRow & { gap: number })[] = [];

            Object.entries(averages).forEach(([category, { average, activeMonths, totalMonths }]) => {
                if (average < SYNC_THRESHOLD_MIN) return;
                if (recurringCategories.has(category)) return;

                const current = budgetMap.has(category) ? budgetMap.get(category)! : null;
                const rounded = roundToNiceAmount(average);
                const isInfrequent = activeMonths < INFREQUENT_MONTHS_THRESHOLD;

                if (current === null) {
                    suggestions.push({ category, currentBudget: null, suggestedAmount: rounded, amountText: String(rounded), gap: average, isInfrequent, activeMonths, totalMonths });
                    return;
                }

                const diffAbs = Math.abs(average - current);
                const diffPct = current > 0 ? (diffAbs / current) * 100 : 100;

                if (diffPct > SYNC_THRESHOLD_PCT && diffAbs > SYNC_THRESHOLD_MIN) {
                    suggestions.push({ category, currentBudget: current, suggestedAmount: rounded, amountText: String(rounded), gap: diffAbs, isInfrequent, activeMonths, totalMonths });
                }
            });

            suggestions.sort((a, b) => b.gap - a.gap);
            setRows(suggestions);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load on open; see FIXES.md
            loadSuggestions();
        }
    }, [visible, loadSuggestions]);

    const handleAmountChange = (category: string, text: string) => {
        setRows(prev => prev.map(r => r.category === category ? { ...r, amountText: text } : r));
    };

    const handleRemoveRow = (category: string) => {
        setRows(prev => prev.filter(r => r.category !== category));
    };

    const handleApply = async () => {
        const validRows = rows.filter(r => {
            const amount = parseFloat(r.amountText);
            return !isNaN(amount) && amount > 0;
        });

        if (validRows.length === 0) {
            showAlert('Error', 'No valid budgets to update');
            return;
        }

        setApplying(true);
        // Applied one at a time (not in a single all-or-nothing batch) so a failure partway
        // through doesn't hide which budgets actually got saved - each result is tracked
        // individually and reported accurately instead of a blanket success/failure message.
        const succeeded: string[] = [];
        const failed: string[] = [];
        for (const row of validRows) {
            try {
                await setBudget(row.category, parseFloat(row.amountText));
                succeeded.push(row.category);
            } catch {
                failed.push(row.category);
            }
        }
        setApplying(false);

        if (succeeded.length > 0) {
            setRows(prev => prev.filter(r => !succeeded.includes(r.category)));
            onApplied();
        }

        if (failed.length === 0) {
            onClose();
            showAlert('Success', `Updated ${succeeded.length} budget${succeeded.length === 1 ? '' : 's'}`);
        } else if (succeeded.length === 0) {
            showAlert('Error', `Failed to update ${failed.length} budget${failed.length === 1 ? '' : 's'}: ${failed.join(', ')}`);
        } else {
            showAlert(
                'Partially Updated',
                `Updated ${succeeded.length} budget${succeeded.length === 1 ? '' : 's'}. Failed: ${failed.join(', ')}. You can try again for the remaining ones.`
            );
        }
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Smart suggestions"
            subtitle={`Based on your last ${HISTORY_MONTHS} months of spending`}
            maxHeight="85%"
            style={{ height: '85%' }}
            contentStyle={{ flex: 1 }}
            footer={rows.length > 0 ? (
                <Pressable
                    onPress={handleApply}
                    disabled={applying}
                    style={[styles.button, { backgroundColor: ds.accent }, applying && styles.disabled]}
                    accessibilityRole="button"
                >
                    {applying ? (
                        <ActivityIndicator color={ds.onAccent} size="small" />
                    ) : (
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>
                            Update {rows.length} budget{rows.length === 1 ? '' : 's'}
                        </Text>
                    )}
                </Pressable>
            ) : undefined}
        >
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={ds.accent} />
                </View>
            ) : (
                <View style={styles.body}>
                    {rows.length > 0 && (
                        <Text style={[type.small, styles.helper, { color: ds.text2 }]}>
                            Removing a suggestion just skips it — your saved budget won&apos;t change until you tap Update.
                        </Text>
                    )}
                    <FlatList
                        data={rows}
                        keyExtractor={item => item.category}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <EmptyState
                                size="compact"
                                icon="checkmark-circle-outline"
                                title={hasHistory
                                    ? 'Your budgets already match your spending'
                                    : 'Not enough spending history yet - check back after your first full month'}
                            />
                        }
                        renderItem={({ item, index }) => {
                            const isNew = item.currentBudget === null;
                            const isUp = !isNew && item.suggestedAmount > item.currentBudget!;
                            const delta = isNew ? 0 : Math.abs(item.suggestedAmount - item.currentBudget!);

                            return (
                                <Row
                                    icon={getCategoryIcon(item.category)}
                                    title={item.category}
                                    last={index === rows.length - 1}
                                    trailing={
                                        <View style={styles.trailing}>
                                            <TextInput
                                                value={item.amountText}
                                                onChangeText={(text) => handleAmountChange(item.category, text)}
                                                keyboardType="numeric"
                                                style={[type.smallNum, styles.amountInput, { backgroundColor: ds.inset, color: ds.text }]}
                                            />
                                            <Pressable
                                                onPress={() => handleRemoveRow(item.category)}
                                                hitSlop={space[2]}
                                                accessibilityLabel={`Skip ${item.category}`}
                                            >
                                                <Ionicons name="trash-outline" size={20} color={ds.danger} />
                                            </Pressable>
                                        </View>
                                    }
                                >
                                    {isNew ? (
                                        <Text style={[type.caption, { color: ds.text2 }]}>Not budgeted yet</Text>
                                    ) : (
                                        <ChangeLine
                                            text={`${isUp ? '+' : '−'}${formatCurrencyAmount(delta, currency)} vs current`}
                                            tone={isUp ? 'warning' : 'good'}
                                        />
                                    )}
                                    {item.isInfrequent && (
                                        <Text style={[type.caption, styles.footnote, { color: ds.text2 }]}>
                                            Occasional ({item.activeMonths}/{item.totalMonths} months) — smoothed average, not a recurring cost
                                        </Text>
                                    )}
                                </Row>
                            );
                        }}
                    />
                </View>
            )}
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7],
    },
    body: {
        flex: 1,
    },
    helper: {
        marginBottom: space[1],
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    amountInput: {
        width: 90,
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
        textAlign: 'right',
    },
    footnote: {
        marginTop: 2,
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
});

export default SmartSuggestionsModal;
