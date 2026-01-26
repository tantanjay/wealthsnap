import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { processRecurrenceRules } from '@services/domain/recurrenceService';

const BACKGROUND_FETCH_TASK = 'BACKGROUND_FETCH_TASK';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
        // Process recurring rules - this will internally call saveTransaction -> checkAndNotifyAnomalies
        const processedCount = await processRecurrenceRules();

        // Return result based on whether data was processed
        return processedCount > 0
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;

    } catch (error) {
        console.error('[BackgroundFetch] Task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export const registerBackgroundFetchAsync = async () => {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
                minimumInterval: 60 * 60 * 24, // 1 day
                stopOnTerminate: false, // Continue running after app termination (if supported by OS)
                startOnBoot: true, // Run on device boot (Android)
            });
        }
    } catch (err) {
        console.error('[BackgroundFetch] Register failed:', err);
    }
};
