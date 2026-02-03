import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

export interface ReorderItem {
    id: string;
    label: string;
}

interface ReorderListProps {
    items: ReorderItem[];
    onReorder: (newOrder: ReorderItem[]) => void;
    // Optional props for styling/customization
    containerStyle?: any;
    showIcons?: boolean;
}

export const ReorderList: React.FC<ReorderListProps> = ({
    items,
    onReorder,
    containerStyle,
}) => {
    const { colors } = useTheme();

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newItems.length) {
            const temp = newItems[index];
            newItems[index] = newItems[targetIndex];
            newItems[targetIndex] = temp;
            onReorder(newItems);
        }
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={containerStyle}>
            <View style={styles.listContainer}>
                {items.map((item, index) => (
                    <View
                        key={item.id}
                        style={[
                            styles.itemRow,
                            { borderBottomColor: colors.border }
                        ]}
                    >
                        <Text style={[styles.itemLabel, { color: colors.text }]}>
                            {item.label}
                        </Text>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                onPress={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                style={[
                                    styles.iconButton,
                                    index === 0 && { opacity: 0.3 }
                                ]}
                            >
                                <Ionicons name="chevron-up" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => moveItem(index, 'down')}
                                disabled={index === items.length - 1}
                                style={[
                                    styles.iconButton,
                                    index === items.length - 1 && { opacity: 0.3 }
                                ]}
                            >
                                <Ionicons name="chevron-down" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
            <View style={{ height: 20 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        paddingHorizontal: 0,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 4,
    },
});
