import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { type, space } from '@styles/theme';
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
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    // A single record's amount shows in Discreet, like its Ledger row; Hidden masks it.
    const money = (...args: Parameters<typeof formatCurrencyAmount>) => (mode === 'hidden' ? '****' : formatCurrencyAmount(...args));
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

    const rate = new BigNumber(investment.exchangeRate || 1);

    // Any rate other than 1 means price was converted on save - including rates below 1
    // (e.g. JPY into PHP), which a "> 1" check would leave shown in profile currency.
    const displayCurrency = investment.currency || currency;
    const isNative = rate.isGreaterThan(0) && !rate.isEqualTo(1);

    const displayPrice = isNative ? investment.price.dividedBy(rate) : investment.price;
    const totalValue = displayPrice.multipliedBy(investment.quantity);

    const displayLinkedAmount = linkedTransaction
        ? (isNative ? linkedTransaction.amount.dividedBy(rate) : linkedTransaction.amount)
        : null;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Investment options"
            maxHeight="auto"
        >
            <Row
                icon={isBuy ? 'arrow-up-circle-outline' : (isSell ? 'arrow-down-circle-outline' : 'gift-outline')}
                title={`${investment.symbol} (${investment.action})`}
                subtitle={`${investment.quantity.toString()} units @ ${money(displayPrice, displayCurrency)}`}
                value={money(totalValue, displayCurrency)}
            >
                {isNative && (
                    <Text style={[type.small, { color: ds.text2 }]}>
                        Rate: 1 {displayCurrency} = {rate.toFixed(2)} {currency}
                    </Text>
                )}
            </Row>
            {linkedTransaction && (
                <Row
                    icon="link-outline"
                    title="Linked transaction"
                    value={displayLinkedAmount ? money(displayLinkedAmount, displayCurrency) : undefined}
                />
            )}
            <Row icon="create-outline" title="Edit investment" onPress={handleEditPress} />
            <Row
                leading={<Ionicons name="trash-outline" size={20} color={ds.danger} />}
                title="Delete investment"
                onPress={handleDeletePress}
                last
            />

            <Text style={[type.caption, styles.id, { color: ds.text3 }]}>ID: {investment.id}</Text>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    id: {
        textAlign: 'center',
        marginTop: space[3],
    },
});

export default InvestmentOptionsModal;
