import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';
import { Asset } from '@types';
import { getAllAssets, deleteAsset } from '@services/domain/assetService';
import { AssetForm } from '@components/profile/assets/AssetForm';
import { EmptyState } from '@components/common/EmptyState';

interface AssetsListModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AssetsListModal: React.FC<AssetsListModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);

    const loadAssets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllAssets();
            setAssets(data);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load + view reset on open; see FIXES.md
            loadAssets();
            setView('LIST');
            setSearchQuery('');
        }
    }, [visible, loadAssets]);

    const handleAdd = () => {
        setEditingAsset(undefined);
        setView('FORM');
    };

    const handleEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setView('FORM');
    };

    const handleDelete = (symbol: string) => {
        showAlert(
            'Delete Asset',
            `Are you sure you want to delete ${symbol}? This will NOT delete transactions, but might affect display information.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAsset(symbol);
                            setAssets(prev => prev.filter(a => a.symbol !== symbol));
                        } catch {
                            showAlert('Error', 'Failed to delete asset');
                        }
                    }
                }
            ]
        );
    };

    const handleSaveForm = () => {
        loadAssets();
        setView('LIST');
    };

    const filteredAssets = assets.filter(a =>
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.name && a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderItem = ({ item, index }: { item: Asset; index: number }) => (
        <Row
            icon="pricetag-outline"
            title={item.symbol}
            subtitle={[item.name, item.type].filter(Boolean).join(' · ')}
            onPress={() => handleEdit(item)}
            last={index === filteredAssets.length - 1}
            trailing={
                <Pressable onPress={() => handleDelete(item.symbol)} hitSlop={space[2]} accessibilityLabel={`Delete ${item.symbol}`}>
                    <Ionicons name="trash-outline" size={20} color={ds.danger} />
                </Pressable>
            }
        />
    );

    const isList = view === 'LIST';

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={isList ? 'Manage assets' : undefined}
            maxHeight="85%"
            footer={isList ? (
                <Pressable onPress={handleAdd} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Add asset</Text>
                </Pressable>
            ) : undefined}
        >
            <View style={styles.body}>
                {isList ? (
                    <>
                        <View style={[styles.search, { backgroundColor: ds.group }]}>
                            <Ionicons name="search-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={[type.body, styles.searchInput, { color: ds.text }]}
                                placeholder="Search by symbol or name"
                                placeholderTextColor={ds.text3}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator color={ds.accent} style={styles.loading} />
                        ) : filteredAssets.length === 0 ? (
                            <EmptyState size="compact" icon="list-outline" title="No assets found." />
                        ) : (
                            // `padded` puts the list straight in the Group (no clip wrapper), so it can still shrink and scroll.
                            <Group padded style={styles.list}>
                                <FlatList
                                    data={filteredAssets}
                                    keyExtractor={item => item.symbol}
                                    renderItem={renderItem}
                                    keyboardShouldPersistTaps="handled"
                                />
                            </Group>
                        )}
                    </>
                ) : (
                    <AssetForm
                        asset={editingAsset}
                        onSave={handleSaveForm}
                        onCancel={() => setView('LIST')}
                    />
                )}
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    body: {
        flexShrink: 1,
    },
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
        marginBottom: space[3],
    },
    list: {
        flexShrink: 1,
        paddingVertical: 0,
    },
    searchInput: {
        flex: 1,
        padding: 0,
    },
    loading: {
        marginTop: space[5],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
