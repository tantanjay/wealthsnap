import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type } from '@styles/theme';
import { Tone, toneColor } from './tone';

export interface ChangeLineProps {
    // Already formatted (and privacy-masked) by the caller, e.g. "▲ ₱15,100 · 3.2% this month".
    text: string;
    tone?: Tone;
    // `small` under a hero, `caption` under row values and tiles.
    size?: 'small' | 'caption';
    style?: StyleProp<TextStyle>;
}

const ChangeLine: React.FC<ChangeLineProps> = ({ text, tone = 'neutral', size = 'caption', style }) => {
    const { ds } = useTheme();
    return (
        <Text style={[size === 'small' ? type.smallNum : type.captionNum, { color: toneColor(ds, tone) }, style]}>
            {text}
        </Text>
    );
};

export default ChangeLine;
