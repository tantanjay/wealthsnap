import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import BottomModal from '../common/BottomModal';

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
    const { colors } = useTheme();
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

    return (
        <BottomModal
            visible={visible}
            onClose={handleClose}
            title="Select Category"
        >
            {/* Search */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: 12,
                paddingHorizontal: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border
            }}>
                <Ionicons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                    style={{ flex: 1, padding: 12, color: colors.text }}
                    placeholder="Search categories..."
                    placeholderTextColor={colors.gray500}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                />
                {categorySearch ? (
                    <TouchableOpacity onPress={() => setCategorySearch('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {categorySearch ? (
                    // Search Results
                    <View>
                        <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Search Results</Text>
                        {filteredCategories.length === 0 ? (
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No categories found.</Text>
                        ) : (
                            filteredCategories.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleSelect(item.value)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border
                                    }}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>{item.label}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                ) : (
                    // Categories List
                    selectedGroup ? (
                        // Show items in selected group
                        <View>
                            <TouchableOpacity
                                onPress={() => setSelectedGroup(null)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                            >
                                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 8 }}>Back to Groups</Text>
                            </TouchableOpacity>

                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
                                {categoryGroups.find(g => g.group === selectedGroup)?.group}
                            </Text>

                            {categoryGroups.find(g => g.group === selectedGroup)?.items.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleSelect(item.value)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border
                                    }}
                                >
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        // Show Groups
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {categoryGroups.map(group => (
                                <TouchableOpacity
                                    key={group.group}
                                    onPress={() => setSelectedGroup(group.group)}
                                    style={{
                                        width: '48%',
                                        backgroundColor: colors.background,
                                        padding: 16,
                                        borderRadius: 16,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: colors.border
                                    }}
                                >
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 12
                                    }}>
                                        <Ionicons name={group.icon as any || 'folder-open'} size={24} color={colors.primary} />
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                                        {group.group}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                                        {group.items.length} items
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )
                )}
            </ScrollView>
        </BottomModal>
    );
};
