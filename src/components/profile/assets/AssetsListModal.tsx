import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Asset } from '@types';
import { getAllAssets, deleteAsset } from '@services/domain/assetService';
import { AssetForm } from '@components/profile/assets/AssetForm';

interface AssetsListModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AssetsListModal: React.FC<AssetsListModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
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

    const renderItem = ({ item }: { item: Asset }) => (
        <TouchableOpacity
            style={[styles.itemContainer, { borderBottomColor: colors.border }]}
            onPress={() => handleEdit(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.itemContent}>
                <Text style={[styles.inputSymbol, { color: colors.text }]}>{item.symbol}</Text>
                <Text style={[styles.itemName, { color: colors.textSecondary }]}>{item.name}</Text>
                {item.type && <Text style={[styles.itemType, { color: colors.textSecondary }]}>{item.type}</Text>}
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.symbol)}
            >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={view === 'LIST' ? "Manage Assets" : undefined}
            maxHeight="85%"
        >
            <View style={{ height: '100%', backgroundColor: colors.background }}>
                {view === 'LIST' ? (
                    <>
                        <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                            <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search by Symbol or Name"
                                placeholderTextColor={colors.gray300}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                        ) : (
                            <FlatList
                                data={filteredAssets}
                                keyExtractor={item => item.symbol}
                                renderItem={renderItem}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ color: colors.textSecondary }}>No assets found.</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 80 }}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.fab, { backgroundColor: colors.primary }]}
                            onPress={handleAdd}
                        >
                            <Ionicons name="add" size={30} color="#fff" />
                        </TouchableOpacity>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    inputSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemName: {
        fontSize: 14,
    },
    itemType: {
        fontSize: 12,
        opacity: 0.8,
    },
    deleteButton: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
});
