import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { ReorderList, ReorderItem } from '@components/common/ReorderList';

interface InsightsSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    cardsOrder: string[];
    insightsOrder: string[];
    onUpdateCardsOrder: (newOrder: string[]) => void;
    onUpdateInsightsOrder: (newOrder: string[]) => void;
}

const InsightsSettingsModal: React.FC<InsightsSettingsModalProps> = ({
    visible,
    onClose,
    cardsOrder,
    insightsOrder,
    onUpdateCardsOrder,
    onUpdateInsightsOrder
}) => {
    const { colors } = useTheme();
    const [view, setView] = React.useState<'MAIN' | 'CARDS_REORDER' | 'INSIGHTS_REORDER'>('MAIN');

    // Reset view when modal closes
    React.useEffect(() => {
        if (!visible) {
            setView('MAIN');
        }
    }, [visible]);

    const getCardItems = (): ReorderItem[] => {
        const labels: Record<string, string> = {
            'financial-runway': 'Financial Runway',
            'budget-performance': 'Budget Health',
            'net-cash-flow': 'Net Cash Flow',
            'savings-rate': 'Savings Rate',
            'total-income': 'Total Income',
            'total-expense': 'Total Expense',
            'burn-rate': 'Burn Rate',
            'avg-daily-spending': 'Daily Average',
            'annual-spending': 'Annualized Exp.',
            'largest-category': 'Top Category'
        };
        // Combine saved order with all valid keys to ensure nothing is missing
        const uniqueIds = Array.from(new Set([...cardsOrder, ...Object.keys(labels)]));
        // Filter out any garbage IDs that are not in our labels map
        const finalOrder = uniqueIds.filter(id => labels[id]);

        return finalOrder.map(id => ({ id, label: labels[id] }));
    };

    const getInsightItems = (): ReorderItem[] => {
        const labels: Record<string, string> = {
            'overview': 'Summary Cards',
            'cumulative': 'Cumulative Spending',
            'comparison': 'Spending Comparison',
            'expense': 'Expense Analysis',
            'income': 'Income Analysis',
            'savings': 'Savings Rate',
            'alerts': 'Smart Alerts'
        };
        // Combine saved order with all valid keys to ensure nothing is missing
        const uniqueIds = Array.from(new Set([...insightsOrder, ...Object.keys(labels)]));
        // Filter out any garbage IDs that are not in our labels map
        const finalOrder = uniqueIds.filter(id => labels[id]);

        return finalOrder.map(id => ({ id, label: labels[id] }));
    };

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

    const getTitle = () => {
        switch (view) {
            case 'CARDS_REORDER': return "Reorder Cards";
            case 'INSIGHTS_REORDER': return "Reorder Sections";
            default: return "Insights Settings";
        }
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={getTitle()}
            maxHeight="auto"
            headerRight={view !== 'MAIN' ? (
                <TouchableOpacity onPress={() => setView('MAIN')} style={{ marginRight: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 16 }}>Back</Text>
                </TouchableOpacity>
            ) : undefined}
        >
            <View style={styles.container}>
                {view === 'MAIN' ? (
                    <>
                        {renderMenuItem(
                            "stats-chart",
                            "Summary Cards Layout",
                            "Reorder the top summary cards",
                            () => setView('CARDS_REORDER')
                        )}

                        <View style={{ height: 12 }} />

                        {renderMenuItem(
                            "layers",
                            "Insights Sections",
                            "Reorder the main analysis sections",
                            () => setView('INSIGHTS_REORDER')
                        )}
                    </>
                ) : view === 'CARDS_REORDER' ? (
                    <ReorderList
                        items={getCardItems()}
                        onReorder={(newItems) => onUpdateCardsOrder(newItems.map(i => i.id))}
                        containerStyle={{ maxHeight: 400 }}
                    />
                ) : (
                    <ReorderList
                        items={getInsightItems()}
                        onReorder={(newItems) => onUpdateInsightsOrder(newItems.map(i => i.id))}
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
    }
});

export default InsightsSettingsModal;
