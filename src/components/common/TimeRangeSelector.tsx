import React, { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';

import { DropdownMenu, DropdownAnchor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';

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

// Text trigger ("6M ⌄") with a dropdown anchored under it, like SectionHeader's menu.
const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange, options = ['6M', '1Y', '3Y', 'ALL'] }) => {
    const { ds } = useTheme();
    const triggerRef = useRef<View>(null);
    const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);

    const openMenu = () => {
        triggerRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
    };

    return (
        <>
            <Pressable ref={triggerRef} onPress={openMenu} hitSlop={space[2]}>
                <Text style={[type.smallMedium, { color: ds.accent }]}>{value} ⌄</Text>
            </Pressable>
            <DropdownMenu
                anchor={anchor}
                options={options.map(range => ({ key: range, label: RANGE_LABELS[range] }))}
                value={value}
                onSelect={onChange}
                onClose={() => setAnchor(null)}
            />
        </>
    );
};

export default TimeRangeSelector;
