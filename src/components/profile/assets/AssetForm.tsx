import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, TextInputProps } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';
import { Asset, AssetType } from '@types';
import { createAsset, updateAsset } from '@services/domain/assetService';

interface AssetFormProps {
    asset?: Asset;
    onSave: () => void;
    onCancel: () => void;
}

const ASSET_TYPES: AssetType[] = ['STOCKS', 'FUNDS', 'CRYPTO', 'FOREX', 'REAL_ESTATE', 'VEHICLE', 'JEWELRY', 'ART', 'CASH', 'OTHER'];

// One labelled input on a hairline row.
const FieldRow: React.FC<TextInputProps & { label: string; last?: boolean }> = ({ label, last, style, ...inputProps }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.fieldRow, { borderBottomColor: ds.hairline, borderBottomWidth: last ? 0 : 1 }]}>
            <Text style={[type.small, styles.label, { color: ds.text2 }]}>{label}</Text>
            <TextInput style={[type.body, styles.input, { color: ds.text }, style]} placeholderTextColor={ds.text3} {...inputProps} />
        </View>
    );
};

export const AssetForm: React.FC<AssetFormProps> = ({ asset, onSave, onCancel }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    const [symbol, setSymbol] = useState(asset?.symbol || '');
    const [name, setName] = useState(asset?.name || '');
    const [assetType, setAssetType] = useState<AssetType>(asset?.type || ASSET_TYPES[0]);
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
                    type: assetType,
                    exchange,
                    sector,
                    currency,
                    description,
                });
            } else {
                await createAsset({
                    symbol: symbol.toUpperCase(),
                    name,
                    type: assetType,
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
        <View style={styles.container}>
            <Text style={[type.title, styles.title, { color: ds.text }]}>
                {isEditing ? 'Edit asset' : 'New asset'}
            </Text>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <FieldRow
                    label="Symbol / ID"
                    style={isEditing ? { color: ds.text3 } : undefined}
                    value={symbol}
                    onChangeText={(text) => setSymbol(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                    placeholder="e.g. BDO, BTC"
                    autoCapitalize="characters"
                    editable={!isEditing}
                    maxLength={7}
                />
                <FieldRow
                    label="Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. BDO Unibank, Bitcoin"
                />
                <View style={[styles.fieldRow, { borderBottomColor: ds.hairline, borderBottomWidth: 1 }]}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Type</Text>
                    <View style={styles.picker}>
                        <Picker
                            selectedValue={assetType}
                            onValueChange={(itemValue) => setAssetType(itemValue as AssetType)}
                            style={{ color: ds.text }}
                            dropdownIconColor={ds.text2}
                        >
                            {ASSET_TYPES.map((t) => (
                                <Picker.Item key={t} label={t} value={t} />
                            ))}
                        </Picker>
                    </View>
                </View>
                <FieldRow
                    label="Sector (optional)"
                    value={sector}
                    onChangeText={setSector}
                    placeholder="e.g. Technology, Finance"
                />
                <FieldRow
                    label="Exchange (optional)"
                    value={exchange}
                    onChangeText={setExchange}
                    placeholder="e.g. PSE, NYSE"
                />
                <FieldRow
                    label="Currency"
                    value={currency}
                    onChangeText={setCurrency}
                    placeholder="e.g. PHP, USD"
                    autoCapitalize="characters"
                    last
                />

                <Text style={[type.small, styles.descriptionLabel, { color: ds.text2 }]}>Description</Text>
                <TextInput
                    style={[type.body, styles.description, { backgroundColor: ds.inset, color: ds.text }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Additional notes..."
                    placeholderTextColor={ds.text3}
                    multiline
                />

                <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    style={[styles.button, { backgroundColor: ds.accent }, loading && styles.disabled]}
                    accessibilityRole="button"
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{loading ? 'Saving…' : 'Save asset'}</Text>
                </Pressable>
                <Pressable onPress={onCancel} disabled={loading} style={styles.textButton} accessibilityRole="button">
                    <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexShrink: 1,
    },
    title: {
        marginBottom: space[2],
    },
    content: {
        flexShrink: 1,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
        minHeight: 56,
    },
    label: {
        width: 100,
    },
    input: {
        flex: 1,
        padding: 0,
    },
    picker: {
        flex: 1,
        marginHorizontal: -space[3],
    },
    descriptionLabel: {
        marginTop: space[4],
        marginBottom: space[2],
    },
    description: {
        height: 96,
        padding: space[3],
        borderRadius: radius.md,
        textAlignVertical: 'top',
    },
    button: {
        height: 48,
        marginTop: space[6],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});
