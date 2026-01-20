import React, { useState, useCallback, useMemo } from 'react';
import { Text, View, Alert, SectionList, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { deleteTransaction, saveHistoryTimeFrame, getHistoryTimeFrame, getUserProfile, getCachedTransactions } from '../services/storageService';
import { Transaction, UserProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyAmount } from '../utils/currencyUtils';

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface TransactionSection {
    title: string;
    data: Transaction[];
    totalAmount: number;
    count: number;
    originalDate: Date;
}

interface FinancialSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAILY');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
            loadTimeFramePref();
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        const p = await getUserProfile();
        setProfile(p);
    };

    const loadTimeFramePref = async () => {
        const saved = await getHistoryTimeFrame();
        if (saved) {
            // Validate it is a valid TimeFrame
            if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(saved)) {
                setTimeFrame(saved as TimeFrame);
            }
        }
    };

    const handleSetTimeFrame = (tf: TimeFrame) => {
        setTimeFrame(tf);
        saveHistoryTimeFrame(tf);
    };

    const loadTransactions = async () => {
        const data = await getCachedTransactions();
        // Data is already sorted by storageService
        setAllTransactions(data);
    };

    const formatCurrency = (amount: number) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, profile?.currency || 'USD');
    };

    // --- Date Logic Helpers ---

    const getStartEndOfPeriod = (date: Date, mode: TimeFrame): { start: Date; end: Date } => {
        const start = new Date(date);
        const end = new Date(date);

        if (mode === 'DAILY') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (mode === 'WEEKLY') {
            const day = start.getDay(); // 0 is Sunday
            // Start of Week = Sunday
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);

            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (mode === 'MONTHLY') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);

            end.setMonth(end.getMonth() + 1);
            end.setDate(0); // Last day of previous month (which is current month since we added 1)
            end.setHours(23, 59, 59, 999);
        } else if (mode === 'YEARLY') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);

            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        }

        return { start, end };
    };

    const getDateRangeLabel = (date: Date, mode: TimeFrame): string => {
        if (mode === 'DAILY') {
            const now = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (date.toDateString() === now.toDateString()) return 'Today';
            if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (mode === 'WEEKLY') {
            const { start, end } = getStartEndOfPeriod(date, mode);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else if (mode === 'MONTHLY') {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (mode === 'YEARLY') {
            return date.getFullYear().toString();
        }
        return '';
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const adder = direction === 'next' ? 1 : -1;

        if (timeFrame === 'DAILY') {
            newDate.setDate(newDate.getDate() + adder);
        } else if (timeFrame === 'WEEKLY') {
            newDate.setDate(newDate.getDate() + (adder * 7));
        } else if (timeFrame === 'MONTHLY') {
            newDate.setMonth(newDate.getMonth() + adder);
        } else if (timeFrame === 'YEARLY') {
            newDate.setFullYear(newDate.getFullYear() + adder);
        }
        setCurrentDate(newDate);
    };

    // --- Computed Data ---

    const filteredData = useMemo(() => {
        const { start, end } = getStartEndOfPeriod(currentDate, timeFrame);
        return allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [allTransactions, currentDate, timeFrame]);

    const summary = useMemo((): FinancialSummary => {
        let totalIncome = 0;
        let totalExpense = 0;

        filteredData.forEach(t => {
            if (t.type === 'INCOME') {
                totalIncome += t.amount;
            } else {
                totalExpense += t.amount;
            }
        });

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
        };
    }, [filteredData]);

    const sections = useMemo((): TransactionSection[] => {
        const grouped: { [key: string]: Transaction[] } = {};

        filteredData.forEach(transaction => {
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

            // Helper to get nice label for the section header
            const getSectionLabel = (dKey: string) => {
                const d = new Date(dKey);
                const now = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (d.toDateString() === now.toDateString()) return 'Today';
                if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            };

            return {
                title: getSectionLabel(dateKey),
                data: transactions,
                totalAmount,
                count: transactions.length,
                originalDate: new Date(transactions[0].date)
            };
        });

        // Ensure sections are sorted by date desc
        newSections.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
        return newSections;
    }, [filteredData]);

    // --- Actions ---

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

    // --- Renderers ---

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
                            {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
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
            paddingHorizontal: 4
        }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {title} <Text style={{ color: colors.textSecondary, fontWeight: 'normal' }}>({count})</Text>
            </Text>
            <Text style={{ color: totalAmount >= 0 ? colors.success : colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount)}
            </Text>
        </View>
    );

    return (
        <ScreenWrapper>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>History</Text>

                {/* TimeFrame Tabs */}
                <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16 }}>
                    {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeFrame[]).map((tf) => (
                        <TouchableOpacity
                            key={tf}
                            onPress={() => handleSetTimeFrame(tf)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                alignItems: 'center',
                                backgroundColor: timeFrame === tf ? colors.primary : 'transparent',
                                borderRadius: 8
                            }}
                        >
                            <Text style={{
                                color: timeFrame === tf ? '#FFF' : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: 'bold'
                            }}>
                                {tf.charAt(0) + tf.slice(1).toLowerCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Date Navigator */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity onPress={() => navigateDate('prev')} style={{ padding: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                        {getDateRangeLabel(currentDate, timeFrame)}
                    </Text>
                    <TouchableOpacity onPress={() => navigateDate('next')} style={{ padding: 8 }}>
                        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Summary Dashboard */}
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Balance</Text>
                        <Text style={{ color: summary.balance >= 0 ? colors.success : colors.error, fontSize: 24, fontWeight: 'bold' }}>
                            {formatCurrency(summary.balance)}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Total Income</Text>
                            <Text style={{ color: colors.success, fontSize: 16, fontWeight: '600' }}>
                                +{formatCurrency(summary.totalIncome)}
                            </Text>
                        </View>
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Total Expense</Text>
                            <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>
                                -{formatCurrency(summary.totalExpense)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Transactions List */}
            {sections.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 30 }}>
                    <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No transactions in this period.</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ScreenWrapper>
    );
};

export default HistoryScreen;
