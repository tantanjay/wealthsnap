import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Reminder, ReminderAction, ReminderLog } from '@types';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from '@utils/uuid';
import { decryptField, encryptField } from "@services/core/encryptionService";
import { REMINDER_PREFIXES } from '@constants/reminders';

// =============================================================================
// DOMAIN LOGIC
// =============================================================================

/**
 * Handle "The 31st Problem": If a user sets a monthly reminder for the 31st, 
 * it must trigger on the last day of the month for months with fewer days.
 * @param date The desired date
 * @returns The clamped date if necessary
 */
export const clampDayOfMonth = (year: number, month: number, day: number): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Math.min(day, daysInMonth);
};

/**
 * Calculate the next trigger date based on frequency and start date
 */
export const calculateNextOccurrence = (reminder: Reminder, fromDate: Date = new Date()): Date | null => {
    const start = new Date(reminder.startDate);
    const targetDay = start.getDate();
    const targetMonth = start.getMonth();
    const targetWeekday = start.getDay();

    // 1. Candidate Date = max(fromDate, startDate)
    // We want to find the next occurrence strictly AFTER formDate (or at fromDate if that's valid time?)
    // Usually "next" means upcoming.
    // If fromDate < startDate, we should start looking from startDate.
    let next: Date;
    if (fromDate < start) {
        next = new Date(start);
    } else {
        next = new Date(fromDate);
    }

    // Sort times
    const sortedTimes = [...reminder.times].sort();

    // Check if there is a valid time later today
    const currentTimeStr = `${next.getHours().toString().padStart(2, '0')}:${next.getMinutes().toString().padStart(2, '0')}`;
    const nextTimeStr = sortedTimes.find(t => t > currentTimeStr);

    if (nextTimeStr) {
        // Suitable time found later today
        const [hours, minutes] = nextTimeStr.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);

        // Verify this constructed date is actually valid for the frequency pattern
        // (For simple frequencies like DAILY/WEEKLY starting today is fine, but for complex ones we must check)
    } else {
        // No more times today, move to start of next day and find first time
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);

        // Use first time of the day
        const firstTime = sortedTimes[0];
        const [hours, minutes] = firstTime.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
    }

    // 3. Adjust next date based on frequency until it matches
    // We iterate (safely) or calculate to find the first valid date >= next
    const MAX_ITERATIONS = 5000; // Safeguard against infinite loops
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
        let isValid = false;

        switch (reminder.frequency) {
            case 'DAILY':
                isValid = true;
                break;

            case 'WEEKLY':
                isValid = next.getDay() === targetWeekday;
                break;

            case 'SEMI_WEEKLY':
                // Every 3 days from start date
                // We use math to check validity: (current - start) in days % 3 === 0
                // Normalize to midnight for day diff
                const d1 = new Date(next); d1.setHours(0, 0, 0, 0);
                const d2 = new Date(start); d2.setHours(0, 0, 0, 0);
                const diffTime = d1.getTime() - d2.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                isValid = (diffDays % 3 === 0);
                break;

            case 'MONTHLY':
                // Must be same day of month, or last day if clamped
                // Logic: Check if next's day matches targetDay (clamped)
                const currentMonthDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                const expectedDay = Math.min(targetDay, currentMonthDays);
                isValid = next.getDate() === expectedDay;
                break;

            case 'QUARTERLY':
                // Same as monthly but check month % 3 offset
                const qMonthDiff = next.getMonth() - targetMonth;
                if (qMonthDiff % 3 === 0) {
                    const qDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                    const qExpected = Math.min(targetDay, qDays);
                    isValid = next.getDate() === qExpected;
                } else {
                    isValid = false;
                }
                break;

            case 'YEARLY':
                // Same month and day (clamped)
                if (next.getMonth() === targetMonth) {
                    const yDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
                    const yExpected = Math.min(targetDay, yDays);
                    isValid = next.getDate() === yExpected;
                } else {
                    isValid = false;
                }
                break;
        }

        if (isValid) {
            return next;
        }

        // If not valid, move forward.
        // Optimization: For some frequencies, we can jump instead of +1 day.

        switch (reminder.frequency) {
            case 'WEEKLY':
                // Start + 1? No, just +1 day loop is fast enough (max 7)
                next.setDate(next.getDate() + 1);
                break;
            case 'SEMI_WEEKLY':
                // +1 is fine (max 3 checks)
                next.setDate(next.getDate() + 1);
                break;
            case 'MONTHLY':
            case 'QUARTERLY':
            case 'YEARLY':
                // Jumping by month is safer/faster
                // But we must reset to targetDay (or clamped) to avoid skipping
                next.setDate(1); // Go to 1st to avoid month overflow issues when adding month
                next.setMonth(next.getMonth() + 1);
                // We will let the "check validity" logic handle the specific day setting in next iteration? 
                // Wait, if we just setMonth+1, day is 1. Next loop check will fail (unless target is 1).
                // Better approach: Set to roughly target day next month.
                const nextM = new Date(next);
                // ... This getting complex. 
                // Simple +1 day loop is robust but slow for YEARLY (365 iterations).
                // Let's rely on +1 day for short periods, and jumps for long ones.

                if (reminder.frequency === 'YEARLY') {
                    next.setFullYear(next.getFullYear() + 1);
                    next.setMonth(targetMonth);
                    next.setDate(1); // Temporarily
                } else if (reminder.frequency === 'MONTHLY' || reminder.frequency === 'QUARTERLY') {
                    next.setDate(1);
                    next.setMonth(next.getMonth() + 1);
                } else {
                    next.setDate(next.getDate() + 1);
                }
                break;
            default:
                next.setDate(next.getDate() + 1);
        }
        iterations++;
    }

    return null; // Should not happen ideally
};

/**
 * Schedule notifications for a reminder
 */
export const scheduleReminderNotifications = async (reminder: Reminder) => {
    if (!reminder.isActive) return;

    // Cancel existing notifications for this reminder
    await cancelReminderNotifications(reminder.id);

    // We can't easily map 1-to-1 with expo-notifications for complex frequencies with "The 31st Problem"
    // using purely native triggers (monthly triggers don't handle clamping).
    // So we'll schedule the NEXT occurrence and let the background task/app open reschedule.

    // For each time in the reminder, find its specific next occurrence
    for (const time of reminder.times) {
        // To find the next occurrence for THIS specific time, 
        // we create a temporary reminder with only this time.
        const singleTimeReminder = { ...reminder, times: [time] };
        const nextDate = calculateNextOccurrence(singleTimeReminder);

        if (nextDate) {
            const randomPrefix = REMINDER_PREFIXES[Math.floor(Math.random() * REMINDER_PREFIXES.length)];
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: randomPrefix,
                    body: reminder.title,
                    data: { reminderId: reminder.id, type: 'REMINDER' },
                    categoryIdentifier: 'REMINDER_ACTIONS',
                },
                trigger: { type: 'date', date: nextDate } as Notifications.DateTriggerInput,
            });
        }
    }
};

/**
 * Cancel all notifications for a reminder
 */
export const cancelReminderNotifications = async (reminderId: string) => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
        if (notification.content.data?.reminderId === reminderId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
};

/**
 * Handle notification response (Snooze/Complete)
 */
export const handleReminderNotificationAction = async (reminderId: string, action: ReminderAction, snoozeMinutes: number = 0) => {
    const id = generateUUID();
    const log: ReminderLog = {
        id,
        reminderId,
        action,
        timestamp: new Date().toISOString(),
    };
    await saveReminderLog(log);

    if (action === 'COMPLETED') {
        // Update lastTriggered for the reminder to prevent double-firing
        const reminders = await getAllReminders();
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
            const updatedReminder = {
                ...reminder,
                lastTriggered: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await saveReminder(updatedReminder);
            // Reschedule next one
            await scheduleReminderNotifications(updatedReminder);
        }
    } else if (action === 'SNOOZED' && snoozeMinutes > 0) {
        // Calculate snooze time
        const snoozeDate = new Date(Date.now() + snoozeMinutes * 60 * 1000);

        // Schedule a one-off notification
        const randomPrefix = REMINDER_PREFIXES[Math.floor(Math.random() * REMINDER_PREFIXES.length)];
        const reminders = await getAllReminders();
        const reminder = reminders.find(r => r.id === reminderId);

        if (reminder) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: randomPrefix,
                    body: reminder.title,
                    data: { reminderId: reminder.id, type: 'REMINDER' },
                    categoryIdentifier: 'REMINDER_ACTIONS',
                },
                trigger: { type: 'date', date: snoozeDate } as Notifications.DateTriggerInput,
            });

            // Mark as "handled" for now so it disappears from the catch-up list
            // We treat it similar to COMPLETED by updating lastTriggered
            // This ensures it doesn't show up in pending reminders until the next recurrence (or the snoozed notification fires)
            const updatedReminder = {
                ...reminder,
                lastTriggered: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await saveReminder(updatedReminder);
        }
    }
};

/**
 * Check for pending/missed reminders (Catch-up logic)
 */
export const getPendingReminders = async (): Promise<Reminder[]> => {
    const reminders = await getAllReminders();
    const now = new Date();
    const pending: Reminder[] = [];

    for (const reminder of reminders) {
        if (!reminder.isActive) continue;

        const start = new Date(reminder.startDate);
        if (start > now) continue;

        // Check each time defined for the reminder
        for (const time of reminder.times) {
            const [hours, minutes] = time.split(':').map(Number);
            const todayOccurrence = new Date(now);
            todayOccurrence.setHours(hours, minutes, 0, 0);

            // If the time has passed today
            if (todayOccurrence < now) {
                // Check if it was triggered recently
                const lastTriggered = reminder.lastTriggered ? new Date(reminder.lastTriggered) : null;

                // If never triggered or last trigger was before today's scheduled time
                if (!lastTriggered || lastTriggered < todayOccurrence) {
                    // Logic:
                    // If the scheduled time (todayOccurrence) has passed AND
                    // the reminder hasn't been triggered/completed AFTER that time.
                    // Note: Snoozing does NOT update lastTriggered, so snoozed items correctly appear here.

                    // Helper to check if it's the right day
                    const isRightDay = () => {
                        switch (reminder.frequency) {
                            case 'DAILY': return true;
                            case 'WEEKLY': return now.getDay() === start.getDay();
                            case 'MONTHLY': {
                                const targetDay = start.getDate();
                                const lastDay = clampDayOfMonth(now.getFullYear(), now.getMonth(), targetDay);
                                return now.getDate() === lastDay;
                            }
                            case 'QUARTERLY': {
                                const targetMonth = start.getMonth();
                                const targetDay = start.getDate();
                                if ((now.getMonth() - targetMonth) % 3 === 0) {
                                    const lastDay = clampDayOfMonth(now.getFullYear(), now.getMonth(), targetDay);
                                    return now.getDate() === lastDay;
                                }
                                return false;
                            }
                            case 'YEARLY': {
                                const targetMonth = start.getMonth();
                                const targetDay = start.getDate();
                                if (now.getMonth() === targetMonth) {
                                    const lastDay = clampDayOfMonth(now.getFullYear(), now.getMonth(), targetDay);
                                    return now.getDate() === lastDay;
                                }
                                return false;
                            }
                            default: return false;
                        }
                    };

                    if (isRightDay()) {
                        pending.push(reminder);
                        break; // Move to next reminder
                    }
                }
            }
        }
    }

    return pending;
};

// Initialize notification categories
export const initReminderCategories = async () => {
    if (Platform.OS === 'web') return;

    await Notifications.setNotificationCategoryAsync('REMINDER_ACTIONS', [
        {
            identifier: 'COMPLETE',
            buttonTitle: 'Complete ✅',
            options: { opensAppToForeground: false },
        },
        {
            identifier: 'SNOOZE',
            buttonTitle: 'Snooze ⏰',
            options: { opensAppToForeground: false },
        },
    ]);
};

// =============================================================================
// DATA ACCESS (CRUD)
// =============================================================================

export const bulkSaveReminders = async (reminders: Reminder[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const reminder of reminders) {
                const encryptedTitle = await encryptField(reminder.title);
                await db.runAsync(
                    `INSERT OR REPLACE INTO reminders 
                     (id, title, frequency, startDate, times, isActive, lastTriggered, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        reminder.id,
                        encryptedTitle,
                        reminder.frequency,
                        reminder.startDate,
                        JSON.stringify(reminder.times),
                        reminder.isActive ? 1 : 0,
                        reminder.lastTriggered || null,
                        reminder.createdAt || new Date().toISOString(),
                        new Date().toISOString()
                    ]
                );
            }
        });
    } catch (error) {
        console.error('Error bulk saving reminders:', error);
        throw new Error('Failed to bulk save reminders');
    }
};

export const saveReminder = async (reminder: Reminder): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt the title
        const encryptedTitle = await encryptField(reminder.title);

        await db.runAsync(
            `INSERT OR REPLACE INTO reminders 
             (id, title, frequency, startDate, times, isActive, lastTriggered, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reminder.id,
                encryptedTitle,
                reminder.frequency,
                reminder.startDate,
                JSON.stringify(reminder.times),
                reminder.isActive ? 1 : 0,
                reminder.lastTriggered || null,
                reminder.createdAt || new Date().toISOString(),
                new Date().toISOString()
            ]
        );
    } catch (error) {
        console.error('Error saving reminder:', error);
        throw new Error('Failed to save reminder');
    }
};

export const getAllReminders = async (): Promise<Reminder[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM reminders ORDER BY createdAt DESC');

        const reminders = await Promise.all(rows.map(async (row) => {
            const decryptedTitle = await decryptField(row.title);
            return {
                id: row.id,
                title: decryptedTitle || 'Untitled Reminder',
                frequency: row.frequency,
                startDate: row.startDate,
                times: JSON.parse(row.times),
                isActive: row.isActive === 1,
                lastTriggered: row.lastTriggered,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        }));

        return reminders;
    } catch (error) {
        console.error('Error getting reminders:', error);
        return [];
    }
};

export const deleteReminder = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting reminder:', error);
        throw new Error('Failed to delete reminder');
    }
};

export const saveReminderLog = async (log: ReminderLog): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO reminder_logs (id, reminderId, action, timestamp) VALUES (?, ?, ?, ?)`,
            [log.id, log.reminderId, log.action, log.timestamp]
        );
    } catch (error) {
        console.error('Error saving reminder log:', error);
    }
};

export const getReminderLogs = async (reminderId?: string, limit: number = 50): Promise<ReminderLog[]> => {
    try {
        const db = await getDatabase();
        let sql = 'SELECT * FROM reminder_logs';
        let params: any[] = [];

        if (reminderId) {
            sql += ' WHERE reminderId = ?';
            params.push(reminderId);
        }

        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const rows = await db.getAllAsync<any>(sql, params);
        return rows as ReminderLog[];
    } catch (error) {
        console.error('Error getting reminder logs:', error);
        return [];
    }
};