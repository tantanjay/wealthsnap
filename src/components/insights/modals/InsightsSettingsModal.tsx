import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface InsightsSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onOpenCardsReorder: () => void;
    onOpenInsightsReorder: () => void;
}

const InsightsSettingsModal: React.FC<InsightsSettingsModalProps> = ({
    visible,
    onClose,
    onOpenCardsReorder,
    onOpenInsightsReorder
}) => {
    const { colors } = useTheme();

    const renderMenuItem = (
        icon: any,
        title: string,
        subtitle: string,
        onPress: () => void
    ) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={onPress}
        >
            <View style={styles.menuContent}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Insights Settings"
            maxHeight="auto"
        >
            <View style={styles.container}>
                {renderMenuItem(
                    "grid-outline",
                    "Summary Cards Layout",
                    "Reorder the top summary cards",
                    onOpenCardsReorder
                )}

                <View style={{ height: 12 }} />

                {renderMenuItem(
                    "list-outline",
                    "Insights Sections",
                    "Reorder the main analysis sections",
                    onOpenInsightsReorder
                )}
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
    },
    menuContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
    }
});

export default InsightsSettingsModal;
