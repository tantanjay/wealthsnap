import { RecurrenceRule, Transaction, RecurrenceFrequency } from '../types';
import { getAllRecurrenceRules, saveRecurrenceRule, saveTransaction } from './storageService';

const calculateNextDueDate = (currentDate: Date, frequency: RecurrenceFrequency): Date => {
    const nextDate = new Date(currentDate);
    switch (frequency) {
        case 'DAILY':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'WEEKLY':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'SEMI_MONTHLY':
            nextDate.setDate(nextDate.getDate() + 15);
            break;
        case 'MONTHLY':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'QUARTERLY':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'YEARLY':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }
    return nextDate;
};

export const processRecurrenceRules = async (): Promise<number> => {
    try {
        const rules = await getAllRecurrenceRules();
        const now = new Date();
        let processedCount = 0;

        for (const rule of rules) {
            if (!rule.isActive) continue;

            let nextDueDate = new Date(rule.nextDueDate);
            const endDate = rule.endDate ? new Date(rule.endDate) : null;
            let ruleUpdated = false;

            // While the due date is in the past (including today), generate transactions
            // This 'catching up' logic ensures we don't miss payments if the app wasn't opened for a while.
            // Safety limit: only process up to 1 year of missed transactions to prevent infinite loops if data is corrupted
            let safetyCounter = 0;

            while (nextDueDate <= now && safetyCounter < 365) {
                if (endDate && nextDueDate > endDate) break;

                const newTransaction: Transaction = {
                    ...rule.transactionTemplate,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // Unique ID
                    date: nextDueDate.toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isRecurring: true,
                    recurrenceId: rule.id,
                    creationMethod: 'RECURRENCE',
                };

                await saveTransaction(newTransaction);

                // Calculate next date
                nextDueDate = calculateNextDueDate(nextDueDate, rule.frequency);
                ruleUpdated = true;
                safetyCounter++;
                processedCount++;
            }

            if (ruleUpdated) {
                const updatedRule: RecurrenceRule = {
                    ...rule,
                    nextDueDate: nextDueDate.toISOString(),
                };
                await saveRecurrenceRule(updatedRule);
            }
        }

        return processedCount;

    } catch (error) {
        console.error('Error processing recurrence rules:', error);
        return 0;
    }
};
