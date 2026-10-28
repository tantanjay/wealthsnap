import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { IconName, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface CategoryItem {
    label: string;
    value: string;
    icon: string;
}

interface CategoryGroup {
    group: string;
    icon?: string;
    items: CategoryItem[];
}

interface CategorySelectModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (category: string) => void;
    categoryGroups: CategoryGroup[];
}

export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({
    visible,
    onClose,
    onSelect,
    categoryGroups
}) => {
    const { ds } = useTheme();
    const [categorySearch, setCategorySearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    // Filter categories based on search
    const filteredCategories = categorySearch.trim()
        ? categoryGroups.flatMap(g => g.items).filter(item =>
            item.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
            item.value.toLowerCase().includes(categorySearch.toLowerCase())
        )
        : [];

    const handleSelect = (categoryValue: string) => {
        onSelect(categoryValue);
        setCategorySearch('');
        setSelectedGroup(null);
        onClose();
    };

    const handleClose = () => {
        setCategorySearch('');
        setSelectedGroup(null);
        onClose();
    };

    const renderItems = (items: CategoryItem[]) => items.map((item, index) => (
        <Row
            key={index}
            icon={item.icon as IconName}
            title={item.label}
            onPress={() => handleSelect(item.value)}
            last={index === items.length - 1}
        />
    ));

    const group = selectedGroup ? categoryGroups.find(g => g.group === selectedGroup) : undefined;

    return (
        <BottomModal
            visible={visible}
            onClose={handleClose}
            title="Select category"
        >
            {/* Search field */}
            <View style={[styles.field, { backgroundColor: ds.inset }]}>
                <Ionicons name="search-outline" size={18} color={ds.text2} />
                <TextInput
                    style={[type.body, styles.input, { color: ds.text }]}
                    placeholder="Search categories..."
                    placeholderTextColor={ds.text3}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                />
                {categorySearch ? (
                    <Pressable onPress={() => setCategorySearch('')} hitSlop={space[2]} accessibilityLabel="Clear search">
                        <Ionicons name="close-circle" size={18} color={ds.text3} />
                    </Pressable>
                ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {categorySearch ? (
                    <View>
                        <SectionHeader title="Search results" style={styles.header} />
                        {filteredCategories.length === 0 ? (
                            <Text style={[type.small, styles.empty, { color: ds.text2 }]}>No categories found.</Text>
                        ) : (
                            renderItems(filteredCategories)
                        )}
                    </View>
                ) : group ? (
                    <View>
                        <Pressable onPress={() => setSelectedGroup(null)} style={styles.back} hitSlop={space[2]}>
                            <Ionicons name="chevron-back" size={16} color={ds.accent} />
                            <Text style={[type.smallMedium, { color: ds.accent }]}>Back to groups</Text>
                        </Pressable>
                        <SectionHeader title={group.group} style={styles.header} />
                        {renderItems(group.items)}
                    </View>
                ) : (
                    categoryGroups.map((g, i) => (
                        <Row
                            key={g.group}
                            icon={(g.icon || 'folder-open-outline') as IconName}
                            title={g.group}
                            subtitle={`${g.items.length} items`}
                            chevron
                            onPress={() => setSelectedGroup(g.group)}
                            last={i === categoryGroups.length - 1}
                        />
                    ))
                )}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        borderRadius: radius.md,
        paddingHorizontal: space[3],
        marginBottom: space[2],
    },
    input: {
        flex: 1,
        paddingVertical: space[3],
    },
    header: {
        marginTop: space[4],
    },
    empty: {
        textAlign: 'center',
        marginTop: space[5],
    },
    back: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        alignSelf: 'flex-start',
        marginTop: space[4],
    },
});
