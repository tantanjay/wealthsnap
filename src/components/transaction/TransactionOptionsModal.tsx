import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { type, space } from '@styles/theme';
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
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    // A single record's amount shows in Discreet, like its Ledger row; Hidden masks it.
    const money = (...args: Parameters<typeof formatCurrencyAmount>) => (mode === 'hidden' ? '****' : formatCurrencyAmount(...args));
    const { showAlert } = useAlert();

    if (!transaction) return null;

    // Check for specific conditions to disable edit
    const isDebtRepayment = transaction.type === 'TRANSFER_OUT' && transaction.subCategory === 'PRINCIPAL';
    // A goal-tagged transaction (contribution or goal-funded expense) has a paired leg
    // elsewhere in the ledger (offsetting TRANSFER_IN, or the contribution itself) that this
    // generic form has no way to keep in sync - editing here would desync goal/cash balances.
    const isSavingsGoalTx = transaction.savingsGoalId != null;
    const canEdit = !isDebtRepayment && !isSavingsGoalTx;
    const editDisabledReason = isDebtRepayment
        ? "Debt repayments cannot be edited. Delete and recreate if needed."
        : isSavingsGoalTx
            ? "Savings goal transactions cannot be edited. Delete and recreate if needed."
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
            title="Transaction options"
            maxHeight="auto"
        >
            <Row
                icon={isExpense ? 'remove' : 'add'}
                title={transaction.category}
                subtitle={transaction.note || (transaction.subCategory ? transaction.subCategory : transaction.type)}
                value={`${isExpense ? '\u2212' : '+'}${money(transaction.amount, currency)}`}
                valueTone={isExpense ? 'bad' : 'good'}
            />
            {/* Stays tappable when locked so the alert can explain why */}
            <Row
                icon="create-outline"
                title={canEdit ? "Edit transaction" : "Cannot edit transaction"}
                subtitle={canEdit ? undefined : editDisabledReason}
                onPress={handleEditPress}
                style={canEdit ? undefined : styles.locked}
            />
            <Row
                leading={<Ionicons name="trash-outline" size={20} color={ds.danger} />}
                title="Delete transaction"
                onPress={handleDeletePress}
                last
            />

            <Text style={[type.caption, styles.id, { color: ds.text3 }]}>ID: {transaction.id}</Text>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    locked: {
        opacity: 0.6,
    },
    id: {
        textAlign: 'center',
        marginTop: space[3],
    },
});

export default TransactionOptionsModal;
