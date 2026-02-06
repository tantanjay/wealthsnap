import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Transaction, Budget } from '@types';
import { detectAnomalies } from '@utils/financialMetrics';
import { ASYNC_KEYS } from '@constants/config';
import { REMINDER_BACKGROUND_TASK } from '@services/background/backgroundTasks';

/**
 * Setup function to be called at app launch.
 * @param onInit Optional callback to perform additional initialization (like categories)
 */
export const setupNotificationListeners = (onInit?: () => void) => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    if (onInit) {
        onInit();
    }

    // Register background task (for remote/background fetch triggers)
    Notifications.registerTaskAsync(REMINDER_BACKGROUND_TASK).catch(err => {
        console.warn('Failed to register notification background task:', err);
    });
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

/**
 * Checks for anomalies and notifies user if needed.
 * BUDGETS ARE INJECTED TO PREVENT CIRCULAR DEPENDENCY.
 */
export const checkAndNotifyAnomalies = async (
    currentMonthTransactions: Transaction[],
    allTransactions: Transaction[],
    budgets: Budget[]
) => {
    try {
        const status = await getPermissionStatus();
        if (status !== 'granted') return;

        // Detect anomalies using injected budgets
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
            // Create a unique ID for this specific anomaly instance (by category)
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
