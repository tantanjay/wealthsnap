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
const COLUMN_WIDTH = (SCREEN_WIDTH - 32) / 7; // Accounting for container padding

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

        // 1. Padding with Previous Month's dates (Ghost Days)
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push(new Date(year, month - 1, prevMonthLastDay - i));
        }

        // 2. Current Month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        // 3. Padding with Next Month's dates to complete the 6-row grid (42 cells)
        const remainingSlots = 42 - days.length;
        for (let i = 1; i <= remainingSlots; i++) {
            days.push(new Date(year, month + 1, i));
        }

        return days;
    }, [currentDate]);

    const dailyStats = useMemo(() => {
        const stats: {
            [key: string]: {
                income: BigNumber;
                expense: BigNumber;
                discretionaryExpense: BigNumber; // For Guilt Filter
                transferIn: BigNumber;
                transferOut: BigNumber;
                totalVol: BigNumber;
                recurringCount: number;
                futureIncomeAmount: BigNumber; // Ghost Income
                futureExpenseAmount: BigNumber; // Ghost Expense
                hasBuy: boolean;
                hasSell: boolean;
                sellProfitability: 'PROFIT' | 'LOSS' | 'UNKNOWN';
            }
        } = {};

        // Helper to init stat
        const getStat = (key: string) => {
            if (!stats[key]) {
                stats[key] = {
                    income: new BigNumber(0),
                    expense: new BigNumber(0),
                    discretionaryExpense: new BigNumber(0),
                    transferIn: new BigNumber(0),
                    transferOut: new BigNumber(0),
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

        // Process actual transactions
        transactions.forEach(t => {
            const dateKey = new Date(t.date).toDateString();
            const stat = getStat(dateKey);

            const amount = new BigNumber(t.amount).abs();

            if (t.type === 'INCOME') stat.income = stat.income.plus(amount);
            else if (t.type === 'EXPENSE') {
                stat.expense = stat.expense.plus(amount);
                if (!t.isRecurring) {
                    stat.discretionaryExpense = stat.discretionaryExpense.plus(amount);
                }
            }
            else if (t.type === 'TRANSFER_IN') stat.transferIn = stat.transferIn.plus(amount);
            else if (t.type === 'TRANSFER_OUT') stat.transferOut = stat.transferOut.plus(amount);

            stat.totalVol = stat.totalVol.plus(amount);
            if (t.isRecurring) stat.recurringCount += 1;
        });

        // Process Investments
        investments.forEach(inv => {
            const dateKey = new Date(inv.date).toDateString();
            const stat = getStat(dateKey);

            if (inv.action === 'BUY') {
                stat.hasBuy = true;
            } else if (inv.action === 'SELL') {
                stat.hasSell = true;

                // Determine Profitability
                // Check if there is a linked Transaction or a generic Capital Gain/Loss on the same day
                const daysTransactions = transactions.filter(t => new Date(t.date).toDateString() === dateKey);
                const hasGain = daysTransactions.some(t => t.type === 'CAPITAL_GAIN' || (t.investmentId === inv.id && t.amount.isGreaterThan(0) && t.type !== 'TRANSFER_IN')); // Rough logic
                const hasLoss = daysTransactions.some(t => t.type === 'CAPITAL_LOSS');

                if (hasGain) stat.sellProfitability = 'PROFIT';
                else if (hasLoss) stat.sellProfitability = 'LOSS';
                else stat.sellProfitability = 'UNKNOWN'; // Neutral
            }
        });

        // Process Recurring Projections (Ghost Forecast)
        if (recurrenceRules.length > 0) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            const today = new Date(); // Compare against real-time today

            recurrenceRules.forEach(rule => {
                if (!rule.isActive) return;

                let pointer = new Date(rule.nextDueDate);

                // Safety loop check
                let iterations = 0;
                while (pointer <= monthEnd && iterations < 1000) {
                    iterations++;
                    if (pointer >= monthStart) {
                        const dateKey = pointer.toDateString();
                        const stat = getStat(dateKey);

                        // We count it as recurring for the badge count logic mostly
                        stat.recurringCount += 1;

                        // Ghost Forecast: Only sum amount if it's strictly in the future
                        if (pointer > today) {
                            const amount = new BigNumber(rule.transactionTemplate.amount).abs();
                            if (rule.transactionTemplate.type === 'INCOME') {
                                stat.futureIncomeAmount = stat.futureIncomeAmount.plus(amount);
                            } else {
                                stat.futureExpenseAmount = stat.futureExpenseAmount.plus(amount);
                            }
                        }
                    }

                    // Advance pointer
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

        return stats;
    }, [transactions, investments, recurrenceRules, currentDate]);

    const renderDay = (date: Date) => {
        const dateKey = date.toDateString();
        const stat = dailyStats[dateKey];
        const isToday = new Date().toDateString() === dateKey;
        const isSelected = selectedDate?.toDateString() === dateKey;
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

        // Heatmap Logic: Calculate opacity based on discretionary expense
        const getHeatmapColor = () => {
            if (!stat || stat.discretionaryExpense.isLessThanOrEqualTo(0)) return 'transparent';
            // Guilt Filter: Only discretionary spending triggers red heatmap
            // Cap at 0.5 opacity so text remains readable. Using 5000 as arbitrary cap relative unit.
            const intensity = Math.min(stat.discretionaryExpense.toNumber() / 5000, 0.4);
            return `rgba(220, 38, 38, ${intensity})`; // Red heatmap
        };

        const heatmapColor = getHeatmapColor();

        // Helper for log scale flex: Makes small transactions visible against large ones
        const getLogFlex = (amount: BigNumber) => {
            const val = amount.toNumber();
            if (val <= 0) return 0;
            // distinct enough for small vs large, but ensures visibility
            return Math.max(Math.log10(val + 1), 0.5);
        };

        return (
            <TouchableOpacity
                key={date.toISOString()}
                style={[
                    styles.dayCell,
                    {
                        backgroundColor: heatmapColor !== 'transparent' ? heatmapColor : (isCurrentMonth ? colors.surface : 'transparent'),
                        borderColor: 'transparent',
                        borderWidth: 0
                    }
                ]}
                onPress={() => onSelectDate(date)}
                activeOpacity={0.8}
            >
                {/* Selection Highlight */}
                {isSelected && (
                    <View style={[styles.selectionOverlay, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} />
                )}

                <View style={styles.cellTop}>
                    <View style={[
                        isToday && { backgroundColor: colors.primary, borderRadius: 20 } // Apply circle if today
                    ]}>
                        <Text style={[
                            styles.dateText,
                            {
                                color: isToday
                                    ? '#FFFFFF' // Contrast text color for the circle
                                    : (isCurrentMonth ? colors.text : colors.textSecondary + '40'),
                                fontWeight: isToday ? 'bold' : '500',
                                fontSize: isToday ? 10 : 12,
                                padding: isToday ? 2 : 0,
                            }
                        ]}>
                            {date.getDate()}
                        </Text>
                    </View>

                    {/* Investment Indicators */}
                    {/* Investment Indicators - Horizontal Stack */}
                    <View style={{ flexDirection: 'row', gap: 2, marginLeft: 4 }}>
                        {stat && stat.hasBuy && (
                            <Ionicons name="caret-up" size={14} color={colors.success} />
                        )}
                        {stat && stat.hasSell && (
                            <Ionicons
                                name="caret-down"
                                size={14}
                                color={stat.sellProfitability === 'PROFIT' ? '#FFD700' : stat.sellProfitability === 'LOSS' ? colors.error : '#FFA500'}
                            />
                        )}
                    </View>
                </View>

                {/* Data Representation: The Progress Strip (Logarithmic) */}
                <View style={styles.statsStripContainer}>
                    {stat && stat.totalVol.isGreaterThan(0) ? (
                        <View style={styles.statsStripInner}>
                            {stat.income.isGreaterThan(0) && <View style={{ flex: getLogFlex(stat.income), backgroundColor: colors.success }} />}
                            {stat.transferIn.isGreaterThan(0) && <View style={{ flex: getLogFlex(stat.transferIn), backgroundColor: '#4F46E5' }} />}
                            {stat.transferOut.isGreaterThan(0) && <View style={{ flex: getLogFlex(stat.transferOut), backgroundColor: '#F59E0B' }} />}
                            {stat.expense.isGreaterThan(0) && <View style={{ flex: getLogFlex(stat.expense), backgroundColor: colors.error }} />}
                        </View>
                    ) : (
                        <View style={[styles.emptyStrip, { backgroundColor: colors.border + '30' }]} />
                    )}
                </View>

                {/* Future Ghost Badges: Stacked if multiples */}
                {date > new Date() && stat && (stat.futureIncomeAmount.gt(0) || stat.futureExpenseAmount.gt(0)) ? (
                    <View style={styles.ghostBadgeContainer}>
                        {stat.futureIncomeAmount.gt(0) && (
                            <View style={[styles.ghostBadge, { backgroundColor: colors.success }]}>
                                <Text style={styles.ghostText}>{formatCompactCurrency(stat.futureIncomeAmount, currency)}</Text>
                            </View>
                        )}
                        {stat.futureExpenseAmount.gt(0) && (
                            <View style={[styles.ghostBadge, { backgroundColor: '#F44336' }]}>
                                <Text style={styles.ghostText}>{formatCompactCurrency(stat.futureExpenseAmount, currency)}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    /* Recurring Count Badge (Past/Present or Future mixed) */
                    stat && stat.recurringCount > 0 && (
                        <View style={[styles.recurringBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.recurringText}>{stat.recurringCount}</Text>
                        </View>
                    )
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Weekday Labels */}
            <View style={styles.weekdayRow}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={[styles.weekdayText, { color: colors.textSecondary }]}>
                        {day.toUpperCase()}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.grid}>
                {calendarData.map((date) => renderDay(date))}
            </View>

            {/* Custom Legend for WealthSnap */}
            <View style={styles.legendContainer}>
                {[
                    { label: 'Income', color: colors.success },
                    { label: 'Expense', color: colors.error },
                    { label: 'Transfer', color: '#4F46E5' },
                ].map((item) => (
                    <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2, // Tiny gap for definition
    },
    dayCell: {
        width: COLUMN_WIDTH - 2,
        aspectRatio: 1,
        borderRadius: 8,
        padding: 6,
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
    },
    cellTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 13,
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderRadius: 8,
        zIndex: 1,
    },
    statsStripContainer: {
        height: 4,
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
    },
    statsStripInner: {
        flex: 1,
        flexDirection: 'row',
    },
    emptyStrip: {
        flex: 1,
    },
    recurringBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        paddingHorizontal: 3,
        borderRadius: 4,
    },
    recurringText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    ghostBadgeContainer: {
        position: 'absolute',
        top: 2,
        right: 2,
        alignItems: 'flex-end',
        gap: 1,
    },
    ghostBadge: {
        borderRadius: 4,
        paddingHorizontal: 2,
        paddingVertical: 1,
    },
    ghostText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    legendContainer: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'center',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
    },
});