import React, { useCallback, useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Card, Button } from '../components';
import { processRecurrenceRules } from '../services/recurrenceService';
import { getUserProfile, getAllTransactions, getAllInvestments } from '../services/storageService';
import { UserProfile, Transaction, Investment } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { usePrivacy } from '../context/PrivacyContext';
import { TouchableOpacity } from 'react-native';
import { formatCurrencyAmount } from '../utils/currencyUtils';



const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [investmentTotal, setInvestmentTotal] = useState(0);

    const loadData = async () => {
        // Process recurring rules first to ensure we fetch the latest transactions
        await processRecurrenceRules();

        const p = await getUserProfile();
        const t = await getAllTransactions();
        const inv = await getAllInvestments();

        setProfile(p);

        // Sort for list display (newest first)
        const sortedTransactions = [...t].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedTransactions);

        let inc = 0;
        let exp = 0;
        t.forEach(tx => {
            if (tx.type === 'INCOME') inc += tx.amount;
            else exp += tx.amount;
        });
        setIncome(inc);
        setExpense(exp);

        const totalInv = inv.reduce((sum, item) => sum + (item.quantity * (item.currentPrice || item.averageBuyPrice)), 0);
        setInvestmentTotal(totalInv);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const formatCurrency = (amount: number) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, profile?.currency || 'USD');
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20, marginTop: 10 }}>
                    <Text style={{ color: colors.textSecondary }}>Welcome back,</Text>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>{profile?.name || 'User'}</Text>
                </View>

                {/* Expense/Income Section */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Expense & Income</Text>
                    </View>

                    {/* Balance Card */}
                    <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Balance</Text>
                            <TouchableOpacity onPress={togglePrivacy}>
                                <Ionicons
                                    name={isPrivacyEnabled ? 'eye-off' : 'eye'}
                                    size={22}
                                    color={colors.white}
                                />
                            </TouchableOpacity>
                        </View>
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

                        {/* Insight Button */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Insights')}
                            style={{
                                marginTop: 15,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingVertical: 10,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Ionicons name="analytics" size={20} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.white, fontWeight: '600' }}>
                                View Financial Insights
                            </Text>
                        </TouchableOpacity>
                    </Card>
                </View>

                {/* Investment Section Placeholder */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Investments</Text>
                    <Card style={{ backgroundColor: colors.secondary, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Portfolio</Text>
                            <Ionicons name="trending-up" size={24} color={colors.white} />
                        </View>
                        <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(investmentTotal, profile?.currency || 'USD')}
                        </Text>
                        <TouchableOpacity
                            style={{
                                marginTop: 15,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingVertical: 8,
                                alignItems: 'center',
                                borderRadius: 8
                            }}
                            onPress={() => navigation.navigate('Investment')}
                        >
                            <Text style={{ color: colors.white, fontWeight: '600' }}>View Portfolio</Text>
                        </TouchableOpacity>
                    </Card>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Recent Transactions</Text>
                    <Text onPress={() => navigation.navigate('History')} style={{ color: colors.primary, fontWeight: '600' }}>See All</Text>
                </View>

                {transactions.slice(0, 4).map(tx => (
                    <Card key={tx.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: tx.type === 'INCOME' ? colors.success + '20' : colors.error + '20',
                                justifyContent: 'center', alignItems: 'center', marginRight: 10
                            }}>
                                <Ionicons
                                    name={tx.type === 'INCOME' ? 'arrow-down' : 'arrow-up'}
                                    size={16}
                                    color={tx.type === 'INCOME' ? colors.success : colors.error}
                                />
                            </View>
                            <View>
                                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{tx.category}</Text>
                            </View>
                        </View>
                        <Text style={{
                            color: tx.type === 'INCOME' ? colors.success : colors.error,
                            fontWeight: 'bold',
                            fontSize: 14
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
