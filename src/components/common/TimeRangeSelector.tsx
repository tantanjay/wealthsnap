import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
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
    const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const anchorRef = useRef<View>(null);

    const openMenu = () => {
        anchorRef.current?.measureInWindow((x, y, width, height) => {
            setAnchor({ x, y, width, height });
            setIsOpen(true);
        });
    };

    const screenWidth = Dimensions.get('window').width;
    const rightOffset = Math.max(16, screenWidth - (anchor.x + anchor.width));

    return (
        <View ref={anchorRef} collapsable={false}>
            <TouchableOpacity
                onPress={openMenu}
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
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginRight: 4 }}>
                    {value}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View
                        style={{
                            position: 'absolute',
                            top: anchor.y + anchor.height + 4,
                            right: rightOffset,
                            backgroundColor: colors.surface,
                            borderRadius: 10,
                            paddingVertical: 4,
                            minWidth: 130,
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
