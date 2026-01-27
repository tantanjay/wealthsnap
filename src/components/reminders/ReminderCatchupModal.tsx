import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
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
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
    // State for snooze menu
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

    const renderItem = ({ item }: { item: Reminder }) => (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardInfo}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="time" size={22} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.reminderTitle, { color: colors.text }]}>{item.title || 'Untitled Reminder'}</Text>
                    <Text style={[styles.reminderTime, { color: colors.textSecondary }]}>Scheduled for today</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                {/* Snooze Split Button */}
                <View style={[styles.snoozeContainer, { backgroundColor: '#F5F5F5' }]}>
                    <TouchableOpacity
                        style={styles.snoozeMainBtn}
                        onPress={() => handleAction(item.id, 'SNOOZED', 15)}
                    >
                        <Ionicons name="notifications-off-outline" size={18} color={colors.textSecondary} style={styles.btnIcon} />
                        <Text style={[styles.snoozeText, { color: colors.textSecondary }]}>Snooze 15m</Text>
                    </TouchableOpacity>
                    <View style={[styles.snoozeSeparator, { backgroundColor: colors.border }]} />
                    <TouchableOpacity
                        style={styles.snoozeMenuBtn}
                        onPress={() => setSnoozingReminderId(item.id)}
                    >
                        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => handleAction(item.id, 'COMPLETED')}
                >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={styles.btnIcon} />
                    <Text style={[styles.completeText, { color: '#fff' }]}>Complete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            {reminders.length > 1 && (
                <TouchableOpacity
                    style={[styles.completeAllBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={handleCompleteAll}
                    activeOpacity={0.7}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} style={styles.btnIcon} />
                    <Text style={[styles.completeAllText, { color: colors.primary }]}>Complete All ({reminders.length})</Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={reminders}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
                style={{ flex: 1 }}
                scrollEnabled={true}
                nestedScrollEnabled={true}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.dismissBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.dismissText, { color: colors.text }]}>Handle Later</Text>
                </TouchableOpacity>
            </View>

            {/* Snooze Duration Modal */}
            <BottomModal
                visible={!!snoozingReminderId}
                onClose={() => setSnoozingReminderId(null)}
                title="Snooze Reminder"
                subtitle="Choose how long to snooze this reminder"
                maxHeight="60%"
            >
                <View style={styles.snoozeOptionsContainer}>
                    {SNOOZE_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.minutes}
                            style={[styles.snoozeOption, { borderBottomColor: colors.border }]}
                            onPress={() => handleSnoozeOption(option.minutes)}
                        >
                            <Text style={[styles.snoozeOptionText, { color: colors.text }]}>{option.label}</Text>
                            {option.minutes === 15 && (
                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginRight: 8 }}>Default</Text>
                            )}
                            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>
            </BottomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    footer: {
        marginTop: 16,
        paddingBottom: 8,
    },
    dismissBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    dismissText: {
        fontSize: 16,
        fontWeight: '700',
    },
    completeAllBtn: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    completeAllText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 10,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        marginLeft: 14,
        flex: 1,
    },
    reminderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    reminderTime: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.8,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        // flex: 1, // Removed flex: 1 from base style as it's added conditionally
        flexDirection: 'row',
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    snoozeContainer: {
        flex: 1.2, // Give more space to snooze button
        flexDirection: 'row',
        borderRadius: 14,
        alignItems: 'center',
        overflow: 'hidden',
    },
    snoozeMainBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 8,
    },
    snoozeSeparator: {
        width: 1,
        height: '60%',
        backgroundColor: '#ccc',
    },
    snoozeMenuBtn: {
        paddingHorizontal: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnIcon: {
        marginRight: 6,
    },
    snoozeText: {
        fontSize: 15,
        fontWeight: '600',
    },
    completeText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    snoozeOptionsContainer: {
        paddingBottom: 20,
    },
    snoozeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    snoozeOptionText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
