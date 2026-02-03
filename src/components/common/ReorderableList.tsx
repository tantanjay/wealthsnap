import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

export interface ReorderableItem {
    id: string;
    label: string;
    icon?: string;
    iconColor?: string;
}

interface ReorderableListProps {
    items: ReorderableItem[];
    order: string[];
    onReorder: (newOrder: string[]) => void;
}

export const ReorderableList: React.FC<ReorderableListProps> = ({
    items,
    order,
    onReorder
}) => {
    const { colors } = useTheme();

    // Sort items based on order prop
    const sortedItems = [...items].sort((a, b) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        // If not in order array, place at end
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const moveItem = (currentIndex: number, direction: 'up' | 'down') => {
        const newOrder = [...order];
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= newOrder.length) return;

        // Swap
        [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
        onReorder(newOrder);
    };

    const renderItem = ({ item, index }: { item: ReorderableItem, index: number }) => {
        const isFirst = index === 0;
        const isLast = index === sortedItems.length - 1;

        return (
            <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Icon & Label */}
                <View style={styles.content}>
                    {item.icon && (
                        <View style={[styles.iconContainer, { backgroundColor: (item.iconColor || colors.primary) + '20' }]}>
                            <Ionicons name={item.icon as any} size={18} color={item.iconColor || colors.primary} />
                        </View>
                    )}
                    <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={() => moveItem(index, 'up')}
                        disabled={isFirst}
                        style={[styles.controlBtn, { opacity: isFirst ? 0.3 : 1 }]}
                    >
                        <Ionicons name="caret-up" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => moveItem(index, 'down')}
                        disabled={isLast}
                        style={[styles.controlBtn, { opacity: isLast ? 0.3 : 1 }]}
                    >
                        <Ionicons name="caret-down" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View>
            {sortedItems.map((item, index) => (
                <View key={item.id}>
                    {renderItem({ item, index })}
                    {index < sortedItems.length - 1 && (
                        <View style={{ height: 8 }} />
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    controlBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
    }
});
