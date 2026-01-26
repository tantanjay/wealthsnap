import { RecurrenceRule, Transaction, RecurrenceFrequency } from '@types';
import { getDatabase } from "@services/database/databaseService";
import { saveTransaction } from '@services/domain/transactionService';
import { decryptField, encryptField } from "@services/core/encryptionService";

// =============================================================================
// DOMAIN LOGIC
// =============================================================================

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
                    note: rule.name || rule.transactionTemplate.note,
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


// =============================================================================
// DATA ACCESS (CRUD)
// =============================================================================

export const bulkSaveRecurrenceRules = async (rules: RecurrenceRule[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const rule of rules) {
                // Encrypt the entire template
                const encryptedTemplate = await encryptField(JSON.stringify(rule.transactionTemplate));

                // Encrypt the name
                const encryptedName = rule.name ? await encryptField(rule.name) : null;

                await db.runAsync(
                    `INSERT OR REPLACE INTO recurrence_rules 
                     (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rule.id,
                        encryptedName,
                        rule.frequency,
                        rule.startDate || null,
                        rule.endDate || null,
                        rule.nextDueDate,
                        encryptedTemplate,
                        rule.isActive ? 1 : 0
                    ]
                );
            }
        });
    } catch (error) {
        console.error('Error bulk saving recurrence rules:', error);
        throw new Error('Failed to bulk save recurrence rules');
    }
};

export const saveRecurrenceRule = async (rule: RecurrenceRule): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt the entire template to protect sensitive fields inside
        const encryptedTemplate = await encryptField(JSON.stringify(rule.transactionTemplate));

        // Encrypt the name
        const encryptedName = rule.name ? await encryptField(rule.name) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO recurrence_rules 
             (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                rule.id,
                encryptedName,
                rule.frequency,
                rule.startDate || null,
                rule.endDate || null,
                rule.nextDueDate,
                encryptedTemplate,
                rule.isActive ? 1 : 0
            ]
        );
    } catch (error) {
        console.error('Error saving recurrence rule:', error);
        throw new Error('Failed to save recurrence rule');
    }
};

export const getAllRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM recurrence_rules');

        const rules = await Promise.all(rows.map(async (row) => {
            let template: any = {};
            try {
                // Try to decrypt first
                const decrypted = await decryptField(row.transactionTemplate);
                template = decrypted ? JSON.parse(decrypted) : {};
            } catch {
                // Fallback for unencrypted data (migration transition)
                try {
                    template = JSON.parse(row.transactionTemplate);
                } catch {
                    console.error('Failed to parse transaction template');
                }
            }

            const decryptedName = await decryptField(row.name);

            return {
                id: row.id,
                name: decryptedName || undefined,
                frequency: row.frequency,
                startDate: row.startDate,
                endDate: row.endDate,
                nextDueDate: row.nextDueDate,
                transactionTemplate: template,
                isActive: row.isActive === 1
            };
        }));

        return rules;
    } catch (error) {
        console.error('Error getting recurrence rules:', error);
        return [];
    }
};

export const deleteRecurrenceRule = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM recurrence_rules WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting recurrence rule:', error);
        throw new Error('Failed to delete recurrence rule');
    }
};