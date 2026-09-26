import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Reminder, ReminderFrequency } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveReminder, scheduleReminderNotifications } from '@services/domain/reminderService';

interface ReminderFormProps {
    reminder?: Reminder;
    onSave: () => void;
    onCancel: () => void;
}

const FREQUENCIES: { label: string; value: ReminderFrequency }[] = [
    { label: 'Daily', value: 'DAILY' },
    { label: 'Weekly', value: 'WEEKLY' },
    { label: 'Semi-Weekly', value: 'SEMI_WEEKLY' },
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Bi-Annual', value: 'BI_ANNUAL' },
    { label: 'Yearly', value: 'YEARLY' },
];

export const ReminderForm: React.FC<ReminderFormProps> = ({
    reminder: initialReminder,
    onSave,
    onCancel
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [title, setTitle] = useState(initialReminder?.title || '');
    const [frequency, setFrequency] = useState<ReminderFrequency>(initialReminder?.frequency || 'DAILY');
    const [startDate, setStartDate] = useState(new Date(initialReminder?.startDate || new Date()));
    const [times, setTimes] = useState<string[]>(initialReminder?.times || ['09:00']);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert('Error', 'Please enter a title');
            return;
        }

        if (times.length === 0) {
            showAlert('Error', 'Please add at least one time');
            return;
        }

        const newReminder: Reminder = {
            id: initialReminder?.id || generateUUID(),
            title: title.trim(),
            frequency,
            startDate: startDate.toISOString(),
            times,
            isActive: initialReminder ? initialReminder.isActive : true,
            createdAt: initialReminder?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveReminder(newReminder);
            await scheduleReminderNotifications(newReminder);
            onSave();
        } catch {
            showAlert('Error', 'Failed to save reminder');
        }
    };

    const addTime = () => {
        setTimes([...times, '09:00']);
    };

    const removeTime = (index: number) => {
        if (times.length > 1) {
            const newTimes = [...times];
            newTimes.splice(index, 1);
            setTimes(newTimes);
        } else {
            showAlert('Error', 'Please keep at least one time');
        }
    };

    const formatTime = (timeStr: string) => {
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${period}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onCancel}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{initialReminder ? 'Edit Reminder' : 'New Reminder'}</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
                <TextInput
                    style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="e.g., Pay Rent, Utility Bill"
                    placeholderTextColor={colors.gray500}
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Frequency</Text>
                <View style={styles.frequencyGrid}>
                    {FREQUENCIES.map((freq) => (
                        <TouchableOpacity
                            key={freq.value}
                            style={[
                                styles.frequencyChip,
                                { backgroundColor: colors.surface },
                                frequency === freq.value && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setFrequency(freq.value)}
                        >
                            <Text style={[
                                styles.frequencyText,
                                { color: colors.textSecondary },
                                frequency === freq.value && { color: colors.white }
                            ]}>
                                {freq.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
                <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color={colors.text} />
                    <Text style={[styles.dateText, { color: colors.text }]}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Times</Text>
                    <TouchableOpacity onPress={addTime}>
                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {times.map((time, index) => (
                    <View key={index} style={styles.timeRow}>
                        <TouchableOpacity
                            style={[styles.timePickerButton, { backgroundColor: colors.surface }]}
                            onPress={() => {
                                setSelectedTimeIndex(index);
                                setShowTimePicker(true);
                            }}
                        >
                            <Ionicons name="time-outline" size={20} color={colors.text} />
                            <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(time)}</Text>
                        </TouchableOpacity>
                        {times.length > 1 && (
                            <TouchableOpacity onPress={() => removeTime(index)}>
                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setStartDate(date);
                    }}
                />
            )}

            {showTimePicker && selectedTimeIndex !== null && (
                <DateTimePicker
                    value={(() => {
                        const [h, m] = times[selectedTimeIndex].split(':');
                        const d = new Date();
                        d.setHours(parseInt(h), parseInt(m), 0, 0);
                        return d;
                    })()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                        setShowTimePicker(false);
                        if (date) {
                            const newTimes = [...times];
                            const hours = date.getHours().toString().padStart(2, '0');
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            newTimes[selectedTimeIndex] = `${hours}:${minutes}`;
                            setTimes(newTimes);
                        }
                        setSelectedTimeIndex(null);
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelText: {
        fontSize: 16,
    },
    saveText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    frequencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    frequencyChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        margin: 4,
    },
    frequencyText: {
        fontSize: 14,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    dateText: {
        marginLeft: 8,
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    timePickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginRight: 8,
    },
    timeText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
    },
});
