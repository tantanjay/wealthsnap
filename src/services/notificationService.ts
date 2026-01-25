import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import { Transaction, ReminderAction } from '../types';
import { detectAnomalies } from '../utils/financialMetrics';
import { initReminderCategories, handleReminderNotificationAction } from './reminderService';

const NOTIFIED_ALERTS_KEY = '@wealthsnap_notified_alerts';

export const initNotifications = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    // Initialize reminder-specific categories (Snooze, Complete)
    initReminderCategories();

    // Handle background/foreground notification actions
    Notifications.addNotificationResponseReceivedListener(response => {
        const { actionIdentifier, notification } = response;
        const data = notification.request.content.data;

        if (data.type === 'REMINDER' && data.reminderId) {
            let action: ReminderAction | null = null;
            if (actionIdentifier === 'COMPLETE') {
                action = 'COMPLETED';
            } else if (actionIdentifier === 'SNOOZE') {
                action = 'SNOOZED';
            } else if (actionIdentifier === 'expo.modules.notifications.actions.DEFAULT') {
                // User just tapped the notification without choosing an action
                // We can treat this as "Dismissed" or just open the app (handled by Expo)
            }

            if (action) {
                handleReminderNotificationAction(data.reminderId as string, action);
            }
        }
    });
};

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
        const anomalies = detectAnomalies(currentMonthTransactions, allTransactions);
        if (anomalies.length === 0) return;

        // Get already notified alerts
        const notifiedRaw = await AsyncStorage.getItem(NOTIFIED_ALERTS_KEY);
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
            // e.g. "SPIKE-Groceries-High" for this month
            // We use the message as part of the key since it contains the category and details
            const anomalyId = `${anomaly.type}-${anomaly.message}`;

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
            await AsyncStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify(newAlerts));
        } else if (hasNewNotifications) {
            await AsyncStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify(notifiedAlerts));
        }

    } catch (error) {
        console.error('Error in checkAndNotifyAnomalies:', error);
    }
};
