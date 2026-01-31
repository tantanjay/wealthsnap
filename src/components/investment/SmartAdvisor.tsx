import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, ScrollView } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrencyAmount } from '@utils/currencyUtils';

export interface Suggestion {
    ticker: string;
    reason: string;
    type: 'crash' | 'dip' | 'balance';
    price: number;
    hasDivSoon?: boolean;
}

import { Priority } from '@services/domain/smartAdvisorService';

interface SmartAdvisorProps {
    suggestions: Suggestion[];
    onPriorityChange: (priority: Priority) => void;
    activePriority: Priority;
    currency?: string;
}

const SuggestionItem = ({ item, width, currency }: { item: Suggestion, width: number, currency: string }) => {
    const { colors } = useTheme();

    let color = colors.primary;
    let icon = 'scale-outline';

    if (item.type === 'crash') {
        color = colors.error;
        icon = 'flame';
    } else if (item.type === 'dip') {
        color = colors.warning;
        icon = 'trending-down';
    }

    return (
        <TouchableOpacity style={[
            styles.item,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: width,
            }
        ]}>
            <View style={styles.itemHeader}>
                <View style={styles.tickerRow}>
                    <Text style={[styles.ticker, { color: colors.text }]}>{item.ticker}</Text>
                    {item.hasDivSoon && (
                        <View style={styles.divBadge}>
                            <Text style={styles.divBadgeText}>DIV</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.price, { color: colors.text }]}>{formatCurrencyAmount(item.price, currency)}</Text>
            </View>

            <View style={styles.reasonRow}>
                <Ionicons name={icon as any} size={14} color={color} style={{ marginRight: 4 }} />
                <Text style={[styles.reason, { color }]}>{item.reason}</Text>
            </View>
        </TouchableOpacity>
    );
};

export const SmartAdvisor: React.FC<SmartAdvisorProps> = ({ suggestions, onPriorityChange, activePriority, currency = 'PHP' }) => {
    const { colors } = useTheme();
    const [currentPage, setCurrentPage] = React.useState(0);

    // --- MATH RECALIBRATION ---
    const screenWidth = Dimensions.get('window').width;
    const paddingHorizontal = 16;
    const gap = 12;

    // Card width fills exactly half the remaining space
    const cardWidth = (screenWidth - (paddingHorizontal * 2) - gap) / 2;

    // The snap interval is exactly what we skip: 2 cards and 2 gaps
    // This aligns the next page perfectly with the start of the list
    const snapInterval = (cardWidth * 2) + (gap * 2);

    const totalPages = Math.ceil((suggestions?.length || 0) / 2);

    const onMomentumScrollEnd = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        // Divide by the snap interval to get the current page index
        const page = Math.round(contentOffset / snapInterval);
        setCurrentPage(page);
    };

    const renderItem = ({ item }: { item: Suggestion }) => (
        <SuggestionItem item={item} width={cardWidth} currency={currency} />
    );

    const priorities: { label: string, value: Priority, icon: string }[] = [
        { label: 'All', value: 'all', icon: 'apps' },
        { label: 'Divs', value: 'div', icon: 'cash' },
        { label: 'Dips', value: 'crash', icon: 'trending-down' },
        { label: 'Bal', value: 'balance', icon: 'scale' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="bulb" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Alerts</Text>
                </View>
            </View>

            {/* Priority Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {priorities.map((p) => (
                    <TouchableOpacity
                        key={p.value}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: activePriority === p.value ? colors.primary : colors.surface,
                                borderColor: activePriority === p.value ? colors.primary : colors.border
                            }
                        ]}
                        onPress={() => onPriorityChange(p.value)}
                    >
                        <Ionicons
                            name={p.icon as any}
                            size={14}
                            color={activePriority === p.value ? '#FFF' : colors.textSecondary}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[
                            styles.chipText,
                            { color: activePriority === p.value ? '#FFF' : colors.textSecondary }
                        ]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={{ minHeight: 100 }}>
                {(!suggestions || suggestions.length === 0) ? (
                    <View style={styles.emptyState}>
                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                            No suggestions for this priority.
                        </Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={suggestions}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => item.ticker + index}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingHorizontal: paddingHorizontal
                            }}
                            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
                            onMomentumScrollEnd={onMomentumScrollEnd}
                            decelerationRate="fast"
                            snapToInterval={snapInterval}
                            snapToAlignment="start"
                            disableIntervalMomentum={true}
                            getItemLayout={(_, index) => ({
                                length: cardWidth + gap,
                                offset: (cardWidth + gap) * index,
                                index,
                            })}
                        />

                        {/* Paging Dots */}
                        {totalPages > 1 && (
                            <View style={styles.pagination}>
                                {Array.from({ length: totalPages }).map((_, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            height: 6,
                                            width: currentPage === index ? 16 : 6,
                                            borderRadius: 3,
                                            backgroundColor: currentPage === index ? colors.primary : colors.border,
                                            opacity: currentPage === index ? 1 : 0.5,
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 16
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    item: {
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    tickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ticker: {
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 6
    },
    divBadge: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1
    },
    divBadgeText: {
        fontSize: 8,
        color: '#16a34a',
        fontWeight: 'bold'
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 4,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    reason: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    price: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 6
    },
    chipContainer: {
        marginBottom: 12,
        flexGrow: 0
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    }
});