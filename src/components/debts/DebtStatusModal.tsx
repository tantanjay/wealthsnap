import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group, Row, SectionHeader } from '@components/ds';
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
    // Home's Loans tab opens this from a loan row, so recording a payment lives here too.
    onRecordPayment?: (debt: Debt) => void;
}

// Each status option explains itself inline, so there's no separate confirm dialog.
// Edit/Delete sit above the status options as quick single-line actions.
const DebtStatusModal: React.FC<DebtStatusModalProps> = ({ visible, onClose, debt, onUpdateStatus, onEdit, onDelete, linkedTransaction, onRecordPayment }) => {
    const { ds } = useTheme();
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

    // Closes first so the payment sheet never opens on top of this one.
    const handlePaymentPress = () => {
        onClose();
        onRecordPayment?.(debt);
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={debt.name}
            subtitle="Manage debt"
            maxHeight="85%"
        >
            <Group>
                {onRecordPayment && debt.status === 'ACTIVE' && (
                    <Row
                        domain="loans"
                        icon="cash-outline"
                        title={isReceivable ? 'Record repayment' : 'Record payment'}
                        onPress={handlePaymentPress}
                    />
                )}
                <Row icon="create-outline" title="Edit debt" onPress={handleEditPress} />
                <Row
                    leading={
                        <View style={[styles.tile, { backgroundColor: ds.tileNeutral }]}>
                            <Ionicons name="trash-outline" size={18} color={ds.danger} />
                        </View>
                    }
                    title="Delete debt"
                    onPress={handleDeletePress}
                    last
                />
            </Group>

            <SectionHeader grouped title="Status" />
            <Group>
                {debt.status === 'ACTIVE' ? (
                    <>
                        <Row
                            icon="checkmark-circle-outline"
                            title="Mark as paid off"
                            subtitle="Use this when this debt is actually settled but the payment never passed through WealthSnap - for example, someone paid it off on your behalf. It'll move to your Paid Off list and stop counting toward your totals."
                            onPress={() => handleSelect('PAID_OFF')}
                        />
                        <Row
                            icon="hand-left-outline"
                            title="Mark as forgiven"
                            subtitle={isReceivable
                                ? "Use this if you're writing this off - you no longer expect to be repaid. It'll move to your Paid Off list, labeled Forgiven, and stop counting as money owed to you."
                                : "Use this if the other side forgave what you owed them. It'll move to your Paid Off list, labeled Forgiven, and stop counting toward your debt totals."}
                            onPress={() => handleSelect('FORGIVEN')}
                            last
                        />
                    </>
                ) : (
                    <Row
                        icon="refresh-outline"
                        title={`Reactivate (${debt.status === 'PAID_OFF' ? 'Paid Off' : 'Forgiven'})`}
                        subtitle="Moves this debt back to active - it'll count toward your totals again and reappear in the payoff list."
                        onPress={() => handleSelect('ACTIVE')}
                        last
                    />
                )}
            </Group>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    // Matches Row's neutral icon tile; only the icon carries the danger tone.
    tile: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default DebtStatusModal;
