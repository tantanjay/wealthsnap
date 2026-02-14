import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Debt, Transaction } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface DebtOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    debt: Debt | null;
    linkedTransaction: Transaction | null;
    onDelete: (id: string, deleteLinked: boolean) => void;
    onEdit: (debt: Debt) => void;
    currency?: string;
}

const DebtOptionsModal: React.FC<DebtOptionsModalProps> = ({
    visible,
    onClose,
    debt,
    linkedTransaction,
    onDelete,
    onEdit,
    currency = 'PHP'
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    if (!debt) return null;

    const handleDeletePress = () => {
        showAlert(
            "Delete Debt",
            linkedTransaction
                ? "This debt has a linked transaction. Deleting this will also delete the associated transaction record."
                : "Are you sure you want to delete this debt record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onDelete(debt.id, !!linkedTransaction);
                        onClose();
                    }
                }
            ]
        );
    };

    const isPayable = debt.direction === 'PAYABLE';
    const iconColor = isPayable ? colors.error : colors.success;
    const iconName = isPayable ? "arrow-down-circle-outline" : "arrow-up-circle-outline";

    // Format currency if debt has specific currency
    const displayCurrency = debt.currency || currency;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Debt Options"
            maxHeight="auto"
        >
            <View style={styles.container}>
                {/* Debt Preview */}
                <View style={[styles.previewCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border || '#e0e0e0' }]}>
                    <View style={styles.previewHeader}>
                        <View style={[
                            styles.iconContainer,
                            { backgroundColor: iconColor + '20' }
                        ]}>
                            <Ionicons
                                name={iconName}
                                size={20}
                                color={iconColor}
                            />
                        </View>
                        <View style={styles.details}>
                            <Text style={[styles.category, { color: colors.text }]}>{debt.name}</Text>
                            <Text style={[styles.note, { color: colors.textSecondary }]}>
                                {debt.type.replace(/_/g, ' ')} • {debt.interestRate.toString()}% {debt.interestType}
                            </Text>
                        </View>
                        <Text style={[
                            styles.amount,
                            { color: colors.text }
                        ]}>
                            {formatCurrencyAmount(debt.initialAmount, displayCurrency)}
                        </Text>
                    </View>

                    {/* Linked Transaction Indicator */}
                    {linkedTransaction && (
                        <View style={[styles.linkedInfo, { backgroundColor: colors.background }]}>
                            <Ionicons name="link-outline" size={14} color={colors.primary} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 6 }}>
                                Linked to Transaction • {formatCurrencyAmount(linkedTransaction.amount, displayCurrency)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={() => {
                            if (debt) {
                                onEdit(debt);
                                onClose();
                            }
                        }}
                    >
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit Debt</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleDeletePress}
                    >
                        <Ionicons name="trash-outline" size={24} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Debt</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Subtle ID */}
                <Text style={[styles.transactionId, { color: colors.textSecondary }]}>
                    ID: {debt.id}
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
    linkedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 8,
        borderRadius: 8,
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

export default DebtOptionsModal;
