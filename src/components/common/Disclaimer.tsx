import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { SEVERITY_ICON, getSeverityColor } from '@utils/severity';

interface DisclaimerProps {
    children: React.ReactNode;
    // 'warning' for disclaimers about real risk (e.g. data loss), 'info' for caveats on numbers.
    severity?: 'info' | 'warning';
    style?: StyleProp<ViewStyle>;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ children, severity = 'info', style }) => {
    const { colors } = useTheme();
    const severityColor = getSeverityColor(colors, severity);
    const isWarning = severity === 'warning';

    return (
        <View
            style={[
                styles.container,
                isWarning
                    ? { backgroundColor: severityColor + '15', borderColor: severityColor + '40' }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                style,
            ]}
        >
            <Ionicons name={SEVERITY_ICON[severity]} size={22} color={severityColor} style={styles.icon} />
            <Text style={[styles.text, { color: colors.text }]}>
                <Text style={[styles.label, { color: isWarning ? severityColor : colors.textSecondary }]}>Disclaimer: </Text>
                {children}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginTop: 8,
    },
    icon: {
        marginRight: 12,
        marginTop: 1,
    },
    text: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },
    label: {
        fontWeight: 'bold',
    },
});
