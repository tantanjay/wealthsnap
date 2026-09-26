import { BigNumber } from 'bignumber.js';
import { SavingsGoal, Transaction, RecurrenceFrequency, RecurrenceRule } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { encryptField, bulkDecryptItems } from '@services/core/encryptionService';
import { chunkArray } from '@utils/index';
import { upsertTombstone } from '@services/domain/tombstoneService';
import { generateUUID } from '@utils/uuid';
import { saveTransaction } from '@services/domain/transactionService';
import { saveRecurrenceRule, deleteRecurrenceRule } from '@services/domain/recurrenceService';
import { calculateGoalBalance } from '@utils/savingsGoalMetrics';
import { checkAndNotifyGoalReached } from '@services/background/notificationService';

// --- Constants & Helpers ---

const UPSERT_SAVINGS_GOAL_QUERY = `
  INSERT OR REPLACE INTO savings_goals
  (id, name, targetAmount, recurringAmount, frequency, category, subCategory, isPaused, recurrenceId, currency, notes, goalReachedNotifiedAt, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Encrypts fields and returns the array of values in the correct SQL order.
 * Encrypted: name, targetAmount, recurringAmount, notes (mirrors debtService's treatment
 * of name/monetary/notes fields). category/subCategory stay plaintext, same as
 * transactions.category - they're labels, not sensitive free-text amounts.
 */
const prepareSavingsGoalValues = async (goal: SavingsGoal) => {
    const now = new Date().toISOString();

    const encryptedName = await encryptField(goal.name);
    const encryptedTarget = await encryptField(goal.targetAmount);
    const encryptedRecurring = goal.recurringAmount ? await encryptField(goal.recurringAmount) : null;
    const encryptedNotes = goal.notes ? await encryptField(goal.notes) : null;

    return [
        goal.id,
        encryptedName,
        encryptedTarget,
        encryptedRecurring,
        goal.frequency || null,
        goal.category || null,
        goal.subCategory || null,
        goal.isPaused ? 1 : 0,
        goal.recurrenceId || null,
        goal.currency || 'PHP',
        encryptedNotes,
        goal.goalReachedNotifiedAt || null,
        // Mirrors debtService's fallback: normal app saves always supply these, but
        // bulkSaveSavingsGoals is also used by merge-sync ingesting a peer's JSON where a
        // malformed record could omit them.
        goal.createdAt || now,
        goal.updatedAt || now
    ];
};

// --- Exported Functions ---

export const saveSavingsGoal = async (goal: SavingsGoal): Promise<void> => {
    try {
        const db = await getDatabase();
        const values = await prepareSavingsGoalValues(goal);
        await db.runAsync(UPSERT_SAVINGS_GOAL_QUERY, values);
    } catch (error) {
        console.error('Error saving savings goal:', error);
        throw new Error('Failed to save savings goal');
    }
};

export const getAllSavingsGoals = async (): Promise<SavingsGoal[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM savings_goals');

        // Decrypt columns (name is ciphertext, so sorting has to happen after decryption)
        const encryptedColumns = ['name', 'targetAmount', 'recurringAmount', 'notes'];
        const decryptedRows = await bulkDecryptItems<any>(rows, encryptedColumns);

        const goals = decryptedRows.map(row => ({
            id: row.id,
            name: row.name,
            targetAmount: new BigNumber(row.targetAmount || 0),
            recurringAmount: row.recurringAmount ? new BigNumber(row.recurringAmount) : undefined,
            frequency: row.frequency as RecurrenceFrequency | undefined,
            category: row.category,
            subCategory: row.subCategory,
            isPaused: row.isPaused === 1,
            recurrenceId: row.recurrenceId,
            currency: row.currency,
            notes: row.notes,
            goalReachedNotifiedAt: row.goalReachedNotifiedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

        return goals.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('Error getting savings goals:', error);
        return [];
    }
};

/**
 * Deletes the goal row only - does not touch `transactions`. Callers that need the
 * "balance sweep back to cash" behavior (deleting a goal with money still in it) should
 * call deleteGoalWithSweep instead, which writes the sweep transaction first.
 */
export const deleteSavingsGoal = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
            // Tombstone type must match the SYNC_ENTITY_REGISTRY/ENTITY_REGISTRY key
            // ('savingsGoals', camelCase) - NOT the SQL table name. Every other entity
            // follows this same convention (e.g. 'recurrenceRules', not 'recurrence_rules');
            // getTombstonesForTypes(SYNC_ENTITY_KEYS) in syncService.ts looks up by registry
            // key, so a mismatched type here would silently stop this deletion from ever
            // propagating to another device during merge sync.
            await upsertTombstone('savingsGoals', id);
        });
    } catch (error) {
        console.error('Error deleting savings goal:', error);
        throw new Error('Failed to delete savings goal');
    }
};

export const bulkSaveSavingsGoals = async (goals: SavingsGoal[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(goals);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const preparedRows = await Promise.all(chunk.map(prepareSavingsGoalValues));

            await db.withTransactionAsync(async () => {
                for (const values of preparedRows) {
                    await db.runAsync(UPSERT_SAVINGS_GOAL_QUERY, values);
                }
            });

            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    } catch (error) {
        console.error('Error bulk saving savings goals:', error);
        throw new Error('Failed to bulk save savings goals');
    }
};

// --- Goal actions (contribution, withdrawal, sweep, pause) ---
// These write plain tagged transactions - savingsGoalId is a dumb tag column, exactly
// like investmentId/debtId, so all entity-specific logic lives here rather than in
// transactionService.ts.

/**
 * Manual top-up or initial funding: one TRANSFER_OUT tagged with the goal's id, followed by
 * the goal-reached check for just this one goal.
 */
export const contributeToGoal = async (
    goal: SavingsGoal,
    amount: BigNumber,
    subCategory: 'CONTRIBUTION' | 'INITIAL_FUNDING',
    existingTransactions: Transaction[]
): Promise<void> => {
    const now = new Date().toISOString();

    const contribution: Transaction = {
        id: generateUUID(),
        type: 'TRANSFER_OUT',
        amount,
        category: goal.category,
        subCategory,
        date: now,
        isRecurring: false,
        transferAccount: 'SAVINGS_GOAL',
        savingsGoalId: goal.id,
        createdAt: now,
        updatedAt: now,
    };
    await saveTransaction(contribution);

    const balanceAfter = calculateGoalBalance(goal, existingTransactions).plus(amount);
    const notifiedAt = await checkAndNotifyGoalReached(goal, balanceAfter);
    if (notifiedAt) {
        await saveSavingsGoal({ ...goal, goalReachedNotifiedAt: notifiedAt, updatedAt: new Date().toISOString() });
    }
};

/**
 * Goal-reached sweep across every goal, run after anything that might have moved several
 * goals' balances at once without going through contributeToGoal directly - specifically,
 * the recurring auto-contribution engine (processRecurrenceRules), which can generate
 * several goals' contributions (and even several catch-up occurrences for one goal) in a
 * single pass with no per-transaction hook of its own. Self-contained (fetches goals itself)
 * so callers just need the current transaction list. Safe to call liberally - a goal that's
 * already notified or not yet at target is a no-op.
 */
export const checkGoalReachedNotifications = async (transactions: Transaction[]): Promise<void> => {
    const goals = await getAllSavingsGoals();
    for (const goal of goals) {
        if (goal.goalReachedNotifiedAt) continue;
        const balance = calculateGoalBalance(goal, transactions);
        const notifiedAt = await checkAndNotifyGoalReached(goal, balance);
        if (notifiedAt) {
            await saveSavingsGoal({ ...goal, goalReachedNotifiedAt: notifiedAt, updatedAt: new Date().toISOString() });
        }
    }
};

/**
 * Emergency withdrawal to cash: one TRANSFER_IN tagged WITHDRAWAL. Caller is responsible
 * for capping `amount` at the goal's current balance (goals can't go negative).
 */
export const withdrawFromGoal = async (goal: SavingsGoal, amount: BigNumber): Promise<void> => {
    const now = new Date().toISOString();
    const withdrawal: Transaction = {
        id: generateUUID(),
        type: 'TRANSFER_IN',
        amount,
        category: goal.category,
        subCategory: 'WITHDRAWAL',
        date: now,
        isRecurring: false,
        transferAccount: 'SAVINGS_GOAL',
        savingsGoalId: goal.id,
        createdAt: now,
        updatedAt: now,
    };
    await saveTransaction(withdrawal);
};

/**
 * Deletes a goal, sweeping any remaining balance back to cash first via a TRANSFER_IN
 * (goals can't go negative, so there's never a shortfall to absorb the other way).
 * Also deletes the linked recurrence rule, if any, so it doesn't keep firing against a
 * goal id that no longer exists.
 */
export const deleteGoalWithSweep = async (goal: SavingsGoal, transactions: Transaction[]): Promise<void> => {
    const balance = calculateGoalBalance(goal, transactions);
    if (balance.isGreaterThan(0)) {
        const now = new Date().toISOString();
        const sweep: Transaction = {
            id: generateUUID(),
            type: 'TRANSFER_IN',
            amount: balance,
            category: goal.category,
            subCategory: 'SWEEP',
            date: now,
            isRecurring: false,
            transferAccount: 'SAVINGS_GOAL',
            savingsGoalId: goal.id,
            createdAt: now,
            updatedAt: now,
        };
        await saveTransaction(sweep);
    }

    if (goal.recurrenceId) {
        await deleteRecurrenceRule(goal.recurrenceId);
    }
    await deleteSavingsGoal(goal.id);
};

/**
 * Flips isPaused and, if a recurring auto-contribution rule exists, its isActive flag in
 * the same call - keeps the two in lockstep so they can never drift (see the "Manage
 * Recurring Rules" desync risk this was designed to avoid). Manual top-ups are never
 * gated by isPaused - only the auto-contribution schedule is.
 */
export const toggleGoalPause = async (goal: SavingsGoal, allRules: RecurrenceRule[]): Promise<SavingsGoal> => {
    const updated: SavingsGoal = { ...goal, isPaused: !goal.isPaused, updatedAt: new Date().toISOString() };
    await saveSavingsGoal(updated);

    if (goal.recurrenceId) {
        const rule = allRules.find(r => r.id === goal.recurrenceId);
        if (rule) {
            await saveRecurrenceRule({ ...rule, isActive: !updated.isPaused, updatedAt: new Date().toISOString() });
        }
    }

    return updated;
};
