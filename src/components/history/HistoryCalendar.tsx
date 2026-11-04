import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { Transaction, RecurrenceRule, Investment } from '@types';
import { formatCompactCurrency } from '@utils/currencyUtils';
import { addMonthsAnchored, getRecurrenceAnchorDay } from '@services/domain/recurrenceService';
import { type, space, radius, fontFamily } from '@styles/theme';

interface HistoryCalendarProps {
    currentDate: Date;
    transactions: Transaction[];
    investments?: Investment[];
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
    recurrenceRules?: RecurrenceRule[];
    currency?: string;
    // Privacy Discreet/Hidden: drop the per-day amounts, keep the income/expense strips and badges.
    hideAmounts?: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
    currentDate,
    transactions,
    investments = [],
    selectedDate,
    onSelectDate,
    recurrenceRules = [],
    currency = 'PHP',
    hideAmounts = false,
}) => {
    const { ds } = useTheme();

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
        const totalSlots = Math.ceil(days.length / 7) * 7;
        const remainingSlots = totalSlots - days.length;
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
                    recurringExpense: new BigNumber(0),
                    recurringIncome: new BigNumber(0),
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

            if (t.type === 'INCOME') {
                stat.income = stat.income.plus(amount);
                if (t.isRecurring) stat.recurringIncome = stat.recurringIncome.plus(amount);
            }
            else if (t.type === 'EXPENSE') {
                stat.expense = stat.expense.plus(amount);
                if (!t.isRecurring) stat.discretionaryExpense = stat.discretionaryExpense.plus(amount);
                else stat.recurringExpense = stat.recurringExpense.plus(amount);
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
                const hasGain = dayTxs.some(t => t.type === 'CAPITAL_GAIN' || (t.investmentId === inv.id && t.amount.isGreaterThan(0)));
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
                const anchorDay = getRecurrenceAnchorDay(rule);
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
                    let next = new Date(pointer);
                    if (rule.frequency === 'DAILY') next.setDate(next.getDate() + 1);
                    else if (rule.frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
                    else if (rule.frequency === 'MONTHLY') next = addMonthsAnchored(pointer, 1, anchorDay);
                    else break;
                    pointer = next;
                }
            });
        }
        return stats;
    }, [transactions, investments, recurrenceRules, currentDate]);

    const maxDiscretionaryExpense = useMemo(() => {
        let max = new BigNumber(0);
        Object.values(dailyStats).forEach(stat => {
            if (stat.discretionaryExpense.isGreaterThan(max)) {
                max = stat.discretionaryExpense;
            }
        });
        return max;
    }, [dailyStats]);

    const renderDay = (date: Date) => {
        const dateKey = date.toDateString();
        const stat = dailyStats[dateKey];
        const isToday = new Date().toDateString() === dateKey;
        const isSelected = selectedDate?.toDateString() === dateKey;
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

        // Heatmap: discretionary spend tints the cell danger, scaled 0.05–0.5 opacity.
        let heatOpacity = 0;
        if (stat && stat.discretionaryExpense.isGreaterThan(0) && maxDiscretionaryExpense.isGreaterThan(0)) {
            const ratio = stat.discretionaryExpense.div(maxDiscretionaryExpense).toNumber();
            heatOpacity = Math.max(0.05, Math.min(ratio * 0.5, 0.5));
        }

        return (
            <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dayCell, isToday && { borderColor: ds.hairline }]}
                onPress={() => onSelectDate(date)}
            >
                {heatOpacity > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: ds.danger, opacity: heatOpacity }]} />}
                {isSelected && <View style={[styles.selectionOverlay, { borderColor: ds.accent, backgroundColor: ds.accentSoft }]} />}
                <View style={styles.cellTop}>
                    <Text style={[styles.dateText, { color: isSelected ? ds.accent : (isCurrentMonth ? ds.text : ds.text3) }]}>
                        {date.getDate()}
                    </Text>
                    <View style={styles.indicatorGroup}>
                        {stat?.hasBuy && <Ionicons name="caret-up" size={10} color={ds.domainInvest} />}
                        {stat?.hasSell && (
                            <Ionicons
                                name="caret-down"
                                size={10}
                                color={stat.sellProfitability === 'PROFIT' ? ds.success : stat.sellProfitability === 'LOSS' ? ds.danger : ds.domainInvest}
                            />
                        )}
                        {/* Show Recurring Amount for Past, Badge for Count is replaced by Amount */}
                        {stat?.recurringCount > 0 && date <= new Date() && (
                            <View style={[styles.miniBadge, { backgroundColor: ds.inset }]}>
                                <Text style={[styles.miniBadgeText, { color: ds.text2 }]}>{stat.recurringCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.centerContent}>
                    {!hideAmounts && date > new Date() && stat && (stat.futureIncomeAmount.isGreaterThan(0) || stat.futureExpenseAmount.isGreaterThan(0)) && (
                        <View style={styles.ghostStack}>
                            {stat.futureIncomeAmount.isGreaterThan(0) && <Text style={[styles.ghostText, { color: ds.success }]}>{formatCompactCurrency(stat.futureIncomeAmount, currency)}</Text>}
                            {stat.futureExpenseAmount.isGreaterThan(0) && <Text style={[styles.ghostText, { color: ds.danger }]}>{formatCompactCurrency(stat.futureExpenseAmount, currency)}</Text>}
                        </View>
                    )}
                    {/* Past Recurring Expenses/Income - Displayed in Center */}
                    {!hideAmounts && date <= new Date() && stat && (stat.recurringExpense.isGreaterThan(0) || stat.recurringIncome.isGreaterThan(0)) && (
                        <View style={styles.ghostStack}>
                            {stat.recurringIncome.isGreaterThan(0) && (
                                <Text style={[styles.ghostText, { color: ds.success }]}>
                                    {formatCompactCurrency(stat.recurringIncome, currency)}
                                </Text>
                            )}
                            {stat.recurringExpense.isGreaterThan(0) && (
                                <Text style={[styles.ghostText, { color: ds.danger }]}>
                                    {formatCompactCurrency(stat.recurringExpense, currency)}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
                <View style={styles.statsStripContainer}>
                    {stat?.totalVol.isGreaterThan(0) ? (
                        <View style={styles.statsStripInner}>
                            {stat.income.isGreaterThan(0) && <View style={{ flex: 1, backgroundColor: ds.success }} />}
                            {stat.expense.isGreaterThan(0) && <View style={{ flex: 1, backgroundColor: ds.danger }} />}
                        </View>
                    ) : <View style={[styles.emptyStrip, { backgroundColor: isCurrentMonth ? ds.hairline : 'transparent' }]} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.weekdayRow}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={[type.caption, styles.weekdayText, { color: ds.text2 }]}>
                        {day}
                    </Text>
                ))}
            </View>

            <View style={styles.grid}>
                {calendarData.map(renderDay)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: space[4],
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: space[2],
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        borderRadius: radius.sm,
        padding: 2,
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    indicatorGroup: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    dateText: { ...type.captionNum, fontFamily: fontFamily.semibold, paddingHorizontal: 2 },
    selectionOverlay: { ...StyleSheet.absoluteFill, borderWidth: 2, borderRadius: radius.sm, zIndex: 1 },
    centerContent: { flex: 1, justifyContent: 'center' },
    ghostStack: { alignItems: 'center' },
    // Below the type scale on purpose: a day cell is ~1/7 of the screen width.
    ghostText: { fontFamily: fontFamily.semibold, fontSize: 7, lineHeight: 8, fontVariant: ['tabular-nums'] },
    miniBadge: { paddingHorizontal: 2, borderRadius: 4, minWidth: 10, alignItems: 'center' },
    miniBadgeText: { fontFamily: fontFamily.semibold, fontSize: 7, fontVariant: ['tabular-nums'] },
    statsStripContainer: { height: 3, width: '100%', borderRadius: 2, overflow: 'hidden' },
    statsStripInner: { flex: 1, flexDirection: 'row' },
    emptyStrip: { flex: 1 }
});
