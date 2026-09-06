import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { Debt, DebtStatus, Transaction } from '@types';
import { useConfirmDeleteDebt } from '@hooks/useConfirmDeleteDebt';

interface DebtStatusModalProps {
    visible: boolean;
    onClose: () => void;
    debt: Debt | null;
    onUpdateStatus: (debt: Debt, status: DebtStatus) => void;
    onEdit: (debt: Debt) => void;
    onDelete: (id: string, deleteLinked: boolean) => void;
    linkedTransaction: Transaction | null;
}

// Explanation lives directly on each option instead of behind a separate confirm dialog -
// by the time you tap, you've already read what it does, so there's nothing left to confirm.
// Edit/Delete sit above the status options as quick single-line actions - everything you'd
// want to do to a debt record, behind the one gear icon on its card.
const DebtStatusModal: React.FC<DebtStatusModalProps> = ({ visible, onClose, debt, onUpdateStatus, onEdit, onDelete, linkedTransaction }) => {
    const { colors } = useTheme();
    const confirmDeleteDebt = useConfirmDeleteDebt(onDelete, onClose);

    if (!debt) return null;

    const isReceivable = debt.direction === 'RECEIVABLE';

    const handleSelect = (status: DebtStatus) => {
        onUpdateStatus(debt, status);
        onClose();
    };

    const handleEditPress = () => {
        onEdit(debt);
        onClose();
    };

    const handleDeletePress = () => confirmDeleteDebt(debt.id, linkedTransaction);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={debt.name}
            subtitle="Manage Debt"
            maxHeight="85%"
        >
            <View style={styles.container}>
                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleEditPress}
                    >
                        <Ionicons name="create-outline" size={22} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit Debt</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface }]}
                        onPress={handleDeletePress}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Debt</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {debt.status === 'ACTIVE' ? (
                    <>
                        <TouchableOpacity
                            style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleSelect('PAID_OFF')}
                        >
                            <View style={styles.optionHeader}>
                                <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                                <Text style={[styles.optionTitle, { color: colors.text }]}>Mark as Paid Off</Text>
                            </View>
                            <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                                Use this when this debt is actually settled but the payment never passed through WealthSnap - for example, someone paid it off on your behalf. It&apos;ll move to your Paid Off list and stop counting toward your totals.
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleSelect('FORGIVEN')}
                        >
                            <View style={styles.optionHeader}>
                                <Ionicons name="hand-left-outline" size={22} color={colors.textSecondary} />
                                <Text style={[styles.optionTitle, { color: colors.text }]}>Mark as Forgiven</Text>
                            </View>
                            <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                                {isReceivable
                                    ? "Use this if you're writing this off - you no longer expect to be repaid. It'll move to your Paid Off list, labeled Forgiven, and stop counting as money owed to you."
                                    : "Use this if the other side forgave what you owed them. It'll move to your Paid Off list, labeled Forgiven, and stop counting toward your debt totals."}
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => handleSelect('ACTIVE')}
                    >
                        <View style={styles.optionHeader}>
                            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
                            <Text style={[styles.optionTitle, { color: colors.text }]}>
                                Reactivate ({debt.status === 'PAID_OFF' ? 'Paid Off' : 'Forgiven'})
                            </Text>
                        </View>
                        <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                            Moves this debt back to active - it&apos;ll count toward your totals again and reappear in the payoff list.
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20,
        gap: 12,
    },
    quickActions: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        justifyContent: 'space-between',
    },
    actionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 12,
    },
    separator: {
        height: 1,
        width: '100%',
    },
    optionCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    optionBody: {
        fontSize: 13,
        lineHeight: 19,
    },
});

export default DebtStatusModal;
