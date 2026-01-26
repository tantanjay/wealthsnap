import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Budget } from '@types';
import { getAllBudgets, setBudget, deleteBudget } from '@services/domain';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS, getCategoryGroup } from '@constants/categories';

interface BudgetManagementProps {
    visible: boolean;
    onClose: () => void;
    currency: string;
}

const BudgetManagementModal: React.FC<BudgetManagementProps> = ({ visible, onClose, currency }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [budgets, setBudgetsList] = useState<Budget[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [budgetAmount, setBudgetAmount] = useState<string>('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (showAddForm && scrollViewRef.current) {
            // Tiny delay to allow layout to update
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [showAddForm]);

    useEffect(() => {
        if (visible) {
            loadBudgets();
            setShowAddForm(false);
        }
    }, [visible]);

    const loadBudgets = async () => {
        const data = await getAllBudgets();
        setBudgetsList(data);
    };

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
            setEditingBudget(null);
            setShowAddForm(false);
            showAlert('Success', 'Budget saved successfully');
        } catch {
            showAlert('Error', 'Failed to save budget');
        }
    };

    const handleEditBudget = (budget: Budget) => {
        setSelectedCategory(budget.category);
        setBudgetAmount(budget.amount.toString());
        setEditingBudget(budget);
        setShowAddForm(true);
    };

    const handleCancelEdit = () => {
        setSelectedCategory('');
        setBudgetAmount('');
        setEditingBudget(null);
        setShowAddForm(false);
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
                        if (editingBudget?.category === category) {
                            handleCancelEdit();
                        }
                    }
                }
            ]
        );
    };

    const getCategoryIcon = (categoryValue: string): string => {
        for (const group of EXPENSE_CATEGORY_GROUPS) {
            const cat = group.items.find(c => c.value === categoryValue);
            if (cat) return cat.icon;
        }
        return 'ellipsis-horizontal';
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Manage Budgets"
            maxHeight="85%"
        >
            <ScrollView ref={scrollViewRef}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10, paddingHorizontal: 20 }}>
                    Your Budgets ({budgets.length})
                </Text>

                <FlatList
                    scrollEnabled={false}
                    data={budgets}
                    keyExtractor={item => item.category}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                                No budgets set yet
                            </Text>
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 4 }}>
                                Tap the button below to add your first budget
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => handleEditBudget(item)}
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                backgroundColor: editingBudget?.category === item.category ? colors.primary + '10' : 'transparent',
                                paddingHorizontal: 8,
                                borderRadius: 8,
                                marginBottom: 4
                            }}
                        >
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: colors.primary + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Ionicons
                                        name={getCategoryIcon(item.category) as any}
                                        size={18}
                                        color={colors.primary}
                                    />
                                </View>
                                <View>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{item.category}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                        {formatCurrencyAmount(item.amount, currency)} / month
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBudget(item.category);
                                }}
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#F44336" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />

                {/* Add/Edit Form (Expandable) */}
                {showAddForm && (
                    <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
                        </Text>

                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 5 }}>Category</Text>
                        <TouchableOpacity
                            onPress={() => setShowCategoryModal(true)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: colors.background,
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: selectedCategory ? colors.primary : colors.border,
                                marginBottom: 10
                            }}
                        >
                            {selectedCategory ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 10
                                    }}>
                                        <Ionicons
                                            name={getCategoryIcon(selectedCategory) as any}
                                            size={18}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{selectedCategory}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{getCategoryGroup(selectedCategory, 'EXPENSE')}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: colors.textSecondary }}>Select a category</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 5 }}>Monthly Limit</Text>
                        <TextInput
                            value={budgetAmount}
                            onChangeText={setBudgetAmount}
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            placeholderTextColor={colors.textSecondary}
                            style={{
                                backgroundColor: colors.background,
                                color: colors.text,
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.border,
                                marginBottom: 10
                            }}
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={handleSaveBudget}
                                style={{ flex: 1, backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>{editingBudget ? 'Update' : 'Save'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCancelEdit}
                                style={{ flex: 1, backgroundColor: colors.background, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Add Button */}
                {!showAddForm && (
                    <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <TouchableOpacity
                            onPress={() => setShowAddForm(true)}
                            style={{
                                backgroundColor: colors.primary,
                                padding: 15,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add Budget</Text>
                        </TouchableOpacity>
                    </View>
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
            </ScrollView>
        </BottomModal>
    );
};

export default BudgetManagementModal;
