import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../index';
import { useTheme } from '../../context/ThemeContext';
import { RECURRENCE_OPTIONS } from '../../constants/categories';

interface RecurringOptionsProps {
    isRecurring: boolean;
    setIsRecurring: (value: boolean) => void;
    recurringLabel: string;
    setRecurringLabel: (value: string) => void;
    frequency: string;
    setFrequency: (value: string) => void;
    startDate: Date;
    setStartDate: (date: Date) => void;
    endsNever: boolean;
    setEndsNever: (value: boolean) => void;
    endDate: Date;
    setEndDate: (date: Date) => void;
}

export const RecurringOptions: React.FC<RecurringOptionsProps> = ({
    isRecurring,
    setIsRecurring,
    recurringLabel,
    setRecurringLabel,
    frequency,
    setFrequency,
    startDate,
    setStartDate,
    endsNever,
    setEndsNever,
    endDate,
    setEndDate
}) => {
    const { colors } = useTheme();
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    return (
        <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>Recurring Transaction?</Text>
                <TouchableOpacity onPress={() => setIsRecurring(!isRecurring)}>
                    <Ionicons name={isRecurring ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>
            {isRecurring && (
                <View style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Label (e.g. &quot;Netflix Subscription&quot;)</Text>
                    <TextInput
                        style={{
                            color: colors.text,
                            fontSize: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            padding: 8,
                            marginBottom: 16
                        }}
                        value={recurringLabel}
                        onChangeText={setRecurringLabel}
                        placeholder="Name this recurring transaction"
                        placeholderTextColor={colors.gray500}
                    />

                    <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Frequency</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {RECURRENCE_OPTIONS.filter(o => o.value !== 'NONE').map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => setFrequency(opt.value)}
                                style={{
                                    backgroundColor: frequency === opt.value ? colors.primary : colors.background,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    borderRadius: 8,
                                    marginRight: 8,
                                    marginBottom: 8,
                                    borderWidth: 1,
                                    borderColor: frequency === opt.value ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{
                                    color: frequency === opt.value ? '#FFF' : colors.text,
                                    fontSize: 14,
                                }}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Start Date</Text>
                    <TouchableOpacity
                        onPress={() => setShowStartDatePicker(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.background,
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, fontSize: 16 }}>
                            {startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event: DateTimePickerEvent, date?: Date) => {
                                setShowStartDatePicker(Platform.OS === 'ios');
                                if (date) setStartDate(date);
                            }}
                        />
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                        <Text style={{ color: colors.textSecondary, marginRight: 10 }}>Ends Never?</Text>
                        <TouchableOpacity onPress={() => setEndsNever(!endsNever)}>
                            <Ionicons name={endsNever ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {!endsNever && (
                        <>
                            <Text style={{ color: colors.textSecondary, marginBottom: 5, marginTop: 10 }}>End Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowEndDatePicker(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.background,
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                                <Text style={{ color: colors.text, fontSize: 16 }}>
                                    {endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                            {showEndDatePicker && (
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={startDate}
                                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                                        setShowEndDatePicker(Platform.OS === 'ios');
                                        if (date) setEndDate(date);
                                    }}
                                />
                            )}
                        </>
                    )}
                </View>
            )}
        </Card>
    );
};
