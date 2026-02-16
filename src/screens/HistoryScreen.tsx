import React, { useState, useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View, SectionList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import TransactionOptionsModal from '@components/transaction/TransactionOptionsModal';
import InvestmentOptionsModal from '@components/investments/modals/InvestmentOptionsModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { Transaction, UserProfile, Investment, RecurrenceRule, Debt } from '@types';
import { deleteTransaction, getCachedTransactions } from '@services/domain/transactionService';
import { deleteInvestment, getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts, deleteDebt } from '@services/domain/debtService';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { saveHistoryTimeFrame, getHistoryTimeFrame, getUserProfile } from '@services/core/storageService';
import { HistoryCalendar } from '@components/history/HistoryCalendar';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { HistoryCalendarHelpModal } from '@components/history/HistoryCalendarHelpModal';
import { HistorySafeToSpendHelpModal } from '@components/history/HistorySafeToSpendHelpModal';
import { HistorySummary } from '@components/history/HistorySummary';
import DebtOptionsModal from '@components/debts/DebtOptionsModal';
import { calculateTotalDebtObligations } from '@utils/debtMetrics';

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type HistoryItem = Transaction | Investment | Debt;

const isInvestment = (item: HistoryItem): item is Investment => {
    return (item as Investment).symbol !== undefined && (item as Investment).action !== undefined;
};

const isDebt = (item: HistoryItem): item is Debt => {
    return (item as Debt).minPayment !== undefined && (item as Debt).initialAmount !== undefined;
};

interface TransactionSection {
    title: string;
    data: HistoryItem[];
    totalAmount: BigNumber;
    count: number;
    originalDate: Date;
}

interface FinancialSummary {
    totalIncome: BigNumber;
    totalExpense: BigNumber;
    totalTransferOut: BigNumber;
    balance: BigNumber;
    safeToSpend?: BigNumber;
}

const HistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [allInvestments, setAllInvestments] = useState<Investment[]>([]);
    const [allDebts, setAllDebts] = useState<Debt[]>([]);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAILY');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showSafeToSpendInfo, setShowSafeToSpendInfo] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
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

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [transactions, investments, debts] = await Promise.all([
                getCachedTransactions(),
                getCachedInvestments(),
                getAllDebts()
            ]);
            setAllTransactions(transactions);
            setAllInvestments(investments);
            setAllDebts(debts);
        } catch (error) {
            console.error('Error loading HistoryScreen data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: BigNumber, currency?: string) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency || profile?.currency || 'PHP');
    };

    const getItemDate = useCallback((item: HistoryItem): Date => {
        if (isDebt(item)) {
            return new Date(item.startDate || item.createdAt);
        }
        return new Date(item.date);
    }, []);

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


    // Combine Transactions, Investments, and Debts
    const allHistoryItems = useMemo((): HistoryItem[] => {
        return [...allTransactions, ...allInvestments, ...allDebts].sort((a, b) => {
            return getItemDate(b).getTime() - getItemDate(a).getTime();
        });
    }, [allTransactions, allInvestments, allDebts, getItemDate]);

    const investmentMap = useMemo(() => {
        return allInvestments.reduce((acc, inv) => {
            acc[inv.id] = inv;
            return acc;
        }, {} as Record<string, Investment>);
    }, [allInvestments]);

    const filteredData = useMemo(() => {
        if (viewMode === 'CALENDAR') {
            // In calendar mode, list shows selected date's transactions
            const start = new Date(selectedCalendarDate); start.setHours(0, 0, 0, 0);
            const end = new Date(selectedCalendarDate); end.setHours(23, 59, 59, 999);
            return allHistoryItems.filter(t => {
                const tDate = getItemDate(t);
                return tDate >= start && tDate <= end;
            });
        }
        const { start, end } = getStartEndOfPeriod(currentDate, timeFrame);
        return allHistoryItems.filter(t => {
            const tDate = getItemDate(t);
            return tDate >= start && tDate <= end;
        });
    }, [allHistoryItems, currentDate, timeFrame, viewMode, selectedCalendarDate, getItemDate]);

    const calendarTransactions = useMemo(() => {
        const { start, end } = getStartEndOfPeriod(currentDate, 'MONTHLY');
        return allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [allTransactions, currentDate]);

    const calendarInvestments = useMemo(() => {
        const { start, end } = getStartEndOfPeriod(currentDate, 'MONTHLY');
        return allInvestments.filter(inv => {
            const iDate = new Date(inv.date);
            return iDate >= start && iDate <= end;
        });
    }, [allInvestments, currentDate]);

    const globalBalance = useMemo(() => {
        return allTransactions.reduce((acc, t) => {
            if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') {
                return acc.plus(t.amount);
            }
            if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') {
                return acc.minus(t.amount);
            }
            return acc;
        }, new BigNumber(0));
    }, [allTransactions]);

    const dashboardTransactions = useMemo(() => {
        // In Calendar Mode, Dashboard shows MONTHLY stats, while List shows DAILY
        // We only use Transactions for the main summary dashboard as per user request
        if (viewMode === 'CALENDAR') {
            return calendarTransactions;
        }

        // Filter out investments for the summary calculation
        const { start, end } = getStartEndOfPeriod(currentDate, timeFrame);
        return allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [viewMode, calendarTransactions, allTransactions, currentDate, timeFrame]);

    const summary = useMemo((): FinancialSummary => {
        let totalIncome = new BigNumber(0);
        let totalExpense = new BigNumber(0);
        let totalTransferOut = new BigNumber(0);

        dashboardTransactions.forEach(t => {
            if (t.type === 'INCOME') {
                totalIncome = totalIncome.plus(t.amount.abs());
            } else if (t.type === 'EXPENSE') {
                totalExpense = totalExpense.plus(t.amount.abs());
            } else if (t.type === 'TRANSFER_OUT') {
                totalTransferOut = totalTransferOut.plus(t.amount.abs());
            }
        });

        return {
            totalIncome,
            totalExpense,
            totalTransferOut,
            balance: globalBalance, // Use Global Balance for 'Actual Balance'
            safeToSpend: globalBalance // Initialize
        };
    }, [dashboardTransactions, globalBalance]);

    // Calculate Safe To Spend (Effective Balance)
    const safeToSpendData = useMemo(() => {
        const burnRatePeriod = 90;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - burnRatePeriod);

        const recentNonRecurringExpenses = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'EXPENSE' &&
                !t.isRecurring &&
                tDate >= thirtyDaysAgo &&
                tDate <= new Date();
        });

        const totalRecentSpend = recentNonRecurringExpenses.reduce((acc, t) => acc.plus(t.amount.abs()), new BigNumber(0));
        const dailyBurnRate = totalRecentSpend.dividedBy(burnRatePeriod);

        const totalMonthlyDebtObligations = calculateTotalDebtObligations(allDebts);

        // Adjust for Period (Yearly View requires 12x)
        let totalPeriodDebtObligations = totalMonthlyDebtObligations;
        if (viewMode === 'LIST' && timeFrame === 'YEARLY') {
            totalPeriodDebtObligations = totalMonthlyDebtObligations.multipliedBy(12);
        }

        // Calculate how much debt was ALREADY paid this period (to avoid double deduction)
        // We look at TRANSFER_OUT transactions with a debtId in the current view's transactions
        // Note: dashboardTransactions is already filtered by the current view's period (Day/Week/Month/Year)
        const debtPaymentsMade = dashboardTransactions
            .filter(t => t.type === 'TRANSFER_OUT' && t.debtId)
            .reduce((acc, t) => acc.plus(t.amount.abs()), new BigNumber(0));

        // Remaining Obligation = Total - Paid (Floor at 0, don't credit extra payments)
        // For Daily/Weekly views, we still subtract the *full* remaining monthly obligation in the 
        // subsequent steps (divided by 30 or 7), so we calculate the remaining *monthly* obligation here.
        // However, for Yearly view, we need the remaining *yearly* obligation.
        const remainingDebtObligations = BigNumber.max(0, totalPeriodDebtObligations.minus(debtPaymentsMade));

        let amount = new BigNumber(0);
        let projectedVariableSpend = new BigNumber(0);

        if (viewMode === 'LIST' && timeFrame === 'DAILY') {
            // Daily View: (Daily Allow - Daily Spend) - (Daily Portion of Remaining Debt)
            // Even in daily view, we reserve the daily portion of the *remaining* debt
            // If debt is fully paid, remaining is 0, so no deduction.
            const dailyRemainingDebt = remainingDebtObligations.dividedBy(30);

            amount = dailyBurnRate.minus(summary.totalExpense).minus(dailyRemainingDebt);
            projectedVariableSpend = dailyBurnRate;
        } else if (viewMode === 'LIST' && timeFrame === 'WEEKLY') {
            const now = new Date();
            const { start, end } = getStartEndOfPeriod(currentDate, 'WEEKLY');

            let multiplier = 7;

            const isCurrentWeek = now >= start && now <= end;
            if (isCurrentWeek) {
                const diffTime = Math.abs(now.getTime() - start.getTime());
                const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                multiplier = daysElapsed;
                if (multiplier < 1) multiplier = 1;
                if (multiplier > 7) multiplier = 7;
            }

            const weeklyAllowance = dailyBurnRate.multipliedBy(multiplier);

            // Weekly Portion of Remaining Debt
            const weeklyRemainingDebt = remainingDebtObligations.dividedBy(4);

            amount = weeklyAllowance.minus(summary.totalExpense).minus(weeklyRemainingDebt);
            projectedVariableSpend = isCurrentWeek ? dailyBurnRate.multipliedBy(multiplier) : dailyBurnRate.multipliedBy(7);
        } else {
            // MONTHLY / YEARLY / CALENDAR (Existing Logic)
            let upcomingBills = new BigNumber(0);
            let upcomingIncome = new BigNumber(0);
            const { end } = getStartEndOfPeriod(currentDate, viewMode === 'CALENDAR' ? 'MONTHLY' : timeFrame);
            const now = new Date();

            if (end > now && recurrenceRules.length > 0) {
                recurrenceRules.forEach(rule => {
                    if (!rule.isActive) return;
                    let pointer = new Date(rule.nextDueDate);

                    // Only count bills due between NOW and END OF PERIOD
                    while (pointer <= end) {
                        if (pointer > now) {
                            const type = rule.transactionTemplate.type;
                            if (type === 'EXPENSE' || type === 'TRANSFER_OUT') {
                                upcomingBills = upcomingBills.plus(new BigNumber(rule.transactionTemplate.amount).abs());
                            } else if (type === 'INCOME') {
                                upcomingIncome = upcomingIncome.plus(new BigNumber(rule.transactionTemplate.amount).abs());
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
            const periodNet = summary.totalIncome.plus(upcomingIncome).minus(summary.totalExpense).minus(summary.totalTransferOut);

            // Calculate Days Remaining in Current Period
            let daysRemaining = 0;
            if (end > now) {
                const limitTime = Math.abs(end.getTime() - now.getTime());
                daysRemaining = Math.ceil(limitTime / (1000 * 60 * 60 * 24));
            }

            // In Monthly mode, this is "Projected Future Variable Spend"
            projectedVariableSpend = dailyBurnRate.multipliedBy(daysRemaining);

            // Deduct Remaining Debt Obligations (treated as a "Bill" that hasn't been paid yet)
            amount = periodNet.minus(upcomingBills).minus(projectedVariableSpend).minus(remainingDebtObligations);
        }

        return {
            amount,
            dailyBurnRate,
            projectedVariableSpend,
            remainingDebtObligations
        };
    }, [summary, recurrenceRules, currentDate, timeFrame, viewMode, allTransactions]);

    const sections = useMemo((): TransactionSection[] => {
        const grouped: { [key: string]: HistoryItem[] } = {};

        filteredData.forEach(item => {
            const dateKey = getItemDate(item).toDateString();
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(item);
        });

        const newSections: TransactionSection[] = Object.keys(grouped).map(dateKey => {
            const items = grouped[dateKey];
            const totalAmount = items.reduce((sum, item) => {
                if (isInvestment(item) || isDebt(item)) return sum;

                const t = item as Transaction;
                if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') {
                    return sum.plus(t.amount.abs());
                }
                if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') {
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
                data: items,
                totalAmount,
                count: items.length,
                originalDate: getItemDate(items[0])
            };
        });

        return newSections.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
    }, [filteredData]);


    const renderItem = ({ item }: { item: HistoryItem }) => {
        if (isInvestment(item)) {
            // Render Investment Item
            const inv = item as Investment;
            // Distinct color for investments (Purple/Blue)
            const iconColor = '#8E24AA';

            // Conversion Logic for Display
            const rate = inv.exchangeRate ? new BigNumber(inv.exchangeRate) : new BigNumber(1);
            // If rate > 1, we assume stored values are in Profile Currency and need conversion for display
            // But only if we want to show in "Native" currency.
            // Since inv.currency might be 'USD', we definitely want to match values to the symbol.

            const nativePrice = inv.price.dividedBy(rate);
            const nativeTotal = nativePrice.multipliedBy(inv.quantity);

            // Find linked P/L for SELL actions
            let plElement = null;
            if (inv.action === 'SELL') {
                const linkedTx = allTransactions.find(t =>
                    (t.type === 'CAPITAL_GAIN' || t.type === 'CAPITAL_LOSS') &&
                    t.investmentId === inv.id
                );
                if (linkedTx) {
                    const isGain = linkedTx.type === 'CAPITAL_GAIN';
                    const nativePL = linkedTx.amount.dividedBy(rate);

                    plElement = (
                        <Text>
                            {" • "}<Text style={{ color: isGain ? colors.success : colors.error, fontWeight: 'bold' }}>
                                {isGain ? '+' : '-'}{formatCurrency(nativePL.abs(), inv.currency)}
                            </Text>
                        </Text>
                    );
                }
            }

            return (
                <TouchableOpacity onPress={() => setSelectedInvestment(inv)} style={{ marginBottom: 8 }} activeOpacity={0.9}>
                    <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: iconColor }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <View style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: iconColor + '15',
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <Ionicons name="stats-chart" size={18} color={iconColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                        {inv.symbol} <Text style={{ fontSize: 14, color: colors.textSecondary }}>({inv.action})</Text>
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                        {inv.quantity.toString()} units @ {formatCurrencyAmount(nativePrice, inv.currency || profile?.currency || 'PHP')}
                                        {plElement}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{
                                    fontSize: 16, fontWeight: 'bold',
                                    color: colors.text
                                }}>
                                    {formatCurrency(nativeTotal, inv.currency)}
                                </Text>
                                <View style={{ backgroundColor: iconColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                    <Text style={{ color: iconColor, fontSize: 10, fontWeight: 'bold' }}>INVESTMENT</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>
            )
        }

        if (isDebt(item)) {
            // Render Debt Item
            const debt = item as Debt;
            const isPayable = debt.direction === 'PAYABLE';
            const iconColor = isPayable ? colors.error : colors.success;
            const iconName = isPayable ? "arrow-down-circle-outline" : "arrow-up-circle-outline";

            return (
                <TouchableOpacity onPress={() => setSelectedDebt(debt)} style={{ marginBottom: 8 }} activeOpacity={0.9}>
                    <Card style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 0, borderLeftWidth: 4, borderLeftColor: iconColor }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                <View style={{
                                    width: 36, height: 36, borderRadius: 18,
                                    backgroundColor: iconColor + '15',
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <Ionicons name={iconName} size={18} color={iconColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                        {debt.name}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                                        {debt.type.replace(/_/g, ' ')} • {debt.interestRate.toString()}% {debt.interestType}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{
                                    fontSize: 16, fontWeight: 'bold',
                                    color: colors.text
                                }}>
                                    {formatCurrencyAmount(debt.initialAmount, debt.currency)}
                                </Text>
                                <View style={{ backgroundColor: iconColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                    <Text style={{ color: iconColor, fontSize: 10, fontWeight: 'bold' }}>DEBT</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>
            );
        }

        const t = item as Transaction;
        const isExpense = t.type === 'EXPENSE';
        const isTransferIn = t.type === 'TRANSFER_IN';
        const isTransferOut = t.type === 'TRANSFER_OUT';
        const isTransfer = isTransferIn || isTransferOut;
        const isNegativeFlow = isExpense || isTransferOut;

        // Determine Icon and Color based on logic
        let iconName: any = "wallet";
        let statusColor = isExpense ? colors.error : colors.success;

        if (isTransfer) {
            statusColor = isTransferIn ? colors.error : colors.success;
            iconName = isTransferIn ? "arrow-down-circle-outline" : "arrow-up-circle-outline";
        } else if (t.creationMethod === 'AI') {
            iconName = "sparkles";
        } else if (t.isRecurring) {
            iconName = "repeat";
        }

        const getDisplayName = () => {
            if (isTransfer) {
                const toTitleCase = (value?: string) =>
                    value
                        ?.toLowerCase()
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());

                return isTransferIn ? `From ${toTitleCase(t.transferAccount)}` : `To ${toTitleCase(t.transferAccount)}`;
            }
            return t.category;
        };

        // Resolve Currency and Amount for Display
        // If linked to investment, respect investment currency and rate
        let displayAmount = t.amount;
        let displayCurrency = undefined;

        if (t.investmentId && investmentMap[t.investmentId]) {
            const inv = investmentMap[t.investmentId];
            displayCurrency = inv.currency;
            if (inv.exchangeRate) {
                displayAmount = displayAmount.dividedBy(inv.exchangeRate);
            }
        }

        return (
            <TouchableOpacity
                onPress={() => {
                    // Prevent opening options for auto-generated transactions
                    if (t.investmentId || t.debtId) return;
                    setSelectedTransaction(t);
                }}
                activeOpacity={t.investmentId || t.debtId ? 1 : 0.7}
                style={{ marginBottom: 8 }}
            >
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
                                    {t.note || t.subCategory || t.type}
                                </Text>
                            </View>
                        </View>
                        <Text style={{
                            color: isNegativeFlow ? colors.error : colors.success,
                            fontSize: 16, fontWeight: 'bold'
                        }}>
                            {isNegativeFlow ? '-' : '+'}{formatCurrency(displayAmount, displayCurrency)}
                        </Text>
                    </View>
                </Card>
            </TouchableOpacity >
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
                    <View style={{ marginBottom: 20, marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View>
                                <Text style={{ color: colors.textSecondary }}>Transaction Log</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ color: colors.text, fontSize: 28, fontWeight: 'bold' }}>History</Text>
                                    {viewMode === 'CALENDAR' && (
                                        <TouchableOpacity
                                            onPress={() => setShowInfoModal(true)}
                                            style={{ padding: 4, backgroundColor: 'transparent', borderRadius: 12 }}
                                        >
                                            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    onPress={togglePrivacy}
                                    style={[
                                        styles.iconButton,
                                        { backgroundColor: colors.surface }
                                    ]}
                                >
                                    <Ionicons
                                        name={isPrivacyEnabled ? 'eye-off' : 'eye'}
                                        size={20}
                                        color={colors.text}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setViewMode(viewMode === 'LIST' ? 'CALENDAR' : 'LIST')}
                                    style={[styles.iconButton, { backgroundColor: colors.surface }]}
                                >
                                    <Ionicons
                                        name={viewMode === 'LIST' ? "calendar-outline" : "list-outline"}
                                        size={20}
                                        color={colors.text}
                                    />
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
                                investments={calendarInvestments}
                                recurrenceRules={recurrenceRules}
                                selectedDate={selectedCalendarDate}
                                onSelectDate={setSelectedCalendarDate}
                                currency={profile?.currency}
                            />
                        )}

                        {/* Summary Dashboard - Show for List Mode or for Selected Date in Calendar Mode */}
                        <HistorySummary
                            summary={summary}
                            safeToSpendData={safeToSpendData}
                            isLoading={isLoading}
                            formatCurrency={formatCurrency}
                            onShowSafeToSpendInfo={() => setShowSafeToSpendInfo(true)}
                        />
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
                onDelete={async (id) => { await deleteTransaction(id); loadData(); setSelectedTransaction(null); }}
                currency={profile?.currency}
            />
            <HistoryCalendarHelpModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
            />

            <HistorySafeToSpendHelpModal
                visible={showSafeToSpendInfo}
                onClose={() => setShowSafeToSpendInfo(false)}
                viewMode={viewMode}
                timeFrame={timeFrame}
            />

            <InvestmentOptionsModal
                visible={!!selectedInvestment}
                investment={selectedInvestment}
                linkedTransaction={selectedInvestment ? allTransactions.find(t => t.investmentId === selectedInvestment.id) || null : null}
                onClose={() => setSelectedInvestment(null)}
                onEdit={(inv) => {
                    setSelectedInvestment(null);
                    // Serialize BigNumber fields to strings for navigation
                    const serializedInvestment = {
                        ...inv,
                        quantity: inv.quantity.toString(),
                        price: inv.price.toString(),
                        fees: inv.fees ? inv.fees.toString() : undefined,
                        exchangeRate: inv.exchangeRate ? inv.exchangeRate.toString() : undefined
                    };
                    navigation.navigate('Record', { investment: serializedInvestment });
                }}
                onDelete={async (id, deleteLinked) => {
                    if (deleteLinked) {
                        // Find ALL linked transactions (Transfer In/Out AND Capital Gain/Loss)
                        const linkedTxs = allTransactions.filter(t => t.investmentId === id);
                        for (const tx of linkedTxs) {
                            await deleteTransaction(tx.id);
                        }
                    }
                    await deleteInvestment(id);
                    loadData();
                    setSelectedInvestment(null);
                }}
                currency={profile?.currency}
            />

            <DebtOptionsModal
                visible={!!selectedDebt}
                debt={selectedDebt}
                linkedTransaction={selectedDebt ? allTransactions.find(t => t.debtId === selectedDebt.id) || null : null}
                onClose={() => setSelectedDebt(null)}
                onDelete={async (id, deleteLinked) => {
                    if (deleteLinked) {
                        const linkedTxs = allTransactions.filter(t => t.debtId === id);
                        for (const tx of linkedTxs) {
                            await deleteTransaction(tx.id);
                        }
                    }
                    await deleteDebt(id);
                    loadData();
                    setSelectedDebt(null);
                }}
                onEdit={(debt) => {
                    // Serialize BigNumbers to strings/numbers for navigation
                    const serializedDebt = {
                        ...debt,
                        initialAmount: debt.initialAmount.toString(),
                        interestRate: debt.interestRate.toString(),
                        minPayment: debt.minPayment.toString(),
                        fees: debt.fees?.toString(),
                        termMonths: debt.termMonths?.toString(),
                    };
                    // Navigate to Record Screen with debt param
                    // @ts-ignore - navigation types need updating but this is safe
                    navigation.navigate('Record', { debt: serializedDebt });
                    setSelectedDebt(null);
                }}
                currency={profile?.currency}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
});

export default HistoryScreen;