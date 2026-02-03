import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Investment, Transaction } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface InvestmentOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    investment: Investment | null;
    linkedTransaction: Transaction | null;
    onEdit: (investment: Investment) => void;
    onDelete: (id: string, deleteLinked: boolean) => void;
    currency?: string;
}

const InvestmentOptionsModal: React.FC<InvestmentOptionsModalProps> = ({
    visible,
    onClose,
    investment,
    linkedTransaction,
    onEdit,
    onDelete,
    currency = 'PHP'
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    if (!investment) return null;

    const handleDeletePress = () => {
        showAlert(
            "Delete Investment",
            linkedTransaction
                ? "This investment has a linked transaction. Deleting this will also delete the associated transaction record."
                : "Are you sure you want to delete this investment record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onDelete(investment.id, !!linkedTransaction);
                        onClose();
                    }
                }
            ]
        );
    };

    const handleEditPress = () => {
        onEdit(investment);
        onClose();
    };

    const isBuy = investment.action === 'BUY';
    const isSell = investment.action === 'SELL';
    // const isDividend = investment.action === 'DIVIDEND';

    const iconColor = isBuy ? colors.success : (isSell ? colors.error : colors.primary);
    const iconName = isBuy ? "arrow-up-circle-outline" : (isSell ? "arrow-down-circle-outline" : "gift-outline");

    const totalValue = investment.price.multipliedBy(investment.quantity);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Investment Options"
            maxHeight="auto"
        >
            <View style={styles.container}>
                {/* Investment Preview */}
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
                            <Text style={[styles.category, { color: colors.text }]}>{investment.symbol} ({investment.action})</Text>
                            <Text style={[styles.note, { color: colors.textSecondary }]}>
                                {investment.quantity.toString()} units @ {formatCurrencyAmount(investment.price, currency)}
                            </Text>
                        </View>
                        <Text style={[
                            styles.amount,
                            { color: colors.text }
                        ]}>
                            {formatCurrencyAmount(totalValue, currency)}
                        </Text>
                    </View>

                    {/* Linked Transaction Indicator */}
                    {linkedTransaction && (
                        <View style={[styles.linkedInfo, { backgroundColor: colors.background }]}>
                            <Ionicons name="link-outline" size={14} color={colors.primary} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 6 }}>
                                Linked to Transaction • {formatCurrencyAmount(linkedTransaction.amount, currency)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleEditPress}
                    >
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit Investment</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleDeletePress}
                    >
                        <Ionicons name="trash-outline" size={24} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Investment</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Subtle ID */}
                <Text style={[styles.transactionId, { color: colors.textSecondary }]}>
                    ID: {investment.id}
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

export default InvestmentOptionsModal;
