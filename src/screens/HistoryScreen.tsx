import React, { useState, useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, SectionList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import TransactionOptionsModal from '@components/transaction/modals/TransactionOptionsModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { Transaction, UserProfile } from '@types';
import { deleteTransaction } from '@services/domain';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { saveHistoryTimeFrame, getHistoryTimeFrame, getUserProfile, getCachedTransactions } from '@services/core/storageService';

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface TransactionSection {
    title: string;
    data: Transaction[];
    totalAmount: BigNumber;
    count: number;
    originalDate: Date;
}

interface FinancialSummary {
    totalIncome: BigNumber;
    totalExpense: BigNumber;
    balance: BigNumber;
}

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAILY');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        if (saved && ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(saved)) {
            setTimeFrame(saved as TimeFrame);
        }
    };

    const handleSetTimeFrame = (tf: TimeFrame) => {
        setTimeFrame(tf);
        saveHistoryTimeFrame(tf);
    };

    const loadTransactions = async () => {
        setIsLoading(true);
        const data = await getCachedTransactions();
        setAllTransactions(data);
        setIsLoading(false);
    };

    const formatCurrency = (amount: BigNumber) => {
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
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (mode === 'MONTHLY') {
            start.setDate(1); start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);
        } else if (mode === 'YEARLY') {
            start.setMonth(0, 1); start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31); end.setHours(23, 59, 59, 999);
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
        }
        if (mode === 'MONTHLY') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (mode === 'YEARLY') return date.getFullYear().toString();
        const { start, end } = getStartEndOfPeriod(date, mode);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const adder = direction === 'next' ? 1 : -1;
        if (timeFrame === 'DAILY') newDate.setDate(newDate.getDate() + adder);
        else if (timeFrame === 'WEEKLY') newDate.setDate(newDate.getDate() + (adder * 7));
        else if (timeFrame === 'MONTHLY') newDate.setMonth(newDate.getMonth() + adder);
        else if (timeFrame === 'YEARLY') newDate.setFullYear(newDate.getFullYear() + adder);
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
        let totalIncome = new BigNumber(0);
        let totalExpense = new BigNumber(0);
        let netTransfer = new BigNumber(0);

        filteredData.forEach(t => {
            if (t.type === 'INCOME') {
                totalIncome = totalIncome.plus(t.amount.abs());
            } else if (t.type === 'EXPENSE') {
                totalExpense = totalExpense.plus(t.amount.abs());
            } else if (t.type === 'TRANSFER_IN') {
                netTransfer = netTransfer.plus(t.amount.abs());
            } else if (t.type === 'TRANSFER_OUT') {
                netTransfer = netTransfer.minus(t.amount.abs());
            }
        });

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome.minus(totalExpense).plus(netTransfer)
        };
    }, [filteredData]);

    const sections = useMemo((): TransactionSection[] => {
        const grouped: { [key: string]: Transaction[] } = {};

        filteredData.forEach(transaction => {
            const dateKey = new Date(transaction.date).toDateString();
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(transaction);
        });

        const newSections: TransactionSection[] = Object.keys(grouped).map(dateKey => {
            const transactions = grouped[dateKey];
            const totalAmount = transactions.reduce((sum, t) => {
                if (t.type === 'INCOME') return sum.plus(t.amount.abs());
                if (t.type === 'EXPENSE') return sum.minus(t.amount.abs());
                if (t.type === 'TRANSFER_IN') return sum.plus(t.amount.abs());
                if (t.type === 'TRANSFER_OUT') return sum.minus(t.amount.abs());
                return sum;
            }, new BigNumber(0));

            const d = new Date(dateKey);
            const title = d.toDateString() === new Date().toDateString() ? 'Today' :
                d.toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
                title,
                data: transactions,
                totalAmount,
                count: transactions.length,
                originalDate: new Date(transactions[0].date)
            };
        });

        return newSections.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
    }, [filteredData]);

    // --- Renderers ---

    const renderItem = ({ item }: { item: Transaction }) => {
        const isExpense = item.type === 'EXPENSE';
        const isTransferIn = item.type === 'TRANSFER_IN';
        const isTransferOut = item.type === 'TRANSFER_OUT';
        const isTransfer = isTransferIn || isTransferOut;
        const isNegativeFlow = isExpense || isTransferOut;

        // Determine Icon and Color based on logic
        let iconName: any = "wallet";
        let statusColor = isExpense ? colors.error : colors.success;

        if (isTransfer) {
            statusColor = isTransferIn ? colors.error : colors.success;
            iconName = isTransferIn ? "arrow-down-circle-outline" : "arrow-up-circle-outline";
        } else if (item.creationMethod === 'AI') {
            iconName = "sparkles";
        } else if (item.isRecurring) {
            iconName = "repeat";
        }

        const getDisplayName = () => {
            if (isTransfer) {
                const toTitleCase = (value?: string) =>
                    value
                        ?.toLowerCase()
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());

                return isTransferIn ? `From ${toTitleCase(item.transferAccount)}` : `To ${toTitleCase(item.transferAccount)}`;
            }
            return item.category;
        };

        return (
            <TouchableOpacity onPress={() => setSelectedTransaction(item)} style={{ marginBottom: 8 }} activeOpacity={0.7}>
                <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: statusColor + '15',
                                justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Ionicons name={iconName} size={18} color={statusColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                    {getDisplayName()}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                    {item.note || item.subCategory || item.type}
                                </Text>
                            </View>
                        </View>
                        <Text style={{
                            color: isNegativeFlow ? colors.error : colors.success,
                            fontSize: 16, fontWeight: 'bold'
                        }}>
                            {isNegativeFlow ? '-' : '+'}{formatCurrency(item.amount)}
                        </Text>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title, count, totalAmount } }: { section: TransactionSection }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {title} <Text style={{ color: colors.textSecondary, fontWeight: 'normal' }}>({count})</Text>
            </Text>
            <Text style={{ color: totalAmount.isGreaterThanOrEqualTo(0) ? colors.success : colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {totalAmount.isGreaterThanOrEqualTo(0) ? '+' : ''}{formatCurrency(totalAmount)}
            </Text>
        </View>
    );

    return (
        <ScreenWrapper scrollable={false}>
            <SectionList
                sections={isLoading ? [] : sections}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>History</Text>

                        {/* TimeFrame Tabs */}
                        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16 }}>
                            {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimeFrame[]).map((tf) => (
                                <TouchableOpacity key={tf} onPress={() => handleSetTimeFrame(tf)} style={{
                                    flex: 1, paddingVertical: 8, alignItems: 'center',
                                    backgroundColor: timeFrame === tf ? colors.primary : 'transparent', borderRadius: 8
                                }}>
                                    <Text style={{ color: timeFrame === tf ? '#FFF' : colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>
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
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Period Balance</Text>
                                {isLoading ? <Skeleton width={120} height={32} /> : (
                                    <Text style={{ color: summary.balance.isGreaterThanOrEqualTo(0) ? colors.success : colors.error, fontSize: 24, fontWeight: 'bold' }}>
                                        {formatCurrency(summary.balance)}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Income</Text>
                                    <Text style={{ color: colors.success, fontSize: 16, fontWeight: '600' }}>
                                        +{formatCurrency(summary.totalIncome)}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Expenses</Text>
                                    <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>
                                        -{formatCurrency(summary.totalExpense)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    isLoading ? (
                        <View style={{ marginTop: 10 }}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                                    <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 12 }} />
                                    <View style={{ flex: 1 }}>
                                        <Skeleton width={120} height={16} style={{ marginBottom: 6 }} /><Skeleton width={80} height={12} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 30 }}>
                            <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No transactions for this period.</Text>
                        </View>
                    )
                }
            />

            <TransactionOptionsModal
                visible={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onEdit={(t) => { setSelectedTransaction(null); navigation.navigate('Record', { transaction: { ...t, amount: t.amount.toString() } }); }}
                onDelete={async (id) => { await deleteTransaction(id); loadTransactions(); setSelectedTransaction(null); }}
                currency={profile?.currency}
            />
        </ScreenWrapper>
    );
};

export default HistoryScreen;