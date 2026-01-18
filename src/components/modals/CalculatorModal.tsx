import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomModal from './BottomModal';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface CalculatorModalProps {
    visible: boolean;
    onClose: () => void;
    initialValue: string;
    onApply: (value: string) => void;
    type: 'EXPENSE' | 'INCOME';
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
    visible,
    onClose,
    initialValue,
    onApply,
    type
}) => {
    const { colors } = useTheme();
    const [calcDisplay, setCalcDisplay] = useState('0');
    const [calcOperator, setCalcOperator] = useState<string | null>(null);
    const [calcPrevValue, setCalcPrevValue] = useState<number | null>(null);
    const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

    useEffect(() => {
        if (visible) {
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
        if (!isNaN(value) && value > 0) {
            onApply(String(Math.round(value * 100) / 100));
        }
        onClose();
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Calculator"
        >
            {/* Display */}
            <View style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                minHeight: 70,
                justifyContent: 'center',
                alignItems: 'flex-end'
            }}>
                <Text style={{
                    color: type === 'EXPENSE' ? colors.error : colors.success,
                    fontSize: 36,
                    fontWeight: 'bold'
                }}>
                    {calcDisplay}
                </Text>
                {calcOperator && (
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                        {calcPrevValue} {calcOperator}
                    </Text>
                )}
            </View>

            {/* Calculator Buttons */}
            <View style={{ gap: 8 }}>
                {/* Row 1 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={handleCalcClear}
                        style={{ flex: 1, backgroundColor: colors.error + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.error, fontSize: 20, fontWeight: 'bold' }}>C</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setCalcDisplay(calcDisplay.slice(0, -1) || '0')}
                        style={{ flex: 1, backgroundColor: colors.warning + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Ionicons name="backspace-outline" size={24} color={colors.warning} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleCalcOperator('÷')}
                        style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>÷</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleCalcOperator('×')}
                        style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>×</Text>
                    </TouchableOpacity>
                </View>

                {/* Row 2 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['7', '8', '9'].map(d => (
                        <TouchableOpacity
                            key={d}
                            onPress={() => handleCalcDigit(d)}
                            style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        onPress={() => handleCalcOperator('-')}
                        style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>−</Text>
                    </TouchableOpacity>
                </View>

                {/* Row 3 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['4', '5', '6'].map(d => (
                        <TouchableOpacity
                            key={d}
                            onPress={() => handleCalcDigit(d)}
                            style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        onPress={() => handleCalcOperator('+')}
                        style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                </View>

                {/* Row 4 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['1', '2', '3'].map(d => (
                        <TouchableOpacity
                            key={d}
                            onPress={() => handleCalcDigit(d)}
                            style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        onPress={handleCalcEquals}
                        style={{ flex: 1, backgroundColor: colors.success, borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>=</Text>
                    </TouchableOpacity>
                </View>

                {/* Row 5 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => handleCalcDigit('0')}
                        style={{ flex: 2, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleCalcDecimal}
                        style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>.</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleCalcApply}
                        style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}
                    >
                        <Ionicons name="checkmark" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </BottomModal>
    );
};
