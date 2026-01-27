import React, { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAlert } from '@context/AlertContext';
import { Reminder, ReminderFrequency } from '@types';
import { saveReminder } from '@services/domain';
import { generateUUID } from '@utils/uuid';
import { scheduleReminderNotifications } from '@services/domain/reminderService';

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
    { label: 'Yearly', value: 'YEARLY' },
];

export const ReminderForm: React.FC<ReminderFormProps> = ({
    reminder: initialReminder,
    onSave,
    onCancel
}) => {
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
            <View style={styles.header}>
                <TouchableOpacity onPress={onCancel}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{initialReminder ? 'Edit Reminder' : 'New Reminder'}</Text>
                <TouchableOpacity onPress={handleSave}>
                    <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Pay Rent, Utility Bill"
                    placeholderTextColor="#999"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencyGrid}>
                    {FREQUENCIES.map((freq) => (
                        <TouchableOpacity
                            key={freq.value}
                            style={[
                                styles.frequencyChip,
                                frequency === freq.value && styles.frequencyChipActive
                            ]}
                            onPress={() => setFrequency(freq.value)}
                        >
                            <Text style={[
                                styles.frequencyText,
                                frequency === freq.value && styles.frequencyTextActive
                            ]}>
                                {freq.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Ionicons name="calendar-outline" size={20} color="#333" />
                    <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>Times</Text>
                    <TouchableOpacity onPress={addTime}>
                        <Ionicons name="add-circle" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                {times.map((time, index) => (
                    <View key={index} style={styles.timeRow}>
                        <TouchableOpacity
                            style={styles.timePickerButton}
                            onPress={() => {
                                setSelectedTimeIndex(index);
                                setShowTimePicker(true);
                            }}
                        >
                            <Ionicons name="time-outline" size={20} color="#333" />
                            <Text style={styles.timeText}>{formatTime(time)}</Text>
                        </TouchableOpacity>
                        {times.length > 1 && (
                            <TouchableOpacity onPress={() => removeTime(index)}>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
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
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    cancelText: {
        color: '#FF3B30',
        fontSize: 16,
    },
    saveText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 8,
        color: '#333',
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
        backgroundColor: '#f0f0f0',
        margin: 4,
    },
    frequencyChipActive: {
        backgroundColor: '#007AFF',
    },
    frequencyText: {
        fontSize: 14,
        color: '#666',
    },
    frequencyTextActive: {
        color: '#fff',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#ddd',
    },
    dateText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
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
        backgroundColor: '#f9f9f9',
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
