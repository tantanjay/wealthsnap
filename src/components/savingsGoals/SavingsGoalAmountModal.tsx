import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';
import { SEVERITY_ICON } from '@utils/severity';

interface SavingsGoalAmountModalProps {
    visible: boolean;
    onClose: () => void;
    mode: 'CONTRIBUTE' | 'WITHDRAW';
    goalName: string;
    maxAmount?: BigNumber; // withdraw is capped at the goal's current balance
    onSubmit: (amount: BigNumber) => void;
}

// One amount prompt shared by Add Funds and Withdraw, since both only need a single input.
const SavingsGoalAmountModal: React.FC<SavingsGoalAmountModalProps> = ({
    visible, onClose, mode, goalName, maxAmount, onSubmit
}) => {
    const { ds } = useTheme();
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
            title={isWithdraw ? 'Withdraw to cash' : 'Add funds'}
            subtitle={goalName}
            maxHeight="60%"
            footer={
                <Pressable onPress={handleSubmit} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{isWithdraw ? 'Withdraw' : 'Add funds'}</Text>
                </Pressable>
            }
        >
            <Text style={[type.small, styles.intro, { color: ds.text2 }]}>
                {isWithdraw
                    ? 'This moves money out of the goal and back into your general cash.'
                    : 'This adds money to the goal right now, separate from its recurring schedule.'}
            </Text>
            {/* Sits on the canvas by itself, so it takes the group fill. */}
            <TextInput
                style={[type.display, styles.input, { color: ds.text, backgroundColor: ds.group }]}
                value={amount}
                onChangeText={(v) => { setAmount(v); setError(''); }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={ds.text3}
                autoFocus
            />
            {!!error && (
                <View style={styles.error}>
                    <Ionicons name={SEVERITY_ICON.error} size={16} color={ds.danger} style={styles.errorIcon} />
                    <Text style={[type.small, styles.errorText, { color: ds.danger }]}>{error}</Text>
                </View>
            )}
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    intro: {
        paddingHorizontal: layout.groupPadding,
    },
    input: {
        marginTop: space[3],
        borderRadius: radius.md,
        padding: space[3],
    },
    error: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
        marginTop: space[3],
        paddingHorizontal: layout.groupPadding,
    },
    errorIcon: {
        marginTop: 1,
    },
    errorText: {
        flexShrink: 1,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SavingsGoalAmountModal;
