import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { syncMonthlySummaries } from '@services/domain/monthlySummaryService';
import { runAutoBackupIfDue } from '@services/integrations/autoBackupService';

// Renamed from 'BACKGROUND_FETCH_TASK' when migrating from expo-background-fetch to
// expo-background-task. isTaskRegisteredAsync only checks whether a task name is registered
// at all - it has no notion of which library registered it, so reusing the old name meant
// isRegistered was already true for every existing user (registered under the old scheduler),
// and registerTaskAsync (which wires up the new OS-level scheduling mechanism) was silently
// skipped for all of them. A new name forces every existing install to register fresh.
const BACKGROUND_FETCH_TASK = 'BACKGROUND_TASK_V2';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
        await processRecurrenceRules();
        await syncMonthlySummaries();
        // No-ops unless auto-backup is enabled and actually due - see autoBackupService.ts.
        await runAutoBackupIfDue();

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
