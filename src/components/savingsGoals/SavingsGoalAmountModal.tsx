import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { BigNumber } from 'bignumber.js';
import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface SavingsGoalAmountModalProps {
    visible: boolean;
    onClose: () => void;
    mode: 'CONTRIBUTE' | 'WITHDRAW';
    goalName: string;
    maxAmount?: BigNumber; // withdraw is capped at the goal's current balance
    onSubmit: (amount: BigNumber) => void;
}

/**
 * Shared amount-entry prompt for Manual Top-Up ("Add Funds") and Withdraw - both actions
 * only ever need a single amount input, so one modal serves both rather than two
 * near-identical files.
 */
const SavingsGoalAmountModal: React.FC<SavingsGoalAmountModalProps> = ({
    visible, onClose, mode, goalName, maxAmount, onSubmit
}) => {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the amount input on open; see FIXES.md
            setAmount('');
            setError('');
        }
    }, [visible]);

    const isWithdraw = mode === 'WITHDRAW';

    const handleSubmit = () => {
        const parsed = new BigNumber(amount || 0);
        if (!amount || parsed.isNaN() || parsed.isLessThanOrEqualTo(0)) {
            setError('Enter an amount greater than zero.');
            return;
        }
        if (isWithdraw && maxAmount && parsed.isGreaterThan(maxAmount)) {
            setError(`Can't withdraw more than the goal's current balance.`);
            return;
        }
        onSubmit(parsed);
        onClose();
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={isWithdraw ? 'Withdraw to Cash' : 'Add Funds'}
            subtitle={goalName}
            maxHeight="60%"
        >
            <View style={{ gap: 12, paddingBottom: 20 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {isWithdraw
                        ? 'This moves money out of the goal and back into your general cash.'
                        : 'This adds money to the goal right now, separate from its recurring schedule.'}
                </Text>
                <TextInput
                    style={{
                        color: colors.text,
                        fontSize: 28,
                        fontWeight: 'bold',
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        padding: 8,
                    }}
                    value={amount}
                    onChangeText={(v) => { setAmount(v); setError(''); }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.gray300}
                    autoFocus
                />
                {!!error && <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text>}
                <Button title={isWithdraw ? 'Withdraw' : 'Add Funds'} onPress={handleSubmit} />
            </View>
        </BottomModal>
    );
};

export default SavingsGoalAmountModal;
