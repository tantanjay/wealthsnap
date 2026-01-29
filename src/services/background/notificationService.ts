import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Transaction } from '@types';
import { detectAnomalies } from '@utils/financialMetrics';
import { initReminderCategories, getAllBudgets } from '@services/domain';
import { ASYNC_KEYS } from '@constants/config';
import { REMINDER_BACKGROUND_TASK } from '@services/background/backgroundTasks';

// Export a setup function to be called at app launch (index.ts)
export const setupNotificationListeners = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    // Initialize categories
    initReminderCategories();

    // Register background task (for remote/background fetch triggers)
    Notifications.registerTaskAsync(REMINDER_BACKGROUND_TASK);
};

// Keep for backward compatibility or UI-specific init if needed
export const initNotifications = setupNotificationListeners;



export const requestPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

export const getPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
};

export const openSettings = () => {
    if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
    } else {
        Linking.openSettings();
    }
};

export const checkAndNotifyAnomalies = async (currentMonthTransactions: Transaction[], allTransactions: Transaction[]) => {
    try {
        const status = await getPermissionStatus();
        if (status !== 'granted') return;

        // Detect anomalies
        const budgets = await getAllBudgets();
        const anomalies = detectAnomalies(currentMonthTransactions, allTransactions, budgets);
        if (anomalies.length === 0) return;

        // Get already notified alerts
        const notifiedRaw = await AsyncStorage.getItem(ASYNC_KEYS.NOTIFIED_ALERTS);
        const notifiedAlerts = notifiedRaw ? JSON.parse(notifiedRaw) : {};
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

        // Initialize current month storage if needed
        if (!notifiedAlerts[currentMonthKey]) {
            notifiedAlerts[currentMonthKey] = [];
        }

        let hasNewNotifications = false;

        for (const anomaly of anomalies) {
            // Create a unique ID for this specific anomaly instance
            // User Request: "I want notification to be only once per category item"
            // So we key off the CATEGORY solely.
            const anomalyId = anomaly.category;

            if (!notifiedAlerts[currentMonthKey].includes(anomalyId)) {
                // Schedule notification
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Smart Alert Detected 🚨',
                        body: anomaly.message,
                        data: { type: 'ANOMALY', details: anomaly },
                    },
                    trigger: null, // Send immediately
                });

                // Mark as notified
                notifiedAlerts[currentMonthKey].push(anomalyId);
                hasNewNotifications = true;
            }
        }

        // Clean up old months (keep only last 3 months to save space)
        const keys = Object.keys(notifiedAlerts).sort();
        if (keys.length > 3) {
            const newAlerts: any = {};
            keys.slice(-3).forEach(k => newAlerts[k] = notifiedAlerts[k]);
            await AsyncStorage.setItem(ASYNC_KEYS.NOTIFIED_ALERTS, JSON.stringify(newAlerts));
        } else if (hasNewNotifications) {
            await AsyncStorage.setItem(ASYNC_KEYS.NOTIFIED_ALERTS, JSON.stringify(notifiedAlerts));
        }

    } catch (error) {
        console.error('Error in checkAndNotifyAnomalies:', error);
    }
};

/**
 * Clear all scheduled and displayed notifications from the OS.
 * Used during data reset to ensure no stale notifications remain.
 */
export const clearAllNotifications = async () => {
    try {
        // Cancel all scheduled notifications (reminders, etc.)
        await Notifications.cancelAllScheduledNotificationsAsync();
        // Dismiss all currently displayed notifications in the tray
        await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
};
