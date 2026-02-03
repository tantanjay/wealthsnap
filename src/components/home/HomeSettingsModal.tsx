import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { ReorderList, ReorderItem } from '@components/common/ReorderList';

interface HomeSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    cardOrder: string[];
    onUpdateCardOrder: (newOrder: string[]) => void;
    displayMode: 'Overall' | 'Month' | 'MonthIncomeExpense';
    onDisplayModeChange: (mode: 'Overall' | 'Month' | 'MonthIncomeExpense') => void;
}

const HomeSettingsModal: React.FC<HomeSettingsModalProps> = ({
    visible,
    onClose,
    cardOrder,
    onUpdateCardOrder,
    displayMode,
    onDisplayModeChange
}) => {
    const { colors } = useTheme();
    const [view, setView] = React.useState<'MAIN' | 'REORDER'>('MAIN');

    // Reset view when modal closes
    React.useEffect(() => {
        if (!visible) {
            setView('MAIN');
        }
    }, [visible]);

    const getCardItems = (): ReorderItem[] => {
        const labels: Record<string, string> = {
            'cash-flow': 'Cash Flow',
            'portfolio': 'Investments',
            'debt': 'Debts & Liabilities',
            'transactions': 'Recent Transactions'
        };
        // Combine saved order with all valid keys to ensure nothing is missing
        const uniqueIds = Array.from(new Set([...cardOrder, ...Object.keys(labels)]));
        // Filter out any garbage IDs that are not in our labels map
        const finalOrder = uniqueIds.filter(id => labels[id]);

        return finalOrder.map(id => ({ id, label: labels[id] }));
    };

    const renderMenuItem = (
        icon: any,
        title: string,
        subtitle: string,
        onPress: () => void,
        rightElement?: React.ReactNode
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
            {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    const renderRadioItem = (
        label: string,
        value: 'Overall' | 'Month' | 'MonthIncomeExpense'
    ) => (
        <TouchableOpacity
            style={[styles.radioItem, { borderBottomColor: colors.border }]}
            onPress={() => onDisplayModeChange(value)}
        >
            <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
            {displayMode === value && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={view === 'MAIN' ? "Home Settings" : "Reorder Dashboard"}
            maxHeight="auto"
            headerRight={view === 'REORDER' ? (
                <TouchableOpacity onPress={() => setView('MAIN')} style={{ marginRight: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Back</Text>
                </TouchableOpacity>
            ) : undefined}
        >
            <View style={styles.container}>
                {view === 'MAIN' ? (
                    <>
                        {/* Reorder Section */}
                        {renderMenuItem(
                            "layers-outline",
                            "Reorder Dashboard",
                            "Customize the layout of your home screen",
                            () => setView('REORDER')
                        )}

                        <View style={{ height: 24 }} />

                        {/* Display Mode Section */}
                        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                            CASH FLOW DISPLAY
                        </Text>
                        <View style={[styles.radioGroup, { backgroundColor: colors.surface }]}>
                            {renderRadioItem("Overall Balance", "Overall")}
                            {renderRadioItem("This Month", "Month")}
                            <View style={{ borderBottomWidth: 0 }}>
                                {renderRadioItem("Monthly Net (No Transfers)", "MonthIncomeExpense")}
                            </View>
                        </View>
                    </>
                ) : (
                    <ReorderList
                        items={getCardItems()}
                        onReorder={(newItems) => onUpdateCardOrder(newItems.map(i => i.id))}
                        containerStyle={{ maxHeight: 400 }}
                    />
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
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1,
    },
    radioGroup: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    radioItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    }
});

export default HomeSettingsModal;
