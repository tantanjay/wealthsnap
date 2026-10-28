import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
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
    const { ds } = useTheme();
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
        <View style={styles.container}>
            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <SectionHeader
                    title={initialReminder ? 'Edit reminder' : 'New reminder'}
                    actionLabel="Cancel"
                    onAction={onCancel}
                    style={styles.firstHeader}
                />

                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Title</Text>
                <TextInput
                    style={[type.body, styles.field, { backgroundColor: ds.inset, color: ds.text }]}
                    placeholder="e.g., Pay Rent, Utility Bill"
                    placeholderTextColor={ds.text3}
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Frequency</Text>
                <View style={styles.frequencyGrid}>
                    {FREQUENCIES.map((freq) => {
                        const selected = frequency === freq.value;
                        return (
                            <Pressable
                                key={freq.value}
                                style={[styles.frequencyChip, selected && { backgroundColor: ds.inset }]}
                                onPress={() => setFrequency(freq.value)}
                                accessibilityState={{ selected }}
                            >
                                <Text style={[type.smallMedium, { color: selected ? ds.text : ds.text2 }]}>
                                    {freq.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Start date</Text>
                <Pressable
                    style={[styles.field, styles.fieldRow, { backgroundColor: ds.inset }]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                    <Text style={[type.bodyNum, { color: ds.text }]}>{startDate.toLocaleDateString()}</Text>
                </Pressable>

                <SectionHeader title="Times" actionLabel="Add time" onAction={addTime} />
                {times.map((time, index) => (
                    <View key={index} style={styles.timeRow}>
                        <Pressable
                            style={[styles.field, styles.fieldRow, styles.timeField, { backgroundColor: ds.inset }]}
                            onPress={() => {
                                setSelectedTimeIndex(index);
                                setShowTimePicker(true);
                            }}
                        >
                            <Ionicons name="time-outline" size={18} color={ds.text2} />
                            <Text style={[type.bodyNum, { color: ds.text }]}>{formatTime(time)}</Text>
                        </Pressable>
                        {times.length > 1 && (
                            <Pressable onPress={() => removeTime(index)} hitSlop={space[2]} accessibilityLabel="Remove time">
                                <Ionicons name="trash-outline" size={20} color={ds.danger} />
                            </Pressable>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Pressable onPress={handleSave} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save reminder</Text>
            </Pressable>

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
    form: {
        flex: 1,
    },
    firstHeader: {
        marginTop: 0,
    },
    label: {
        marginTop: space[4],
        marginBottom: space[2],
    },
    field: {
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    frequencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[1],
    },
    frequencyChip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginTop: space[2],
    },
    timeField: {
        flex: 1,
    },
    button: {
        height: 48,
        marginTop: space[4],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
