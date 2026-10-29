import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { Group, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { useAlert } from '@context/AlertContext';
import { Reminder } from '@types';
import * as ReminderService from '@services/domain/reminderService';
import { EmptyState } from '@components/common/EmptyState';

interface ReminderListProps {
    onEdit: (reminder: Reminder) => void;
    onAdd: () => void;
}

export const ReminderList: React.FC<ReminderListProps> = ({ onEdit, onAdd }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

    const refreshScheduledIds = useCallback(async () => {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const ids = new Set(scheduled.map(n => n.content.data?.reminderId as string).filter(Boolean));
            setScheduledIds(ids);
        } catch (error) {
            console.error('Error fetching scheduled notifications:', error);
        }
    }, []);

    const sortReminders = useCallback((list: Reminder[]) => {
        return [...list].sort((a, b) => {
            // 1. Active first
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            if (!a.isActive && !b.isActive) return 0; // Keep original order for inactive? Or sort by title?

            // 2. Sort by next upcoming date
            const nextA = ReminderService.calculateNextOccurrence(a);
            const nextB = ReminderService.calculateNextOccurrence(b);

            if (!nextA && !nextB) return 0;
            if (!nextA) return 1;
            if (!nextB) return -1;

            return nextA.getTime() - nextB.getTime();
        });
    }, []);

    const loadReminders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await ReminderService.getAllReminders();
            setReminders(sortReminders(data));
            await refreshScheduledIds();
        } catch (error) {
            console.error('Error loading reminders:', error);
        } finally {
            setLoading(false);
        }
    }, [refreshScheduledIds, sortReminders]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load; see FIXES.md
        loadReminders();
    }, [loadReminders]);

    // Refresh notification status when app comes to foreground could be nice, but simple useEffect is okay for now.

    const handleToggleActive = async (reminder: Reminder) => {
        const updated = { ...reminder, isActive: !reminder.isActive, updatedAt: new Date().toISOString() };
        try {
            await ReminderService.saveReminder(updated);
            if (updated.isActive) {
                await ReminderService.scheduleReminderNotifications(updated);
            } else {
                await ReminderService.cancelReminderNotifications(updated.id);
            }
            // Update local state and re-sort
            setReminders(prev => {
                const newList = prev.map(r => r.id === updated.id ? updated : r);
                return sortReminders(newList);
            });
            await refreshScheduledIds();
        } catch {
            showAlert('Error', 'Failed to update reminder');
        }
    };

    const handleDelete = (id: string) => {
        showAlert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ReminderService.cancelReminderNotifications(id);
                            await ReminderService.deleteReminder(id);
                            setReminders(prev => prev.filter(r => r.id !== id));
                            await refreshScheduledIds();
                        } catch {
                            showAlert('Error', 'Failed to delete reminder');
                        }
                    }
                }
            ]
        );
    };

    const formatTimes = (times: string[]) => {
        return times.map(t => {
            const [h, m] = t.split(':');
            const hour = parseInt(h);
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${m}${period}`;
        }).join(', ');
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getNextTrigger = (reminder: Reminder) => {
        if (!reminder.isActive) return 'Disabled';
        const next = ReminderService.calculateNextOccurrence(reminder);
        return formatDate(next?.toISOString());
    };

    const renderItem = ({ item, index }: { item: Reminder; index: number }) => (
        <Row
            icon={item.isActive ? 'notifications-outline' : 'notifications-off-outline'}
            title={item.title}
            subtitle={`${item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()} · ${formatTimes(item.times)}`}
            onPress={() => onEdit(item)}
            last={index === reminders.length - 1}
            trailing={
                <View style={styles.actions}>
                    <Switch
                        value={item.isActive}
                        onValueChange={() => handleToggleActive(item)}
                        trackColor={{ false: ds.hairline, true: ds.accentSoft }}
                        thumbColor={item.isActive ? ds.accent : ds.text3}
                    />
                    <Pressable onPress={() => handleDelete(item.id)} hitSlop={space[2]} accessibilityLabel="Delete reminder">
                        <Ionicons name="trash-outline" size={20} color={ds.danger} />
                    </Pressable>
                </View>
            }
        >
            <View style={styles.trigger}>
                {scheduledIds.has(item.id) && (
                    <Ionicons name="checkmark-circle-outline" size={14} color={ds.success} />
                )}
                <Text style={[type.captionNum, { color: ds.text2 }]}>
                    Next {getNextTrigger(item)} · Last {formatDate(item.lastTriggered)}
                </Text>
            </View>
        </Row>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={ds.accent} />
                    <Text style={[type.small, { color: ds.text2 }]}>Fetching…</Text>
                </View>
            ) : reminders.length === 0 ? (
                <View style={styles.list}>
                    <EmptyState size="compact" icon="notifications-off-outline" title="No reminders set yet" />
                </View>
            ) : (
                <View style={styles.list}>
                    {/* `padded` puts the list straight in the Group (no clip wrapper), so it can still shrink and scroll. */}
                    <Group padded style={styles.group}>
                        <FlatList
                            data={reminders}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                        />
                    </Group>
                </View>
            )}
            <Pressable
                style={[styles.button, { backgroundColor: ds.accent }]}
                onPress={onAdd}
                accessibilityRole="button"
            >
                <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Add reminder</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        flex: 1,
    },
    group: {
        flexShrink: 1,
        paddingVertical: 0,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    button: {
        height: 48,
        marginTop: space[4],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
