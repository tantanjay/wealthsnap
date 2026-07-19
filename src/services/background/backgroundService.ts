import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { syncMonthlySummaries } from '@services/domain/monthlySummaryService';

const BACKGROUND_FETCH_TASK = 'BACKGROUND_FETCH_TASK';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
        await processRecurrenceRules();
        await syncMonthlySummaries();

        return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
        console.error('[BackgroundTask] Task failed:', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

export const registerBackgroundFetchAsync = async () => {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
        if (!isRegistered) {
            await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
                minimumInterval: 1440, // 1 day in minutes
            });
        }
    } catch (err) {
        console.error('[BackgroundTask] Register failed:', err);
    }
};
