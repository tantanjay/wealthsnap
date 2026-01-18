import React, { useState, useCallback } from 'react';
import { Text, View, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Card, Button } from '../components';
import { saveInvestment, getAllInvestments, deleteInvestment } from '../services/storageService';
import { Investment } from '../types';

const InvestmentScreen = () => {
    const { colors } = useTheme();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [showAdd, setShowAdd] = useState(false);

    // Form Stats
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');

    const loadData = async () => {
        const data = await getAllInvestments();
        setInvestments(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleSave = async () => {
        if (!symbol || !quantity || !buyPrice) {
            Alert.alert('Required', 'Please enter Symbol, Quantity, and Buy Price');
            return;
        }

        const inv: Investment = {
            id: Date.now().toString(),
            symbol: symbol.toUpperCase(),
            name: symbol.toUpperCase(), // Determine name via API later
            type: 'STOCK',
            quantity: parseFloat(quantity),
            averageBuyPrice: parseFloat(buyPrice),
            currentPrice: currentPrice ? parseFloat(currentPrice) : parseFloat(buyPrice),
            lastUpdated: new Date().toISOString()
        };

        await saveInvestment(inv);
        setShowAdd(false);
        setSymbol('');
        setQuantity('');
        setBuyPrice('');
        setCurrentPrice('');
        loadData();
    };

    const handleDelete = async (id: string) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteInvestment(id);
                    loadData();
                }
            }
        ]);
    };

    const totalValue = investments.reduce((sum, inv) => sum + (inv.quantity * (inv.currentPrice || inv.averageBuyPrice)), 0);

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>Portfolio</Text>

                <Card style={{ backgroundColor: colors.secondary }}>
                    <Text style={{ color: colors.white, fontSize: 16 }}>Total Portfolio Value</Text>
                    <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>${totalValue.toFixed(2)}</Text>
                </Card>

                {showAdd ? (
                    <Card>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 10 }}>Add Investment</Text>
                        <TextInput style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: 10, color: colors.text, padding: 8 }} placeholder="Symbol (e.g. BTC)" placeholderTextColor={colors.gray500} value={symbol} onChangeText={setSymbol} />
                        <TextInput style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: 10, color: colors.text, padding: 8 }} placeholder="Quantity" placeholderTextColor={colors.gray500} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
                        <TextInput style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: 10, color: colors.text, padding: 8 }} placeholder="Avg Buy Price" placeholderTextColor={colors.gray500} keyboardType="numeric" value={buyPrice} onChangeText={setBuyPrice} />
                        <TextInput style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: 10, color: colors.text, padding: 8 }} placeholder="Current Price (Optional)" placeholderTextColor={colors.gray500} keyboardType="numeric" value={currentPrice} onChangeText={setCurrentPrice} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Button title="Cancel" variant="ghost" onPress={() => setShowAdd(false)} />
                            <Button title="Save" onPress={handleSave} />
                        </View>
                    </Card>
                ) : (
                    <Button title="Add Investment" onPress={() => setShowAdd(true)} style={{ marginBottom: 20 }} />
                )}

                {investments.map(inv => (
                    <Card key={inv.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity onLongPress={() => handleDelete(inv.id)}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{inv.symbol}</Text>
                            <Text style={{ color: colors.textSecondary }}>{inv.quantity} shares @ ${inv.averageBuyPrice}</Text>
                        </TouchableOpacity>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>${(inv.quantity * (inv.currentPrice || 0)).toFixed(2)}</Text>
                            <Text style={{ color: (inv.currentPrice || 0) >= inv.averageBuyPrice ? colors.success : colors.error, fontSize: 12 }}>
                                {inv.currentPrice}
                            </Text>
                        </View>
                    </Card>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
};
export default InvestmentScreen;
