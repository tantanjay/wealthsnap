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
import { usePrivacy } from '../context/PrivacyContext';
import { TouchableOpacity } from 'react-native';
import { formatCurrencyAmount } from '../utils/currencyUtils';

import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [chartData, setChartData] = useState<{ labels: string[], datasets: { data: number[] }[] }>({
        labels: [],
        datasets: [{ data: [0] }]
    });

    const loadData = async () => {
        // Process recurring rules first to ensure we fetch the latest transactions
        await processRecurrenceRules();

        const p = await getUserProfile();
        const t = await getAllTransactions();
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

        prepareChartData(t);
    };

    const prepareChartData = (allTransactions: Transaction[]) => {
        // 1. Get last 6 months
        const months: string[] = [];
        const monthEndDates: Date[] = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('default', { month: 'short' }));

            // End of this month
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            monthEndDates.push(endOfMonth);
        }

        // 2. Calculate Cumulative Balance for each month end
        const dataPoints = monthEndDates.map(endDate => {
            // Sum all transactions strictly before or on endDate
            return allTransactions.reduce((acc, tx) => {
                const txDate = new Date(tx.date);
                if (txDate <= endDate) {
                    return acc + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
                }
                return acc;
            }, 0);
        });

        setChartData({
            labels: months,
            datasets: [{ data: dataPoints }]
        });
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

                {/* Balance Card */}
                <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 20 }}>
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
                </Card>

                {/* Chart Section */}
                {/* Only show chart if we have some data points that are not all zero, or just show it anyway so it looks nice */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Balance Trend</Text>
                    <LineChart
                        data={chartData}
                        width={Dimensions.get('window').width - 32} // Screen width - padding
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        yAxisInterval={1}
                        chartConfig={{
                            backgroundColor: colors.surface,
                            backgroundGradientFrom: colors.surface,
                            backgroundGradientTo: colors.surface,
                            decimalPlaces: 0,
                            color: (opacity = 1) => colors.primary,
                            labelColor: (opacity = 1) => colors.textSecondary,
                            style: {
                                borderRadius: 16
                            },
                            propsForDots: {
                                r: "4",
                                strokeWidth: "2",
                                stroke: colors.primary
                            }
                        }}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 16
                        }}
                        withVerticalLines={false}
                        withHorizontalLines={true}
                    />
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
