import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../index';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { Reminder } from '../../types';
import { getAllReminders, saveReminder, deleteReminder } from '../../services/domain';
import { scheduleReminderNotifications, cancelReminderNotifications, calculateNextOccurrence } from '../../services/domain/reminderService';

interface ReminderListProps {
    onEdit: (reminder: Reminder) => void;
    onAdd: () => void;
}

export const ReminderList: React.FC<ReminderListProps> = ({ onEdit, onAdd }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReminders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAllReminders();
            setReminders(data);
        } catch (error) {
            console.error('Error loading reminders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReminders();
    }, [loadReminders]);

    const handleToggleActive = async (reminder: Reminder) => {
        const updated = { ...reminder, isActive: !reminder.isActive, updatedAt: new Date().toISOString() };
        try {
            await saveReminder(updated);
            if (updated.isActive) {
                await scheduleReminderNotifications(updated);
            } else {
                await cancelReminderNotifications(updated.id);
            }
            // Update local state
            setReminders(prev => prev.map(r => r.id === updated.id ? updated : r));
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
                            await cancelReminderNotifications(id);
                            await deleteReminder(id);
                            setReminders(prev => prev.filter(r => r.id !== id));
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
        const next = calculateNextOccurrence(reminder);
        return formatDate(next?.toISOString());
    };

    const renderItem = ({ item }: { item: Reminder }) => (
        <Card style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.cardTitle, { color: colors.text }, !item.isActive && styles.disabledText]}>
                        {item.title}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {item.frequency.charAt(0) + item.frequency.slice(1).toLowerCase()} • {formatTimes(item.times)}
                    </Text>
                </View>
                <Switch
                    value={item.isActive}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: colors.gray300, true: colors.primary + '80' }}
                    thumbColor={item.isActive ? colors.primary : colors.gray300}
                />
            </View>

            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.triggerText, { color: colors.textSecondary }]}>
                    N: {getNextTrigger(item)} • L: {formatDate(item.lastTriggered)}
                </Text>
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching...</Text>
                </View>
            ) : (
                <FlatList
                    data={reminders}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color={colors.gray300} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders set yet</Text>
                        </View>
                    }
                />
            )}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={onAdd}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={30} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    disabledText: {
        opacity: 0.5,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 8,
    },
    triggerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 16,
        padding: 4,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
