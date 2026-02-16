import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Transaction } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface TransactionOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    currency?: string;
}

const TransactionOptionsModal: React.FC<TransactionOptionsModalProps> = ({
    visible,
    onClose,
    transaction,
    onEdit,
    onDelete,
    currency = 'PHP'
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    if (!transaction) return null;

    // Check for specific conditions to disable edit
    const isDebtRepayment = transaction.type === 'TRANSFER_OUT' && transaction.subCategory === 'PRINCIPAL';
    const canEdit = !isDebtRepayment;
    const editDisabledReason = isDebtRepayment
        ? "Debt repayments cannot be edited. Delete and recreate if needed."
        : "";

    const handleDeletePress = () => {
        showAlert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onDelete(transaction.id);
                        onClose();
                    }
                }
            ]
        );
    };


    const handleEditPress = () => {
        if (!canEdit) {
            showAlert("Cannot Edit", editDisabledReason);
            return;
        }
        onEdit(transaction);
        onClose();
    };

    const isExpense = transaction.type === 'EXPENSE';

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Transaction Options"
            maxHeight="auto"
        >
            <View style={styles.container}>
                {/* Transaction Preview */}
                <View style={[styles.previewCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border || '#e0e0e0' }]}>
                    <View style={styles.previewHeader}>
                        <View style={[
                            styles.iconContainer,
                            { backgroundColor: isExpense ? colors.error + '20' : colors.success + '20' }
                        ]}>
                            <Ionicons
                                name={isExpense ? "remove" : "add"}
                                size={20}
                                color={isExpense ? colors.error : colors.success}
                            />
                        </View>
                        <View style={styles.details}>
                            <Text style={[styles.category, { color: colors.text }]}>{transaction.category}</Text>
                            <Text style={[styles.note, { color: colors.textSecondary }]}>
                                {transaction.note || (transaction.subCategory ? transaction.subCategory : transaction.type)}
                            </Text>
                        </View>
                        <Text style={[
                            styles.amount,
                            { color: isExpense ? colors.error : colors.success }
                        ]}>
                            {isExpense ? '-' : '+'}{formatCurrencyAmount(transaction.amount, currency)}
                        </Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface, opacity: canEdit ? 1 : 0.6 }]}
                        onPress={handleEditPress}
                        disabled={!canEdit && false}
                    >
                        <View style={{ width: 24, alignItems: 'center' }}>
                            <Ionicons name="create-outline" size={24} color={canEdit ? colors.primary : colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={[styles.actionText, { color: canEdit ? colors.primary : colors.textSecondary, marginLeft: 0 }]}>
                                {canEdit ? "Edit Transaction" : "Cannot Edit Transaction"}
                            </Text>
                            {!canEdit && (
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 }}>
                                    {editDisabledReason}
                                </Text>
                            )}
                        </View>
                        <View style={{ width: 24, alignItems: 'center' }}>
                            {canEdit && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleDeletePress}
                    >
                        <Ionicons name="trash-outline" size={24} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Transaction</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Subtle ID */}
                <Text style={[styles.transactionId, { color: colors.textSecondary }]}>
                    ID: {transaction.id}
                </Text>
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20
    },
    previewCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    details: {
        flex: 1,
    },
    category: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    note: {
        fontSize: 14,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    actions: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    separator: {
        height: 1,
        width: '100%',
    },
    transactionId: {
        fontSize: 10,
        opacity: 0.8,
        textAlign: 'center',
        marginTop: 12,
        fontFamily: 'monospace',
    }
});

export default TransactionOptionsModal;
