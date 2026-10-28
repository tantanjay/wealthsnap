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
    style?: StyleProp<ViewStyle>;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ children, severity = 'info', style }) => {
    const { ds } = useTheme();
    const severityColor = toSeverityColor(ds, severity);
    const isWarning = severity === 'warning';

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: ds.inset, borderColor: isWarning ? ds.warning : 'transparent' },
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
