import React, { useState, useCallback } from 'react';
import { Text, View, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTransactions, deleteTransaction } from '../services/storageService';
import { Transaction } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components';

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    const loadTransactions = async () => {
        const data = await getAllTransactions();
        // Sort by date desc
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(data);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteTransaction(id);
                        loadTransactions();
                    }
                }
            ]
        );
    };

    const handleEdit = (transaction: Transaction) => {
        navigation.navigate('Record', { transaction });
    };

    const renderItem = ({ item }: { item: Transaction }) => {
        const isExpense = item.type === 'EXPENSE';
        const isRecurring = item.creationMethod === 'RECURRENCE' || item.isRecurring;

        return (
            <TouchableOpacity
                onPress={() => {
                    Alert.alert(
                        "Transaction Options",
                        "Choose an action",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Edit", onPress: () => handleEdit(item) },
                            { text: "Delete", style: "destructive", onPress: () => handleDelete(item.id) }
                        ]
                    );
                }}
            >
                <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: isExpense ? colors.error + '20' : colors.success + '20',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <Ionicons
                                    name={isRecurring ? "repeat" : "wallet"}
                                    size={20}
                                    color={isExpense ? colors.error : colors.success}
                                />
                            </View>
                            <View>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    {item.category}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    {new Date(item.date).toLocaleDateString()}
                                    {isRecurring && ' • Recurring'}
                                </Text>
                            </View>
                        </View>
                        <Text style={{
                            color: isExpense ? colors.error : colors.success,
                            fontSize: 16,
                            fontWeight: 'bold'
                        }}>
                            {isExpense ? '-' : '+'}${item.amount.toFixed(2)}
                        </Text>
                    </View>
                    {item.note ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, marginLeft: 52 }}>
                            {item.note}
                        </Text>
                    ) : null}
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>History</Text>

            {transactions.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                    <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No transactions found.</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    scrollEnabled={false} // ScreenWrapper handles scrolling
                />
            )}
        </ScreenWrapper>
    );
};

export default HistoryScreen;
