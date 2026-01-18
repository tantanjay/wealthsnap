import React, { useCallback, useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Card, Button } from '../components';
import { processRecurrenceRules } from '../services/recurrenceService';
import { getUserProfile, getAllTransactions } from '../services/storageService';
import { UserProfile, Transaction } from '../types';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);

    const loadData = async () => {
        // Process recurring rules first to ensure we fetch the latest transactions
        await processRecurrenceRules();

        const p = await getUserProfile();
        const t = await getAllTransactions();
        setProfile(p);
        setTransactions(t.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        let inc = 0;
        let exp = 0;
        t.forEach(tx => {
            if (tx.type === 'INCOME') inc += tx.amount;
            else exp += tx.amount;
        });
        setIncome(inc);
        setExpense(exp);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const formatCurrency = (amount: number) => {
        return (profile?.currency || '$') + amount.toFixed(2);
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20, marginTop: 10 }}>
                    <Text style={{ color: colors.textSecondary }}>Welcome back,</Text>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>{profile?.name || 'User'}</Text>
                </View>

                {/* Balance Card */}
                <Card style={{ backgroundColor: colors.primary, padding: 20 }}>
                    <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Balance</Text>
                    <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                        {formatCurrency(income - expense)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <View>
                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Income</Text>
                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>+{formatCurrency(income)}</Text>
                        </View>
                        <View>
                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Expense</Text>
                            <Text style={{ color: colors.white, fontWeight: 'bold' }}>-{formatCurrency(expense)}</Text>
                        </View>
                    </View>
                </Card>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Recent Transactions</Text>
                    <Text onPress={() => navigation.navigate('History')} style={{ color: colors.primary, fontWeight: '600' }}>See All</Text>
                </View>

                {transactions.slice(0, 5).map(tx => (
                    <Card key={tx.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: tx.type === 'INCOME' ? colors.success + '20' : colors.error + '20',
                                justifyContent: 'center', alignItems: 'center', marginRight: 12
                            }}>
                                <Ionicons
                                    name={tx.type === 'INCOME' ? 'arrow-down' : 'arrow-up'}
                                    size={20}
                                    color={tx.type === 'INCOME' ? colors.success : colors.error}
                                />
                            </View>
                            <View>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{tx.category}</Text>
                                {tx.note ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{tx.note}</Text> : null}
                            </View>
                        </View>
                        <Text style={{
                            color: tx.type === 'INCOME' ? colors.success : colors.error,
                            fontWeight: 'bold'
                        }}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </Text>
                    </Card>
                ))}

                {transactions.length === 0 && (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No transactions yet.</Text>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};
export default HomeScreen;
