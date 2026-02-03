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
    onFetchPriceList?: (duration: string) => void;
}

const InvestmentSettingsModal: React.FC<InvestmentSettingsModalProps> = ({
    visible,
    onClose,
    onOpenStatsReorder,
    onOpenSectionReorder,
    onFetchPriceList
}) => {
    const { colors } = useTheme();
    const [view, setView] = React.useState<'MAIN' | 'FETCH_OPTIONS'>('MAIN');

    // Reset view when modal closes
    React.useEffect(() => {
        if (!visible) {
            setView('MAIN');
        }
    }, [visible]);

    const renderMenuItem = (
        icon: any,
        title: string,
        subtitle: string,
        onPress: () => void,
        showChevron: boolean = true
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
            {showChevron && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    const renderFetchOption = (label: string, value: string) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={() => {
                onFetchPriceList?.(value);
                onClose();
            }}
        >
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text, marginLeft: 16 }]}>{label}</Text>
            </View>
            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={view === 'MAIN' ? "Investment Settings" : "Fetch Price List"}
            maxHeight="auto"
            headerRight={view === 'FETCH_OPTIONS' ? (
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

                        <View style={{ height: 12 }} />

                        {renderMenuItem(
                            "pricetag",
                            "Fetch Price List",
                            "Bulk update stock prices",
                            () => setView('FETCH_OPTIONS')
                        )}
                    </>
                ) : (
                    <>
                        <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: 12, borderRadius: 8, marginBottom: 15, flexDirection: 'row' }}>
                            <Ionicons name="warning-outline" size={20} color="#FF9800" style={{ marginRight: 8, marginTop: 2 }} />
                            <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                                AI-fetched prices are estimates and may vary from real-time official records.
                            </Text>
                        </View>
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            Select how far back to fetch prices for all your Stocks.
                        </Text>
                        {renderFetchOption("Today", "Today")}
                        <View style={{ height: 8 }} />
                        {renderFetchOption("Last 3 Days", "Last 3 days")}
                        <View style={{ height: 8 }} />
                        {renderFetchOption("Last 7 Days", "Last 7 days")}
                    </>
                )}
            </View>
        </BottomModal >
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
    helperText: {
        fontSize: 14,
        marginBottom: 8,
        paddingHorizontal: 4
    }
});

export default InvestmentSettingsModal;
