import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { TransactionType } from '@types';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface CalculatorModalProps {
    visible: boolean;
    onClose: () => void;
    initialValue: string;
    onApply: (value: string) => void;
    type: TransactionType;
    allowNegative?: boolean;
    allowZero?: boolean;
}

type KeyTone = 'digit' | 'op' | 'equals';

// Grid key (inside the group): inset for digits and operators, accent only for equals. Pass `label` or an icon child.
const CalcKey: React.FC<{ onPress: () => void; flex?: number; tone?: KeyTone; label?: string; children?: React.ReactNode }> = ({ onPress, flex = 1, tone = 'digit', label, children }) => {
    const { ds } = useTheme();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.key,
                { flex, backgroundColor: tone === 'equals' ? ds.accent : ds.inset, opacity: pressed ? 0.7 : 1 }
            ]}
        >
            {label ? (
                <Text style={[type.titleNum, { color: tone === 'equals' ? ds.onAccent : tone === 'op' ? ds.text2 : ds.text }]}>{label}</Text>
            ) : children}
        </Pressable>
    );
};

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
    visible,
    onClose,
    initialValue,
    onApply,
    type: transactionType,
    allowNegative = false,
    allowZero = false
}) => {
    const { ds } = useTheme();
    const { height } = useWindowDimensions();
    const modalHeight = height < 800 ? '85%' : '70%';

    const [calcDisplay, setCalcDisplay] = useState('0');
    const [calcOperator, setCalcOperator] = useState<string | null>(null);
    const [calcPrevValue, setCalcPrevValue] = useState<number | null>(null);
    const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets calculator state on open; see FIXES.md
            setCalcDisplay(initialValue || '0');
            setCalcPrevValue(null);
            setCalcOperator(null);
            setCalcWaitingForOperand(false);
        }
    }, [visible, initialValue]);

    const handleCalcDigit = (digit: string) => {
        if (calcWaitingForOperand) {
            setCalcDisplay(digit);
            setCalcWaitingForOperand(false);
        } else {
            setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
        }
    };

    const handleCalcDecimal = () => {
        if (calcWaitingForOperand) {
            setCalcDisplay('0.');
            setCalcWaitingForOperand(false);
        } else if (!calcDisplay.includes('.')) {
            setCalcDisplay(calcDisplay + '.');
        }
    };

    const handleCalcOperator = (op: string) => {
        const currentValue = parseFloat(calcDisplay);

        if (calcPrevValue !== null && calcOperator && !calcWaitingForOperand) {
            const result = performCalcOperation(calcPrevValue, currentValue, calcOperator);
            setCalcDisplay(String(result));
            setCalcPrevValue(result);
        } else {
            setCalcPrevValue(currentValue);
        }

        setCalcOperator(op);
        setCalcWaitingForOperand(true);
    };

    const performCalcOperation = (prev: number, current: number, op: string): number => {
        switch (op) {
            case '+': return prev + current;
            case '-': return prev - current;
            case '×': return prev * current;
            case '÷': return current !== 0 ? prev / current : 0;
            default: return current;
        }
    };

    const handleCalcEquals = () => {
        if (calcPrevValue !== null && calcOperator) {
            const currentValue = parseFloat(calcDisplay);
            const result = performCalcOperation(calcPrevValue, currentValue, calcOperator);
            setCalcDisplay(String(Math.round(result * 100) / 100)); // Round to 2 decimals
            setCalcPrevValue(null);
            setCalcOperator(null);
            setCalcWaitingForOperand(true);
        }
    };

    const handleCalcClear = () => {
        setCalcDisplay('0');
        setCalcPrevValue(null);
        setCalcOperator(null);
        setCalcWaitingForOperand(false);
    };

    const handleCalcApply = () => {
        const value = parseFloat(calcDisplay);
        const isValid = !isNaN(value);
        const isPositive = value > 0;
        const isZero = value === 0;
        const isNegative = value < 0;

        if (isValid) {
            if (
                (isPositive) ||
                (isZero && allowZero) ||
                (isNegative && allowNegative)
            ) {
                onApply(String(Math.round(value * 100) / 100));
            }
        }
        onClose();
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Calculator"
            maxHeight={modalHeight}
            footer={
                <Pressable onPress={handleCalcApply} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Apply</Text>
                </Pressable>
            }
        >
            <Group padded style={styles.group}>
                {/* Display */}
                <View style={[styles.display, { backgroundColor: ds.inset }]}>
                    <Text
                        style={[type.display, { color: transactionType === 'EXPENSE' ? ds.danger : ds.success }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {calcDisplay}
                    </Text>
                    {calcOperator && (
                        <Text style={[type.smallNum, styles.pending, { color: ds.text2 }]}>
                            {calcPrevValue} {calcOperator}
                        </Text>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.grid}>
                        <View style={styles.row}>
                            <CalcKey onPress={handleCalcClear} tone="op" label="C" />
                            <CalcKey onPress={() => setCalcDisplay(calcDisplay.slice(0, -1) || '0')} tone="op">
                                <Ionicons name="backspace-outline" size={22} color={ds.text2} />
                            </CalcKey>
                            <CalcKey onPress={() => handleCalcOperator('÷')} tone="op" label="÷" />
                            <CalcKey onPress={() => handleCalcOperator('×')} tone="op" label="×" />
                        </View>
                        <View style={styles.row}>
                            {['7', '8', '9'].map(d => <CalcKey key={d} onPress={() => handleCalcDigit(d)} label={d} />)}
                            <CalcKey onPress={() => handleCalcOperator('-')} tone="op" label="−" />
                        </View>
                        <View style={styles.row}>
                            {['4', '5', '6'].map(d => <CalcKey key={d} onPress={() => handleCalcDigit(d)} label={d} />)}
                            <CalcKey onPress={() => handleCalcOperator('+')} tone="op" label="+" />
                        </View>
                        <View style={styles.row}>
                            {['1', '2', '3'].map(d => <CalcKey key={d} onPress={() => handleCalcDigit(d)} label={d} />)}
                            <CalcKey onPress={handleCalcEquals} tone="equals" label="=" />
                        </View>
                        <View style={styles.row}>
                            <CalcKey onPress={() => handleCalcDigit('0')} flex={3} label="0" />
                            <CalcKey onPress={handleCalcDecimal} label="." />
                        </View>
                    </View>
                </ScrollView>
            </Group>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    // Lets the keypad scroll inside the group on short screens.
    group: {
        flexShrink: 1,
    },
    display: {
        borderRadius: radius.md,
        padding: space[4],
        marginBottom: space[4],
        minHeight: 72,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    pending: {
        marginTop: space[1],
    },
    grid: {
        gap: space[2],
    },
    row: {
        flexDirection: 'row',
        gap: space[2],
    },
    key: {
        borderRadius: radius.md,
        paddingVertical: space[3],
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
