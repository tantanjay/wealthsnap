import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { SEVERITY_ICON } from '@utils/severity';
import { type, space, radius, severityColor as toSeverityColor } from '@styles/theme';

interface DisclaimerProps {
    children: React.ReactNode;
    // 'warning' for disclaimers about real risk (e.g. data loss), 'info' for caveats on numbers.
    severity?: 'info' | 'warning';
    // Inside a Group: `inset` fill instead of the on-canvas `group` fill.
    inGroup?: boolean;
    style?: StyleProp<ViewStyle>;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ children, severity = 'info', inGroup, style }) => {
    const { ds } = useTheme();
    const severityColor = toSeverityColor(ds, severity);
    const isWarning = severity === 'warning';

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: inGroup ? ds.inset : ds.group, borderColor: isWarning ? ds.warning : 'transparent' },
                style,
            ]}
        >
            <Ionicons name={SEVERITY_ICON[severity]} size={18} color={severityColor} />
            <Text style={[type.small, styles.text, { color: ds.text }]}>
                <Text style={[type.smallStrong, { color: isWarning ? ds.warning : ds.text2 }]}>Disclaimer: </Text>
                {children}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[3],
        borderRadius: radius.md,
        borderWidth: 1,
        padding: space[4],
        marginTop: space[2],
    },
    text: {
        flex: 1,
    },
});
