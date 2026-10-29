import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { type, space } from '@styles/theme';
import { Debt, Transaction } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { getDebtResolution, DEBT_RESOLUTION_LABELS } from '@utils/debtMetrics';
import { useConfirmDeleteDebt } from '@hooks/useConfirmDeleteDebt';

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
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    // A single record's amount shows in Discreet, like its Ledger row; Hidden masks it.
    const money = (...args: Parameters<typeof formatCurrencyAmount>) => (mode === 'hidden' ? '****' : formatCurrencyAmount(...args));
    const confirmDeleteDebt = useConfirmDeleteDebt(onDelete, onClose);

    if (!debt) return null;

    const handleDeletePress = () => confirmDeleteDebt(debt.id, linkedTransaction);

    // This badge only ever shows for a non-ACTIVE debt (gated below), so no currentBalance
    // is needed here - PAID (real-payment) never applies to a still-ACTIVE record.
    const resolution = getDebtResolution(debt);
    const isPayable = debt.direction === 'PAYABLE';

    // Format currency if debt has specific currency
    const displayCurrency = debt.currency || currency;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Debt options"
            maxHeight="auto"
        >
            <Group>
                <Row
                    domain="loans"
                    icon={isPayable ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                    title={debt.name}
                    subtitle={`${debt.type.replace(/_/g, ' ')} · ${debt.interestRate.toString()}% ${debt.interestType}`}
                    value={money(debt.initialAmount, displayCurrency)}
                    change={resolution ? DEBT_RESOLUTION_LABELS[resolution] : undefined}
                    changeTone={resolution === 'FORGIVEN' ? 'neutral' : 'good'}
                />
                {linkedTransaction && (
                    <Row
                        icon="link-outline"
                        title="Linked transaction"
                        value={money(linkedTransaction.amount, displayCurrency)}
                    />
                )}
                <Row
                    icon="create-outline"
                    title="Edit debt"
                    onPress={() => {
                        onEdit(debt);
                        onClose();
                    }}
                />
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

            <Text style={[type.caption, styles.id, { color: ds.text3 }]}>ID: {debt.id}</Text>
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
    id: {
        textAlign: 'center',
        marginTop: space[3],
    },
});

export default DebtOptionsModal;
