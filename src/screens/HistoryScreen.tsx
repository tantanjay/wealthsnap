import React, { useState, useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, SectionList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import TransactionOptionsModal from '@components/transaction/modals/TransactionOptionsModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { Transaction, UserProfile } from '@types';
import { deleteTransaction } from '@services/domain';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { saveHistoryTimeFrame, getHistoryTimeFrame, getUserProfile, getCachedTransactions } from '@services/core/storageService';
import { HistoryCalendar } from '../components/history/HistoryCalendar';


import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { RecurrenceRule } from '@types';
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
    safeToSpend?: BigNumber;
}

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();


    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAILY');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
    const [showInfoModal, setShowInfoModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
            loadTimeFramePref();
            loadProfile();
            loadRecurrenceRules();
        }, [])
    );

    const loadRecurrenceRules = async () => {
        const rules = await getAllRecurrenceRules();
        setRecurrenceRules(rules);
    };

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
        if (viewMode === 'LIST') saveHistoryTimeFrame(tf);
    };

    const loadTransactions = async () => {
        setIsLoading(true);
        const data = await getCachedTransactions();
        setAllTransactions(data);
        setIsLoading(false);
    };

    const formatCurrency = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, profile?.currency || 'PHP');
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

        if (viewMode === 'CALENDAR') {
            newDate.setMonth(newDate.getMonth() + adder);
        } else {
            if (timeFrame === 'DAILY') newDate.setDate(newDate.getDate() + adder);
            else if (timeFrame === 'WEEKLY') newDate.setDate(newDate.getDate() + (adder * 7));
            else if (timeFrame === 'MONTHLY') newDate.setMonth(newDate.getMonth() + adder);
            else if (timeFrame === 'YEARLY') newDate.setFullYear(newDate.getFullYear() + adder);
        }
        setCurrentDate(newDate);
    };

    // --- Computed Data ---

    const filteredData = useMemo(() => {
        if (viewMode === 'CALENDAR') {
            // In calendar mode, list shows selected date's transactions
            const start = new Date(selectedCalendarDate); start.setHours(0, 0, 0, 0);
            const end = new Date(selectedCalendarDate); end.setHours(23, 59, 59, 999);
            return allTransactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            });
        }
        const { start, end } = getStartEndOfPeriod(currentDate, timeFrame);
        return allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [allTransactions, currentDate, timeFrame, viewMode, selectedCalendarDate]);

    const calendarTransactions = useMemo(() => {
        // Transactions for the currently displayed month in calendar
        const { start, end } = getStartEndOfPeriod(currentDate, 'MONTHLY');
        return allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [allTransactions, currentDate]);

    const globalBalance = useMemo(() => {
        return allTransactions.reduce((acc, t) => {
            if (t.type === 'INCOME' || t.type === 'TRANSFER_IN' || t.type === 'CAPITAL_GAIN') {
                return acc.plus(t.amount);
            }
            if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT' || t.type === 'CAPITAL_LOSS') {
                return acc.minus(t.amount);
            }
            return acc;
        }, new BigNumber(0));
    }, [allTransactions]);

    const dashboardTransactions = useMemo(() => {
        // In Calendar Mode, Dashboard shows MONTHLY stats, while List shows DAILY
        if (viewMode === 'CALENDAR') {
            return calendarTransactions;
        }
        return filteredData;
    }, [viewMode, calendarTransactions, filteredData]);

    const summary = useMemo((): FinancialSummary => {
        let totalIncome = new BigNumber(0);
        let totalExpense = new BigNumber(0);
        // We track net period flow mainly for Income/Expense cards
        // Balance card will use Global Balance

        dashboardTransactions.forEach(t => {
            if (t.type === 'INCOME') {
                totalIncome = totalIncome.plus(t.amount.abs());
            } else if (t.type === 'EXPENSE') {
                totalExpense = totalExpense.plus(t.amount.abs());
            }
            // Transfers usually don't count as Spending/Income for the stats cards unless we want them to
            // But usually Income card = Earned, Expense card = Spent
        });

        return {
            totalIncome,
            totalExpense,
            balance: globalBalance, // Use Global Balance for 'Actual Balance'
            safeToSpend: globalBalance // Initialize
        };
    }, [dashboardTransactions, globalBalance]);

    // Calculate Safe To Spend (Effective Balance)
    const safeToSpend = useMemo(() => {
        let upcomingBills = new BigNumber(0);
        const { end } = getStartEndOfPeriod(currentDate, viewMode === 'CALENDAR' ? 'MONTHLY' : timeFrame);
        const now = new Date();

        if (end > now && recurrenceRules.length > 0) {
            recurrenceRules.forEach(rule => {
                if (!rule.isActive) return;
                let pointer = new Date(rule.nextDueDate);

                // Only count bills due between NOW and END OF PERIOD
                while (pointer <= end) {
                    if (pointer > now) {
                        // Assume rules are expenses/transfers out for "safety" check?
                        // Or check transactionTemplate type? 
                        // Start with Type check.
                        const type = rule.transactionTemplate.type;
                        if (type === 'EXPENSE' || type === 'TRANSFER_OUT') {
                            upcomingBills = upcomingBills.plus(new BigNumber(rule.transactionTemplate.amount).abs());
                        }
                    }

                    // Advance
                    const next = new Date(pointer);
                    if (rule.frequency === 'DAILY') next.setDate(next.getDate() + 1);
                    else if (rule.frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
                    else if (rule.frequency === 'SEMI_MONTHLY') next.setDate(next.getDate() + 15);
                    else if (rule.frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
                    else if (rule.frequency === 'QUARTERLY') next.setMonth(next.getMonth() + 3);
                    else if (rule.frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1);
                    else break;
                    pointer = next;
                }
            });
        }

        // User prefers Safe-to-Spend to be based on Monthly Income/Budget, not Total Wealth
        const periodNet = summary.totalIncome.minus(summary.totalExpense);
        return periodNet.minus(upcomingBills);
    }, [summary, recurrenceRules, currentDate, timeFrame, viewMode]);

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
                if (t.type === 'INCOME' || t.type === 'TRANSFER_IN' || t.type === 'CAPITAL_GAIN') {
                    return sum.plus(t.amount.abs());
                }
                if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT' || t.type === 'CAPITAL_LOSS') {
                    return sum.minus(t.amount.abs());
                }
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>History</Text>
                                {viewMode === 'CALENDAR' && (
                                    <TouchableOpacity
                                        onPress={() => setShowInfoModal(true)}
                                        style={{ padding: 4, backgroundColor: 'transparent', borderRadius: 12 }}
                                    >
                                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 2 }}>
                                <TouchableOpacity
                                    onPress={() => setViewMode('LIST')}
                                    style={{
                                        paddingHorizontal: 12, paddingVertical: 6,
                                        backgroundColor: viewMode === 'LIST' ? colors.primary : 'transparent',
                                        borderRadius: 6
                                    }}
                                >
                                    <Ionicons name="list" size={20} color={viewMode === 'LIST' ? '#FFF' : colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setViewMode('CALENDAR');
                                        // Ensure we are in a mode that makes sense for calendar navigation if needed, 
                                        // or just rely on currentDate which is shared.
                                    }}
                                    style={{
                                        paddingHorizontal: 12, paddingVertical: 6,
                                        backgroundColor: viewMode === 'CALENDAR' ? colors.primary : 'transparent',
                                        borderRadius: 6
                                    }}
                                >
                                    <Ionicons name="calendar" size={20} color={viewMode === 'CALENDAR' ? '#FFF' : colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Mode Specific Controls */}
                        {viewMode === 'LIST' ? (
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
                        ) : null}

                        {/* Date Navigator */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => navigateDate('prev')} style={{ padding: 8 }}>
                                <Ionicons name="chevron-back" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                                {viewMode === 'CALENDAR'
                                    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                    : getDateRangeLabel(currentDate, timeFrame)
                                }
                            </Text>
                            <TouchableOpacity onPress={() => navigateDate('next')} style={{ padding: 8 }}>
                                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {viewMode === 'CALENDAR' && (
                            <HistoryCalendar
                                currentDate={currentDate}
                                transactions={calendarTransactions}
                                recurrenceRules={recurrenceRules}
                                selectedDate={selectedCalendarDate}
                                onSelectDate={setSelectedCalendarDate}
                                currency={profile?.currency}
                            />
                        )}

                        {/* Summary Dashboard - Show for List Mode or for Selected Date in Calendar Mode */}
                        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Safe to Spend</Text>
                                {isLoading ? <Skeleton width={120} height={32} /> : (
                                    <View>
                                        <Text style={{ color: safeToSpend.isGreaterThanOrEqualTo(0) ? colors.success : colors.error, fontSize: 28, fontWeight: 'bold' }}>
                                            {formatCurrency(safeToSpend)}
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                            Actual Balance: {formatCurrency(summary.balance)}
                                        </Text>
                                    </View>
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
            {/* Info Modal */}
            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Understand Your Calendar"
                maxHeight="80%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Safe to Spend */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                            💰 Safe-to-Spend
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                            Know exactly what you can spend without worrying about bills.
                        </Text>
                        <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
                                (Month Income - Expenses) - <Text style={{ color: colors.text }}>Future Bills</Text> =
                            </Text>
                            <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
                                Safe Amount
                            </Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                            *Calculated based on recurring bills due before the end of the current period.
                        </Text>
                    </View>

                    {/* Guilt Filter */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                            🌡️ Guilt Filter (Heatmap)
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                            Spot your <Text style={{ fontWeight: 'bold' }}>discretionary</Text> spending habits at a glance.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>Light Red</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Small treat ☕</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.4)', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Bright Red</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Big splurge 🛍️</Text>
                            </View>
                        </View>
                        <View style={{ marginTop: 10, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                <Ionicons name="bulb-outline" size={12} color={colors.primary} /> <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Recurring bills like Rent don't trigger the red heat, so you only feel "guilty" about things you can control!
                            </Text>
                        </View>
                    </View>

                    {/* Ghost Forecast */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                            👻 Ghost Forecast
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                            See the future before it happens.
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}>
                            <View style={{ marginRight: 12, gap: 4 }}>
                                <View style={{ backgroundColor: colors.success, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>+$2k</Text>
                                </View>
                                <View style={{ backgroundColor: '#F44336', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>-$500</Text>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Future Badges</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    Green for upcoming Income, Red for Bills.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>
            </BottomModal>
        </ScreenWrapper>
    );
};

export default HistoryScreen;