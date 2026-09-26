import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface HistoryDatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    timeFrame: TimeFrame;
    currentDate: Date;
    onSelectDate: (date: Date) => void;
    availableYears: number[]; // years that actually have data, newest first
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sunday-Saturday, matching HistoryScreen's getStartEndOfPeriod WEEKLY logic.
const getWeekBounds = (date: Date): { start: Date; end: Date } => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
};

const buildMonthGrid = (monthDate: Date): Date[] => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
};

const TITLES: Record<TimeFrame, string> = {
    DAILY: 'Select Day',
    WEEKLY: 'Select Week',
    MONTHLY: 'Select Month & Year',
    YEARLY: 'Select Year',
};

export const HistoryDatePickerModal: React.FC<HistoryDatePickerModalProps> = ({
    visible,
    onClose,
    timeFrame,
    currentDate,
    onSelectDate,
    availableYears,
}) => {
    const { colors } = useTheme();
    const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
    const [pickerMonthDate, setPickerMonthDate] = useState(currentDate);
    // Monthly mode only: swaps the month grid for a tap-to-jump year list, so switching to
    // a far-off year doesn't mean clicking the prev/next arrows over and over.
    const [showYearList, setShowYearList] = useState(false);

    // Re-sync the picker's internal nav state to wherever the screen currently is,
    // every time the sheet is opened - otherwise it'd keep showing the last month/year
    // browsed inside the picker instead of where currentDate actually points.
    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs picker default on open; see FIXES.md
            setPickerYear(currentDate.getFullYear());
            setPickerMonthDate(currentDate);
            setShowYearList(false);
        }
    }, [visible, currentDate]);

    const monthGridDays = useMemo(() => buildMonthGrid(pickerMonthDate), [pickerMonthDate]);
    const currentWeekBounds = useMemo(() => getWeekBounds(currentDate), [currentDate]);

    const commit = (date: Date) => {
        onSelectDate(date);
        onClose();
    };

    const renderDayGrid = () => (
        <View>
            <View style={styles.monthNavRow}>
                <TouchableOpacity
                    onPress={() => setPickerMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    style={{ padding: 8 }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                    {pickerMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                    onPress={() => setPickerMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    style={{ padding: 8 }}
                >
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
                ))}
            </View>

            <View style={styles.grid}>
                {monthGridDays.map(date => {
                    const isCurrentMonth = date.getMonth() === pickerMonthDate.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = timeFrame === 'WEEKLY'
                        ? date >= currentWeekBounds.start && date <= currentWeekBounds.end
                        : date.toDateString() === currentDate.toDateString();

                    return (
                        <TouchableOpacity
                            key={date.toISOString()}
                            style={styles.dayCell}
                            onPress={() => commit(timeFrame === 'WEEKLY' ? getWeekBounds(date).start : date)}
                        >
                            <View style={[
                                styles.dayCellInner,
                                isSelected && { backgroundColor: colors.primary + (timeFrame === 'WEEKLY' ? '30' : 'FF') },
                                isSelected && timeFrame !== 'WEEKLY' && { borderRadius: 18 },
                            ]}>
                                <Text style={{
                                    color: isSelected && timeFrame !== 'WEEKLY' ? '#FFF' : isCurrentMonth ? colors.text : colors.textSecondary + '60',
                                    fontWeight: isToday ? 'bold' : '400',
                                }}>
                                    {date.getDate()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    // Shared tap-to-jump year list - one row per year that actually has data, newest first.
    // `onSelectYear` decides what "picking a year" means for the caller: Yearly commits
    // straight away, Monthly just jumps the month grid to that year.
    const renderYearList = (selectedYear: number, onSelectYear: (year: number) => void) => (
        <View style={{ gap: 8 }}>
            {availableYears.map(year => {
                const isSelected = year === selectedYear;
                return (
                    <TouchableOpacity
                        key={year}
                        onPress={() => onSelectYear(year)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                            borderRadius: 12,
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                        }}
                    >
                        <Text style={{
                            color: isSelected ? '#fff' : colors.text,
                            fontWeight: isSelected ? 'bold' : '500',
                            fontSize: 16,
                        }}>
                            {year}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderMonthGrid = () => {
        if (showYearList) {
            return renderYearList(pickerYear, (year) => {
                setPickerYear(year);
                setShowYearList(false);
            });
        }

        return (
            <View>
                <View style={styles.monthNavRow}>
                    <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={{ padding: 10 }}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowYearList(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{pickerYear}</Text>
                        <Ionicons name="chevron-expand-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={{ padding: 10 }}>
                        <Ionicons name="chevron-forward" size={28} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                    {MONTHS.map((month, index) => {
                        const isSelected = currentDate.getMonth() === index && currentDate.getFullYear() === pickerYear;
                        return (
                            <TouchableOpacity
                                key={month}
                                onPress={() => commit(new Date(pickerYear, index, 1))}
                                style={{
                                    width: '22%',
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                    borderWidth: 1,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    color: isSelected ? '#fff' : colors.text,
                                    fontWeight: isSelected ? 'bold' : '500',
                                    fontSize: 14,
                                }}>
                                    {month}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Tapping a year commits immediately - no separate "Jump to {year}" step needed once
    // the year itself is the thing being picked (unlike Monthly, there's no month left to
    // choose afterward).
    const renderYearPicker = () => renderYearList(currentDate.getFullYear(), (year) => commit(new Date(year, 0, 1)));

    const title = timeFrame === 'MONTHLY' && showYearList ? 'Select Year' : TITLES[timeFrame];

    return (
        <BottomModal visible={visible} onClose={onClose} title={title} maxHeight="65%">
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ padding: 16 }}>
                    {(timeFrame === 'DAILY' || timeFrame === 'WEEKLY') && renderDayGrid()}
                    {timeFrame === 'MONTHLY' && renderMonthGrid()}
                    {timeFrame === 'YEARLY' && renderYearPicker()}
                    <View style={{ height: 10 }} />
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    monthNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCellInner: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
});
