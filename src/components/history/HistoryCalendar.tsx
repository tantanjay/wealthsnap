import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { Transaction, RecurrenceRule, Investment } from '@types';
import { formatCompactCurrency } from '@utils/currencyUtils';

interface HistoryCalendarProps {
    currentDate: Date;
    transactions: Transaction[];
    investments?: Investment[];
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    recurrenceRules?: RecurrenceRule[];
    currency?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_WIDTH = (SCREEN_WIDTH - 64 - (2 * 6)) / 7;

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
    currentDate,
    transactions,
    investments = [],
    selectedDate,
    onSelectDate,
    recurrenceRules = [],
    currency = 'PHP'
}) => {
    const { colors } = useTheme();

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        const days: Date[] = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push(new Date(year, month - 1, prevMonthLastDay - i));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        const remainingSlots = 42 - days.length;
        for (let i = 1; i <= remainingSlots; i++) {
            days.push(new Date(year, month + 1, i));
        }
        return days;
    }, [currentDate]);

    const dailyStats = useMemo(() => {
        const stats: { [key: string]: any } = {};

        const getStat = (key: string) => {
            if (!stats[key]) {
                stats[key] = {
                    income: new BigNumber(0),
                    expense: new BigNumber(0),
                    discretionaryExpense: new BigNumber(0),
                    totalVol: new BigNumber(0),
                    recurringCount: 0,
                    futureIncomeAmount: new BigNumber(0),
                    futureExpenseAmount: new BigNumber(0),
                    hasBuy: false,
                    hasSell: false,
                    sellProfitability: 'UNKNOWN'
                };
            }
            return stats[key];
        };

        transactions.forEach(t => {
            const dateKey = new Date(t.date).toDateString();
            const stat = getStat(dateKey);
            const amount = new BigNumber(t.amount).abs();

            if (t.type === 'INCOME') stat.income = stat.income.plus(amount);
            else if (t.type === 'EXPENSE') {
                stat.expense = stat.expense.plus(amount);
                if (!t.isRecurring) stat.discretionaryExpense = stat.discretionaryExpense.plus(amount);
            }
            stat.totalVol = stat.totalVol.plus(amount);
            if (t.isRecurring) stat.recurringCount += 1;
        });

        investments.forEach(inv => {
            const dateKey = new Date(inv.date).toDateString();
            const stat = getStat(dateKey);
            if (inv.action === 'BUY') stat.hasBuy = true;
            else if (inv.action === 'SELL') {
                stat.hasSell = true;
                const dayTxs = transactions.filter(t => new Date(t.date).toDateString() === dateKey);
                const hasGain = dayTxs.some(t => t.type === 'CAPITAL_GAIN' || (t.investmentId === inv.id && t.amount.gt(0)));
                const hasLoss = dayTxs.some(t => t.type === 'CAPITAL_LOSS');
                stat.sellProfitability = hasGain ? 'PROFIT' : (hasLoss ? 'LOSS' : 'UNKNOWN');
            }
        });

        if (recurrenceRules.length > 0) {
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            const today = new Date();

            recurrenceRules.forEach(rule => {
                if (!rule.isActive) return;
                let pointer = new Date(rule.nextDueDate);
                let iterations = 0;
                while (pointer <= monthEnd && iterations < 50) {
                    iterations++;
                    const dateKey = pointer.toDateString();
                    const stat = getStat(dateKey);
                    if (pointer > today) {
                        const amount = new BigNumber(rule.transactionTemplate.amount).abs();
                        if (rule.transactionTemplate.type === 'INCOME') stat.futureIncomeAmount = stat.futureIncomeAmount.plus(amount);
                        else stat.futureExpenseAmount = stat.futureExpenseAmount.plus(amount);
                    } else {
                        stat.recurringCount += 1;
                    }
                    const next = new Date(pointer);
                    if (rule.frequency === 'DAILY') next.setDate(next.getDate() + 1);
                    else if (rule.frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
                    else if (rule.frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
                    else break;
                    pointer = next;
                }
            });
        }
        return stats;
    }, [transactions, investments, recurrenceRules, currentDate]);

    const renderDay = (date: Date) => {
        const dateKey = date.toDateString();
        const stat = dailyStats[dateKey];
        const isToday = new Date().toDateString() === dateKey;
        const isSelected = selectedDate?.toDateString() === dateKey;
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

        return (
            <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dayCell, { backgroundColor: isCurrentMonth ? colors.surface : 'transparent' }]}
                onPress={() => onSelectDate(date)}
            >
                {isSelected && <View style={[styles.selectionOverlay, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]} />}
                <View style={styles.cellTop}>
                    <View style={[isToday && { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 4 }]}>
                        <Text style={[styles.dateText, { color: isToday ? '#FFF' : (isCurrentMonth ? colors.text : colors.textSecondary + '40') }]}>
                            {date.getDate()}
                        </Text>
                    </View>
                    <View style={styles.indicatorGroup}>
                        {stat?.hasBuy && <Ionicons name="caret-up" size={10} color={colors.success} />}
                        {stat?.hasSell && (
                            <Ionicons
                                name="caret-down"
                                size={10}
                                color={stat.sellProfitability === 'PROFIT' ? '#FFD700' : stat.sellProfitability === 'LOSS' ? colors.error : '#FFA500'}
                            />
                        )}
                        {stat?.recurringCount > 0 && date <= new Date() && (
                            <View style={[styles.miniBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.miniBadgeText}>{stat.recurringCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.centerContent}>
                    {date > new Date() && stat && (stat.futureIncomeAmount.gt(0) || stat.futureExpenseAmount.gt(0)) && (
                        <View style={styles.ghostStack}>
                            {stat.futureIncomeAmount.gt(0) && <Text style={[styles.ghostText, { color: colors.success }]}>+{formatCompactCurrency(stat.futureIncomeAmount, currency)}</Text>}
                            {stat.futureExpenseAmount.gt(0) && <Text style={[styles.ghostText, { color: colors.error }]}>-{formatCompactCurrency(stat.futureExpenseAmount, currency)}</Text>}
                        </View>
                    )}
                </View>
                <View style={styles.statsStripContainer}>
                    {stat?.totalVol.gt(0) ? (
                        <View style={styles.statsStripInner}>
                            {stat.income.gt(0) && <View style={{ flex: 1, backgroundColor: colors.success }} />}
                            {stat.expense.gt(0) && <View style={{ flex: 1, backgroundColor: colors.error }} />}
                        </View>
                    ) : <View style={[styles.emptyStrip, { backgroundColor: colors.border + '20' }]} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* WEEKDAY LABELS (Restored) */}
            <View style={styles.weekdayRow}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={[styles.weekdayText, { color: colors.textSecondary }]}>
                        {day.toUpperCase()}
                    </Text>
                ))}
            </View>

            {/* GRID */}
            <View style={styles.grid}>
                {calendarData.map(renderDay)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: 16,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    dayCell: {
        width: Math.floor(COLUMN_WIDTH),
        aspectRatio: 1,
        borderRadius: 8,
        padding: 4,
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
    },
    cellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    indicatorGroup: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    dateText: { fontSize: 11, fontWeight: '600' },
    selectionOverlay: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: 8, zIndex: 1 },
    centerContent: { flex: 1, justifyContent: 'center' },
    ghostStack: { alignItems: 'center' },
    ghostText: { fontSize: 7, fontWeight: 'bold', lineHeight: 8 },
    miniBadge: { paddingHorizontal: 2, borderRadius: 4, minWidth: 10, alignItems: 'center' },
    miniBadgeText: { color: 'white', fontSize: 7, fontWeight: 'bold' },
    statsStripContainer: { height: 3, width: '100%', borderRadius: 2, overflow: 'hidden' },
    statsStripInner: { flex: 1, flexDirection: 'row' },
    emptyStrip: { flex: 1 }
});