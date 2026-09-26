import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';

export type TimeRange = '6M' | '1Y' | '3Y' | 'ALL';

const RANGE_LABELS: Record<TimeRange, string> = {
    '6M': '6 Months',
    '1Y': '1 Year',
    '3Y': '3 Years',
    'ALL': 'All Time',
};

interface TimeRangeSelectorProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
    options?: readonly TimeRange[];
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange, options = ['6M', '1Y', '3Y', 'ALL'] }) => {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View>
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.border + '40',
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginRight: 4 }}>
                    {value}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Centered overlay - never anchored to the trigger's on-screen position, so it can't overflow on any page/width */}
            <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
                <TouchableOpacity
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: 10,
                            paddingVertical: 4,
                            minWidth: 180,
                            borderWidth: 1,
                            borderColor: colors.border,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            elevation: 8,
                        }}
                    >
                        {options.map((range) => (
                            <TouchableOpacity
                                key={range}
                                onPress={() => {
                                    onChange(range);
                                    setIsOpen(false);
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 10,
                                    paddingHorizontal: 14,
                                }}
                            >
                                <Text style={{
                                    color: value === range ? colors.primary : colors.text,
                                    fontSize: 13,
                                    fontWeight: value === range ? '600' : '400',
                                }}>
                                    {RANGE_LABELS[range]}
                                </Text>
                                {value === range && (
                                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default TimeRangeSelector;
