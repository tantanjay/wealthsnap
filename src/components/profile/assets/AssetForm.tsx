import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Asset, AssetType } from '@types';
import { createAsset, updateAsset } from '@services/domain/assetService';

interface AssetFormProps {
    asset?: Asset;
    onSave: () => void;
    onCancel: () => void;
}

const ASSET_TYPES: AssetType[] = ['STOCKS', 'FUNDS', 'CRYPTO', 'FOREX', 'REAL_ESTATE', 'VEHICLE', 'JEWELRY', 'ART', 'CASH', 'OTHER'];

export const AssetForm: React.FC<AssetFormProps> = ({ asset, onSave, onCancel }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    const [symbol, setSymbol] = useState(asset?.symbol || '');
    const [name, setName] = useState(asset?.name || '');
    const [type, setType] = useState<AssetType>(asset?.type || ASSET_TYPES[0]);
    const [exchange, setExchange] = useState(asset?.exchange || '');
    const [sector, setSector] = useState(asset?.sector || '');
    const [currency, setCurrency] = useState(asset?.currency || 'PHP');
    const [description, setDescription] = useState(asset?.description || '');
    const [loading, setLoading] = useState(false);

    const isEditing = !!asset;

    const handleSave = async () => {
        const cleanSymbol = symbol.trim().toUpperCase();

        if (!cleanSymbol) {
            showAlert('Error', 'Symbol is required');
            return;
        }

        if (cleanSymbol.length > 7) {
            showAlert('Error', 'Symbol must be 7 characters or less');
            return;
        }

        const symbolRegex = /^[A-Z0-9]+$/;
        if (!symbolRegex.test(cleanSymbol)) {
            showAlert('Error', 'Symbol must contain only letters and numbers (no spaces or special characters)');
            return;
        }

        if (!name.trim()) {
            showAlert('Error', 'Name is required');
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                await updateAsset(asset.symbol, {
                    name,
                    type,
                    exchange,
                    sector,
                    currency,
                    description,
                });
            } else {
                await createAsset({
                    symbol: symbol.toUpperCase(),
                    name,
                    type,
                    exchange,
                    sector,
                    currency,
                    description,
                });
            }
            onSave();
        } catch (error) {
            console.error('Error saving asset:', error);
            showAlert('Error', 'Failed to save asset. Symbol might already exist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onCancel} disabled={loading}>
                    <Text style={{ color: colors.error, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                    {isEditing ? 'Edit Asset' : 'New Asset'}
                </Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Text style={{ color: loading ? colors.textSecondary : colors.primary, fontSize: 16, fontWeight: 'bold' }}>
                        {loading ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.formGroup, { backgroundColor: colors.surface, borderRadius: 12 }]}>
                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Symbol / ID</Text>
                        <TextInput
                            style={[styles.input, { color: isEditing ? colors.textSecondary : colors.text }]}
                            value={symbol}
                            onChangeText={(text) => setSymbol(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                            placeholder="e.g. BDO, BTC"
                            placeholderTextColor={colors.gray300}
                            autoCapitalize="characters"
                            editable={!isEditing}
                            maxLength={7}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. BDO Unibank, Bitcoin"
                            placeholderTextColor={colors.gray300}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
                        <View style={{ flex: 1, marginHorizontal: -10 }}>
                            <Picker
                                selectedValue={type}
                                onValueChange={(itemValue) => setType(itemValue as AssetType)}
                                style={{ color: colors.text }}
                                dropdownIconColor={colors.text}
                            >
                                {ASSET_TYPES.map((t) => (
                                    <Picker.Item key={t} label={t} value={t} />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </View>

                <View style={[styles.formGroup, { backgroundColor: colors.surface, borderRadius: 12, marginTop: 20 }]}>
                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Sector (Optional)</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={sector}
                            onChangeText={setSector}
                            placeholder="e.g. Technology, Finance"
                            placeholderTextColor={colors.gray300}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Exchange (Optional)</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={exchange}
                            onChangeText={setExchange}
                            placeholder="e.g. PSE, NYSE"
                            placeholderTextColor={colors.gray300}
                        />
                    </View>

                    <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={currency}
                            onChangeText={setCurrency}
                            placeholder="e.g. PHP, USD"
                            placeholderTextColor={colors.gray300}
                            autoCapitalize="characters"
                        />
                    </View>
                </View>

                <View style={[styles.formGroup, { backgroundColor: colors.surface, borderRadius: 12, marginTop: 20 }]}>
                    <View style={[styles.inputContainer, { borderBottomColor: 'transparent', height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>Description</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, height: 80, textAlignVertical: 'top' }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Additional notes..."
                            placeholderTextColor={colors.gray300}
                            multiline
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    formGroup: {
        overflow: 'hidden',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12, // Increased padding for better touch target
        borderBottomWidth: 1,
        minHeight: 50,
    },
    label: {
        width: 100, // Fixed width for labels to align inputs
        fontSize: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 0, // Remove default padding
    },
});
