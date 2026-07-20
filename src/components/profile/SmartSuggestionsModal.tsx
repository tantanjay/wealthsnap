import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { getAllBudgets, setBudget } from '@services/domain/budgetService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { getCategoryAverages } from '@utils/financialMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS } from '@constants/categories';

// Below this, a gap isn't worth surfacing - keeps the list to the categories that matter
const SYNC_THRESHOLD_PCT = 15;
const SYNC_THRESHOLD_MIN = 50;
const HISTORY_MONTHS = 12;

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
}

interface SmartSuggestionsModalProps {
    visible: boolean;
    onClose: () => void;
    currency: string;
    onApplied: () => void;
}

const SmartSuggestionsModal: React.FC<SmartSuggestionsModalProps> = ({ visible, onClose, currency, onApplied }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [rows, setRows] = useState<SuggestionRow[]>([]);

    const getCategoryIcon = (categoryValue: string): string => {
        for (const group of EXPENSE_CATEGORY_GROUPS) {
            const cat = group.items.find(c => c.value === categoryValue);
            if (cat) return cat.icon;
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
            const budgetMap = new Map(budgets.map(b => [b.category, b.amount.toNumber()]));
            // Recurring categories (Rent, Insurance, etc.) already have a known, fixed
            // amount - an average-based suggestion would just be second-guessing it.
            const recurringCategories = new Set(
                recurrenceRules.filter(r => r.isActive).map(r => r.transactionTemplate.category)
            );

            const suggestions: (SuggestionRow & { gap: number })[] = [];

            Object.entries(averages).forEach(([category, avg]) => {
                if (avg < SYNC_THRESHOLD_MIN) return;
                if (recurringCategories.has(category)) return;

                const current = budgetMap.has(category) ? budgetMap.get(category)! : null;
                const rounded = roundToNiceAmount(avg);

                if (current === null) {
                    suggestions.push({ category, currentBudget: null, suggestedAmount: rounded, amountText: String(rounded), gap: avg });
                    return;
                }

                const diffAbs = Math.abs(avg - current);
                const diffPct = current > 0 ? (diffAbs / current) * 100 : 100;

                if (diffPct > SYNC_THRESHOLD_PCT && diffAbs > SYNC_THRESHOLD_MIN) {
                    suggestions.push({ category, currentBudget: current, suggestedAmount: rounded, amountText: String(rounded), gap: diffAbs });
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
        try {
            for (const row of validRows) {
                await setBudget(row.category, parseFloat(row.amountText));
            }
            onApplied();
            onClose();
            showAlert('Success', `Updated ${validRows.length} budget${validRows.length === 1 ? '' : 's'}`);
        } catch {
            showAlert('Error', 'Failed to update budgets');
        } finally {
            setApplying(false);
        }
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Smart Suggestions"
            subtitle={`Based on your last ${HISTORY_MONTHS} months of spending`}
            maxHeight="85%"
            style={{ height: '85%' }}
            contentStyle={{ flex: 1 }}
        >
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {rows.length > 0 && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            backgroundColor: colors.info + '15',
                            borderColor: colors.info,
                            borderWidth: 1,
                            borderRadius: 12,
                            padding: 10,
                            marginBottom: 10
                        }}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
                            <Text style={{ flex: 1, color: colors.text, fontSize: 12, lineHeight: 16, marginLeft: 8 }}>
                                Removing a suggestion just skips it — your saved budget won&apos;t change until you tap Update.
                            </Text>
                        </View>
                    )}
                    <FlatList
                        data={rows}
                        keyExtractor={item => item.category}
                        contentContainerStyle={{ paddingBottom: 10 }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="checkmark-circle-outline" size={48} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                                    Your budgets already match your spending
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const isNew = item.currentBudget === null;
                            const isUp = !isNew && item.suggestedAmount > item.currentBudget!;
                            const delta = isNew ? 0 : Math.abs(item.suggestedAmount - item.currentBudget!);

                            return (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Ionicons name={getCategoryIcon(item.category) as any} size={18} color={colors.primary} />
                                    </View>

                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{item.category}</Text>
                                        {isNew ? (
                                            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                                                Not budgeted yet
                                            </Text>
                                        ) : (
                                            <Text style={{ color: isUp ? colors.warning : colors.success, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                                                {isUp ? '▲' : '▼'} {formatCurrencyAmount(delta, currency)} vs current
                                            </Text>
                                        )}
                                    </View>

                                    <TextInput
                                        value={item.amountText}
                                        onChangeText={(text) => handleAmountChange(item.category, text)}
                                        keyboardType="numeric"
                                        style={{
                                            width: 90,
                                            backgroundColor: colors.background,
                                            color: colors.text,
                                            padding: 8,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            textAlign: 'right',
                                            fontSize: 13
                                        }}
                                    />

                                    <TouchableOpacity onPress={() => handleRemoveRow(item.category)} style={{ padding: 8, marginLeft: 4 }}>
                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />

                    {rows.length > 0 && (
                        <TouchableOpacity
                            onPress={handleApply}
                            disabled={applying}
                            style={{
                                backgroundColor: colors.primary,
                                borderRadius: 8,
                                paddingVertical: 14,
                                alignItems: 'center',
                                marginTop: 10,
                                opacity: applying ? 0.7 : 1
                            }}
                        >
                            {applying ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                                    Update {rows.length} Budget{rows.length === 1 ? '' : 's'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </BottomModal>
    );
};

export default SmartSuggestionsModal;
