import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import SmartSuggestionsModal from '@components/profile/SmartSuggestionsModal';
import { Group, Row, SectionHeader, IconName } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { usePrivacy } from '@context/PrivacyContext';
import { BigNumber } from 'bignumber.js';
import { type, space, radius, layout } from '@styles/theme';

import { EmptyState } from '@components/common/EmptyState';
import { Budget } from '@types';
import { getAllBudgets, setBudget, deleteBudget } from '@services/domain/budgetService';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS, getCategoryGroup } from '@constants/categories';

interface BudgetManagementProps {
    visible: boolean;
    onClose: () => void;
    currency: string;
}

const BudgetManagementModal: React.FC<BudgetManagementProps> = ({ visible, onClose, currency }) => {
    const { ds } = useTheme();
    // No Discreet version: Discreet falls back to Hidden.
    const { isPrivacyEnabled } = usePrivacy();
    const amount = (value: BigNumber) => (isPrivacyEnabled ? '****' : formatCurrencyAmount(value, currency));
    const { showAlert } = useAlert();
    const [budgets, setBudgetsList] = useState<Budget[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [budgetAmount, setBudgetAmount] = useState<string>('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const loadBudgets = async () => {
        const data = await getAllBudgets();
        const sortedData = data.sort((a, b) => b.amount.minus(a.amount).toNumber());
        setBudgetsList(sortedData);
    };

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load + view reset on open; see FIXES.md
            loadBudgets();
            setView('LIST');
        }
    }, [visible]);

    const handleSaveBudget = async () => {
        if (!selectedCategory || !budgetAmount) {
            showAlert('Error', 'Please select a category and enter an amount');
            return;
        }

        const amount = parseFloat(budgetAmount);
        if (isNaN(amount) || amount <= 0) {
            showAlert('Error', 'Please enter a valid amount');
            return;
        }

        try {
            await setBudget(selectedCategory, amount);
            await loadBudgets();
            setSelectedCategory('');
            setBudgetAmount('');
            setEditingBudget(null);
            setView('LIST');
            showAlert('Success', 'Budget saved successfully');
        } catch {
            showAlert('Error', 'Failed to save budget');
        }
    };

    const handleEditBudget = (budget: Budget) => {
        setSelectedCategory(budget.category);
        setBudgetAmount(budget.amount.toString());
        setEditingBudget(budget);
        setView('FORM');
    };

    const handleAddBudget = () => {
        setSelectedCategory('');
        setBudgetAmount('');
        setEditingBudget(null);
        setView('FORM');
    };

    const handleCancelEdit = () => {
        setSelectedCategory('');
        setBudgetAmount('');
        setEditingBudget(null);
        setView('LIST');
    };

    const handleDeleteBudget = async (category: string) => {
        showAlert(
            'Delete Budget',
            `Remove budget for ${category}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteBudget(category);
                        await loadBudgets();
                    }
                }
            ]
        );
    };

    const totalBudget = budgets.reduce((sum, b) => sum.plus(b.amount), new BigNumber(0));

    const getCategoryIcon = (categoryValue: string): IconName => {
        for (const group of EXPENSE_CATEGORY_GROUPS) {
            const cat = group.items.find(c => c.value === categoryValue);
            if (cat) return cat.icon as IconName;
        }
        return 'ellipsis-horizontal';
    };

    const isList = view === 'LIST';

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={isList ? 'Manage budgets' : editingBudget ? 'Edit budget' : 'New budget'}
            maxHeight="85%"
            headerRight={isList ? (
                <Pressable
                    onPress={() => setShowSuggestions(true)}
                    hitSlop={space[2]}
                    style={styles.headerAction}
                    accessibilityLabel="Smart suggestions"
                >
                    <Ionicons name="sparkles-outline" size={22} color={ds.text2} />
                </Pressable>
            ) : undefined}
            footer={isList ? (
                <Pressable onPress={handleAddBudget} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Add budget</Text>
                </Pressable>
            ) : (
                <>
                    <Pressable onPress={handleSaveBudget} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{editingBudget ? 'Update budget' : 'Save budget'}</Text>
                    </Pressable>
                    <Pressable onPress={handleCancelEdit} style={styles.textButton} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                </>
            )}
        >
            <View style={styles.body}>
                {isList ? (
                    <>
                        <View style={styles.summary}>
                            <Text style={[type.smallStrong, { color: ds.text }]}>
                                Your budgets ({budgets.length})
                            </Text>
                            {budgets.length > 0 && (
                                <Text style={[type.smallNum, { color: ds.text2 }]}>
                                    Total {amount(totalBudget)}
                                </Text>
                            )}
                        </View>

                        {budgets.length === 0 ? (
                            <EmptyState
                                size="compact"
                                icon="wallet-outline"
                                title="No budgets set yet"
                                subtitle="Tap Add budget to set your first one"
                            />
                        ) : (
                            // A plain list in a Group; a budget per category keeps it short enough not to virtualize.
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Group>
                                    {budgets.map((item, index) => (
                                        <Row
                                            key={item.category}
                                            icon={getCategoryIcon(item.category)}
                                            title={item.category}
                                            subtitle={`${amount(item.amount)} / month`}
                                            onPress={() => handleEditBudget(item)}
                                            last={index === budgets.length - 1}
                                            trailing={
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteBudget(item.category);
                                                    }}
                                                    hitSlop={space[2]}
                                                    accessibilityLabel={`Delete ${item.category} budget`}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color={ds.danger} />
                                                </Pressable>
                                            }
                                        />
                                    ))}
                                </Group>
                            </ScrollView>
                        )}
                    </>
                ) : (
                    <ScrollView keyboardShouldPersistTaps="handled">
                        <SectionHeader grouped title="Category" style={styles.firstHeader} />
                        <Group>
                            <Row
                                icon={selectedCategory ? getCategoryIcon(selectedCategory) : 'pricetag-outline'}
                                title={selectedCategory || 'Select a category'}
                                subtitle={selectedCategory ? getCategoryGroup(selectedCategory, 'EXPENSE') : undefined}
                                chevron
                                onPress={() => setShowCategoryModal(true)}
                                last
                            />
                        </Group>

                        <SectionHeader grouped title="Monthly limit" />
                        <Group padded>
                            <View style={[styles.field, { backgroundColor: ds.inset }]}>
                                <Ionicons name="cash-outline" size={18} color={ds.text2} />
                                <TextInput
                                    value={budgetAmount}
                                    onChangeText={setBudgetAmount}
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                    placeholderTextColor={ds.text3}
                                    style={[type.bodyNum, styles.fieldMain, styles.input, { color: ds.text }]}
                                />
                            </View>
                        </Group>
                    </ScrollView>
                )}

                {/* Category Select Modal */}
                <CategorySelectModal
                    visible={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    onSelect={(cat) => {
                        setSelectedCategory(cat);
                        setShowCategoryModal(false);
                    }}
                    categoryGroups={EXPENSE_CATEGORY_GROUPS}
                />

                <SmartSuggestionsModal
                    visible={showSuggestions}
                    onClose={() => setShowSuggestions(false)}
                    currency={currency}
                    onApplied={loadBudgets}
                />
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    body: {
        flexShrink: 1,
    },
    headerAction: {
        marginRight: space[3],
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    // The sheet title already spaces the first header from the top.
    firstHeader: {
        marginTop: 0,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldMain: {
        flex: 1,
    },
    input: {
        padding: 0,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default BudgetManagementModal;
