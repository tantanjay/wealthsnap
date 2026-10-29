import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { View, Text, Pressable, TextInput, Platform, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Group, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { RECURRENCE_OPTIONS } from '@constants/categories';
import { type, space, radius, layout } from '@styles/theme';

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
    const { ds } = useTheme();
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const fieldLabel = [type.small, styles.fieldLabel, { color: ds.text2 }];
    const fieldBox = [styles.field, { backgroundColor: ds.inset }];
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return (
        <View>
            <SectionHeader title="Repeat" grouped />
            <Group>
                <Row
                    icon="repeat-outline"
                    title="Recurring"
                    subtitle="Log this automatically on a schedule"
                    last={!isRecurring}
                    trailing={
                        <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            trackColor={{ true: ds.accent }}
                        />
                    }
                />
                {isRecurring && (
                    <View style={[styles.details, !endsNever && styles.detailsEndField]}>
                        <Text style={fieldLabel}>Label</Text>
                        <View style={fieldBox}>
                            <Ionicons name="pricetag-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={[type.body, styles.fieldInput, { color: ds.text }]}
                                value={recurringLabel}
                                onChangeText={setRecurringLabel}
                                placeholder="e.g. Netflix subscription"
                                placeholderTextColor={ds.text3}
                            />
                        </View>

                        <Text style={[fieldLabel, styles.fieldGap]}>Frequency</Text>
                        <View style={styles.chips}>
                            {RECURRENCE_OPTIONS.filter(o => o.value !== 'NONE').map(opt => {
                                const isActive = frequency === opt.value;
                                return (
                                    <Pressable
                                        key={opt.value}
                                        onPress={() => setFrequency(opt.value)}
                                        style={[styles.chip, isActive && { backgroundColor: ds.inset }]}
                                    >
                                        <Text style={[type.smallMedium, { color: isActive ? ds.text : ds.text2 }]}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={[fieldLabel, styles.fieldGap]}>Start date</Text>
                        <Pressable onPress={() => setShowStartDatePicker(true)} style={fieldBox}>
                            <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                            <Text style={[type.body, { color: ds.text }]}>{formatDate(startDate)}</Text>
                        </Pressable>
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

                        <Row
                            title="Never ends"
                            last={endsNever}
                            style={styles.fieldGap}
                            trailing={
                                <Switch
                                    value={endsNever}
                                    onValueChange={setEndsNever}
                                    trackColor={{ true: ds.accent }}
                                />
                            }
                        />

                        {!endsNever && (
                            <>
                                <Text style={[fieldLabel, styles.fieldGap]}>End date</Text>
                                <Pressable onPress={() => setShowEndDatePicker(true)} style={fieldBox}>
                                    <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                                    <Text style={[type.body, { color: ds.text }]}>{formatDate(endDate)}</Text>
                                </Pressable>
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
            </Group>
        </View>
    );
};

const styles = StyleSheet.create({
    // Fields under the switch row; the group pads the bottom only when a field ends it.
    details: {
        paddingTop: space[3],
    },
    detailsEndField: {
        paddingBottom: layout.groupPadding,
    },
    fieldLabel: {
        marginBottom: space[1],
    },
    fieldGap: {
        marginTop: space[3],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    // Android TextInput adds its own padding; zero it so typed fields match the pressable ones.
    fieldInput: {
        flex: 1,
        padding: 0,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[1],
    },
    chip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
});
