import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { handleReminderNotificationAction } from './reminderService';

// Must match the task name registered in notificationService
export const REMINDER_BACKGROUND_TASK = 'REMINDER_BACKGROUND_TASK';

TaskManager.defineTask(REMINDER_BACKGROUND_TASK, async ({ data, error, executionInfo }) => {
    if (error) {
        console.error('[Background] Task error:', error);
        return;
    }

    if (data) {
        try {
            // @ts-ignore - Triggered by notification response
            const { actionIdentifier, notification } = data;
            const content = notification?.request?.content;
            let notificationData = content?.data;
            const notificationId = notification?.request?.identifier;

            // Handle case where data is serialized in dataString (common in background on Android)
            if (!notificationData && content?.dataString) {
                try {
                    notificationData = JSON.parse(content.dataString);
                } catch (e) {
                    console.error('[Background] Failed to parse dataString:', e);
                }
            }

            if (notificationData?.type === 'REMINDER' && notificationData?.reminderId) {
                if (actionIdentifier === 'COMPLETE') {
                    await handleReminderNotificationAction(notificationData.reminderId, 'COMPLETED');

                    // Dismiss the notification
                    if (notificationId) {
                        await Notifications.dismissNotificationAsync(notificationId);
                    }
                } else if (actionIdentifier === 'SNOOZE') {
                    // Just dismiss the notification, let catch-up handle it later
                    if (notificationId) {
                        await Notifications.dismissNotificationAsync(notificationId);
                    }
                }
            }
        } catch (err) {
            console.error('[Background] Error in REMINDER_BACKGROUND_TASK:', err);
        }
    }
});
