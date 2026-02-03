import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface InvestmentSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onOpenStatsReorder: () => void;
    onOpenSectionReorder: () => void;
}

const InvestmentSettingsModal: React.FC<InvestmentSettingsModalProps> = ({
    visible,
    onClose,
    onOpenStatsReorder,
    onOpenSectionReorder
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
            title="Investment Settings"
            maxHeight="auto"
        >
            <View style={styles.container}>
                {renderMenuItem(
                    "stats-chart",
                    "Stats Cards Layout",
                    "Reorder the summary cards",
                    onOpenStatsReorder
                )}

                <View style={{ height: 12 }} />

                {renderMenuItem(
                    "layers",
                    "Dashboard Sections",
                    "Reorder main screen sections",
                    onOpenSectionReorder
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

export default InvestmentSettingsModal;
