import React, { useState, useCallback } from 'react';
import { Text, View, Alert, SectionList, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTransactions, deleteTransaction } from '../services/storageService';
import { Transaction } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components';

interface TransactionSection {
    title: string;
    data: Transaction[];
    totalAmount: number;
    count: number;
    originalDate: Date;
}

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [sections, setSections] = useState<TransactionSection[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [])
    );

    const getDayLabel = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const loadTransactions = async () => {
        const data = await getAllTransactions();
        // Sort by date desc
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const grouped: { [key: string]: Transaction[] } = {};

        data.forEach(transaction => {
            const dateKey = new Date(transaction.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(transaction);
        });

        const newSections: TransactionSection[] = Object.keys(grouped).map(dateKey => {
            const transactions = grouped[dateKey];
            const totalAmount = transactions.reduce((sum, t) => {
                return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
            }, 0);

            // We use the first transaction's date to generate the label (all share the same dateKey)
            return {
                title: getDayLabel(dateKey),
                data: transactions,
                totalAmount,
                count: transactions.length,
                originalDate: new Date(transactions[0].date)
            };
        });

        // Ensure sections are sorted by date desc
        newSections.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());

        setSections(newSections);
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
                <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: isExpense ? colors.error + '20' : colors.success + '20',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <Ionicons
                                    name={isRecurring ? "repeat" : "wallet"}
                                    size={18}
                                    color={isExpense ? colors.error : colors.success}
                                />
                            </View>
                            <View>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    {item.category}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    {item.note || (item.subCategory ? item.subCategory : item.type)}
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
                </Card>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title, count, totalAmount } }: { section: TransactionSection }) => (
        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            marginTop: 10,
            paddingHorizontal: 4 // Add some padding so it aligns nicely
        }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {title} <Text style={{ color: colors.textSecondary, fontWeight: 'normal' }}>({count})</Text>
            </Text>
            <Text style={{ color: totalAmount >= 0 ? colors.success : colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {totalAmount >= 0 ? '+' : ''}PHP{totalAmount.toFixed(2)}
            </Text>
        </View>
    );

    return (
        <ScreenWrapper>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>History</Text>

            {sections.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                    <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No transactions found.</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    scrollEnabled={false} // ScreenWrapper handles scrolling
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showVerticalScrollIndicator={false}
                />
            )}
        </ScreenWrapper>
    );
};

export default HistoryScreen;
