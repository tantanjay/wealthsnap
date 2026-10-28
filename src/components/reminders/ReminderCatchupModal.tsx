import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';

import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { useAlert } from '@context/AlertContext';
import { Reminder } from '@types';
import { handleReminderNotificationAction } from '@services/domain/reminderService';

interface ReminderCatchupModalProps {
    pendingReminders: Reminder[];
    onClose: () => void;
}

export const ReminderCatchupModal: React.FC<ReminderCatchupModalProps> = ({
    pendingReminders: initialReminders,
    onClose
}) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
    // Reminder whose snooze options are expanded inline
    const [snoozingReminderId, setSnoozingReminderId] = useState<string | null>(null);

    const SNOOZE_OPTIONS = [
        { label: '15 mins', minutes: 15 },
        { label: '1 hour', minutes: 60 },
        { label: '4 hours', minutes: 240 },
        { label: '8 hours', minutes: 480 },
        { label: '1 day', minutes: 1440 },
        { label: '3 days', minutes: 4320 },
    ];

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds a local editable copy of the prop; see FIXES.md
        setReminders(initialReminders);
    }, [initialReminders]);

    const handleAction = async (reminderId: string, action: 'COMPLETED' | 'SNOOZED', snoozeMinutes: number = 15) => {
        try {
            await handleReminderNotificationAction(reminderId, action, snoozeMinutes);
            const remaining = reminders.filter(r => r.id !== reminderId);
            setReminders(remaining);
            if (remaining.length === 0) {
                onClose();
            }
        } catch {
            showAlert('Error', 'Failed to process reminder');
        }
    };

    const handleSnoozeOption = (minutes: number) => {
        if (snoozingReminderId) {
            handleAction(snoozingReminderId, 'SNOOZED', minutes);
            setSnoozingReminderId(null);
        }
    };

    const handleCompleteAll = async () => {
        try {
            for (const reminder of reminders) {
                await handleReminderNotificationAction(reminder.id, 'COMPLETED');
            }
            onClose();
        } catch {
            showAlert('Error', 'Failed to complete reminders');
        }
    };

    const renderItem = ({ item, index }: { item: Reminder; index: number }) => {
        const expanded = snoozingReminderId === item.id;
        return (
            <Row
                icon="time-outline"
                title={item.title || 'Untitled Reminder'}
                subtitle="Scheduled for today"
                last={index === reminders.length - 1}
                trailing={
                    <Pressable onPress={() => handleAction(item.id, 'COMPLETED')} hitSlop={space[2]} accessibilityRole="button">
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Complete</Text>
                    </Pressable>
                }
            >
                <View style={styles.inlineActions}>
                    <Pressable onPress={() => handleAction(item.id, 'SNOOZED', 15)} hitSlop={space[2]} accessibilityRole="button">
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Snooze 15m</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setSnoozingReminderId(expanded ? null : item.id)}
                        hitSlop={space[2]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                    >
                        <Text style={[type.smallMedium, { color: ds.accent }]}>{expanded ? 'Fewer options ⌃' : 'More options ⌄'}</Text>
                    </Pressable>
                </View>
                {expanded && (
                    <View style={styles.chips}>
                        {SNOOZE_OPTIONS.map(option => (
                            <Pressable
                                key={option.minutes}
                                onPress={() => handleSnoozeOption(option.minutes)}
                                style={[styles.chip, { backgroundColor: ds.inset }]}
                                accessibilityRole="button"
                            >
                                <Text style={[type.smallMedium, { color: ds.text }]}>{option.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </Row>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={reminders}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                extraData={snoozingReminderId}
                showsVerticalScrollIndicator={true}
                style={styles.list}
                scrollEnabled={true}
                nestedScrollEnabled={true}
            />

            <View style={styles.footer}>
                {reminders.length > 1 && (
                    <Pressable
                        style={[styles.button, { backgroundColor: ds.accent }]}
                        onPress={handleCompleteAll}
                        accessibilityRole="button"
                    >
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Complete all ({reminders.length})</Text>
                    </Pressable>
                )}
                <Pressable style={styles.textButton} onPress={onClose} accessibilityRole="button">
                    <Text style={[type.body, { color: ds.text2 }]}>Handle later</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    list: {
        flex: 1,
    },
    inlineActions: {
        flexDirection: 'row',
        gap: space[4],
        marginTop: space[2],
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[2],
        marginTop: space[3],
    },
    chip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    footer: {
        marginTop: space[4],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});
