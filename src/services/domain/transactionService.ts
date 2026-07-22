import { BigNumber } from 'bignumber.js';
import { Transaction, TransactionReceipt, TransactionType } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, encryptData, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import * as DataCache from '@services/core/dataCache';
import { checkAndNotifyAnomalies } from '@services/background/notificationService';
import { getTransactionsByMonth } from '@utils/financialMetrics';
import { getAllBudgets } from '@services/domain/budgetService';
import { upsertTombstone } from '@services/domain/tombstoneService';

// --- Constants & Helpers ---

const UPSERT_TRANSACTION_QUERY = `
  INSERT OR REPLACE INTO transactions
  (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, linkedTransactionId, investmentId, debtId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// Used only by merge-sync: unlike UPSERT_TRANSACTION_QUERY, this binds createdAt/updatedAt
// explicitly so the incoming record's real timestamps survive the write instead of being
// re-stamped to "now" by SQLite's DEFAULT CURRENT_TIMESTAMP.
const UPSERT_TRANSACTION_FOR_MERGE_QUERY = `
  INSERT OR REPLACE INTO transactions
  (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, linkedTransactionId, investmentId, debtId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPSERT_RECEIPT_QUERY = `
  INSERT OR REPLACE INTO transaction_receipts (transactionId, receiptData) VALUES (?, ?)
`;

/**
 * Encrypts fields and returns the array of values in the correct SQL order
 */
const prepareTransactionValues = async (txn: Transaction) => {
    const encryptedAmount = await encryptField(txn.amount);
    const encryptedNote = txn.note ? await encryptField(txn.note) : null;

    return [
        txn.id,
        txn.date,
        encryptedAmount,
        txn.type,
        txn.category || null,
        txn.subCategory || null,
        encryptedNote,
        txn.creationMethod || null,
        txn.isRecurring ? 1 : 0,
        txn.recurrenceId || null,
        txn.transferAccount || null,
        txn.linkedTransactionId || null,
        txn.investmentId || null,
        txn.debtId || null
    ];
};

// --- Exported Functions ---

export const bulkSaveTransactions = async (transactions: Transaction[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(transactions);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Encrypt current chunk
            const preparedRows = await Promise.all(chunk.map(prepareTransactionValues));

            await db.withTransactionAsync(async () => {
                for (const values of preparedRows) {
                    await db.runAsync(UPSERT_TRANSACTION_QUERY, values);
                }
            });

            // Yield to event loop to allow UI updates (spinner animation)
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        DataCache.invalidateTransactionCache();
    } catch (error) {
        console.error('Error bulk saving transactions:', error);
        throw new Error('Failed to bulk save transactions');
    }
};

export const bulkSaveTransactionReceipts = async (receipts: TransactionReceipt[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const preparedReceipts = await Promise.all(receipts.map(async (receipt) => ({
            id: receipt.transactionId,
            data: await encryptData(receipt.receiptData)
        })));

        await db.withTransactionAsync(async () => {
            for (const receipt of preparedReceipts) {
                await db.runAsync(UPSERT_RECEIPT_QUERY, [receipt.id, receipt.data]);
            }
        });
    } catch (error) {
        console.error('Error bulk saving receipts:', error);
        throw new Error('Failed to bulk save transaction receipts');
    }
};

/**
 * Merge-sync only: upserts transactions while preserving their real createdAt/updatedAt,
 * so a subsequent sync can still tell which side has the newer edit. Not used by normal
 * app saves or by backup restore.
 */
export const bulkUpsertTransactionsForMerge = async (transactions: Transaction[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(transactions);
        const now = new Date().toISOString();

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const preparedRows = await Promise.all(chunk.map(prepareTransactionValues));

            await db.withTransactionAsync(async () => {
                for (let j = 0; j < chunk.length; j++) {
                    const txn = chunk[j];
                    await db.runAsync(UPSERT_TRANSACTION_FOR_MERGE_QUERY, [
                        ...preparedRows[j],
                        txn.createdAt || now,
                        txn.updatedAt || now
                    ]);
                }
            });

            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        DataCache.invalidateTransactionCache();
    } catch (error) {
        console.error('Error merge-upserting transactions:', error);
        throw new Error('Failed to merge-upsert transactions');
    }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
    try {
        const db = await getDatabase();
        const values = await prepareTransactionValues(transaction);
        await db.runAsync(UPSERT_TRANSACTION_QUERY, values);
        DataCache.upsertTransaction(transaction);

        // Check for anomalies (Fire and forget)
        const cached = DataCache.getTransactionCache();
        if (cached?.data) {
            getAllBudgets().then(budgets => {
                checkAndNotifyAnomalies(getTransactionsByMonth(cached.data), cached.data, budgets)
                    .catch((err: any) => console.error('Failed to check anomalies:', err));
            }).catch((err: any) => console.error('Failed to get budgets for anomaly check:', err));
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error('Failed to save transaction');
    }
};

export const saveTransactionWithReceipt = async (transaction: Transaction, receiptData: any): Promise<void> => {
    try {
        const db = await getDatabase();
        const [transactionValues, encryptedReceipt] = await Promise.all([
            prepareTransactionValues(transaction),
            encryptData(receiptData)
        ]);

        await db.withTransactionAsync(async () => {
            await db.runAsync(UPSERT_TRANSACTION_QUERY, transactionValues);
            await db.runAsync(UPSERT_RECEIPT_QUERY, [transaction.id, encryptedReceipt]);
        });

        DataCache.upsertTransaction(transaction);

        // Check for anomalies (Fire and forget)
        const cached = DataCache.getTransactionCache();
        if (cached?.data) {
            getAllBudgets().then(budgets => {
                checkAndNotifyAnomalies(getTransactionsByMonth(cached.data), cached.data, budgets)
                    .catch((err: any) => console.error('Failed to check anomalies:', err));
            }).catch((err: any) => console.error('Failed to get budgets for anomaly check:', err));
        }
    } catch (error) {
        console.error('Error saving transaction with receipt:', error);
        throw new Error('Failed to save transaction with receipt');
    }
};

/**
 * Use non-blocking bulk decryption to prevent Main Thread / UI freezing.
 * This processes records in chunks (e.g., 500) and yields control back to the 
 * JS event loop using setTimeout(0), ensuring the UI remains interactive 
 * (e.g., "Add Transaction" button) even during heavy cryptographic loads.
 */
export const getAllTransactions = async (): Promise<Transaction[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM transactions ORDER BY date DESC');

        // 1. Decrypt the bulk data (Handles the background/non-blocking logic)
        const decryptedRows = await bulkDecryptItems<any>(rows, ['amount', 'note']);

        // 2. Map the results to your specific Transaction type
        // This part is fast because the strings are already decrypted!
        return decryptedRows.map(row => ({
            id: row.id,
            date: row.date,
            amount: new BigNumber(row.amount || 0),
            type: row.type,
            category: row.category,
            subCategory: row.subCategory,
            note: row.note || '',
            creationMethod: row.creationMethod,
            isRecurring: row.isRecurring === 1,
            recurrenceId: row.recurrenceId,
            transferAccount: row.transferAccount,
            linkedTransactionId: row.linkedTransactionId,
            investmentId: row.investmentId,
            debtId: row.debtId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
};

export const getLatestTransactionDate = async (): Promise<string | null> => {
    try {
        const db = await getDatabase();
        // Get the most recent transaction date (created or dated)
        // We use 'createdAt' to detect user interaction "just now", or 'date' if we want business date.
        // User said "during user interaction of add". This implies 'createdAt' is better proxy for "interaction",
        // but 'date' is usually what is stored. Let's use 'createdAt' if available, or 'date'.
        // My schema has 'createdAt'.
        const result = await db.getAllAsync<{ createdAt: string }>('SELECT createdAt FROM transactions ORDER BY createdAt DESC LIMIT 1');
        return result[0]?.createdAt || null;
    } catch (error) {
        console.error('Error getting latest transaction date:', error);
        return null;
    }
};

export const getTransactionCount = async (): Promise<number> => {
    try {
        const db = await getDatabase();
        // Count all transactions
        const result = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions');
        return result[0]?.count || 0;
    } catch (error) {
        console.error('Error counting transactions:', error);
        return 0;
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            // Look up the paired transfer leg before it gets cascaded away, so it can be
            // tombstoned too - otherwise a synced device would never learn it was deleted.
            const pairedLeg = await db.getFirstAsync<{ id: string }>(
                'SELECT id FROM transactions WHERE linkedTransactionId = ?',
                [id]
            );

            await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
            await db.runAsync('DELETE FROM transaction_receipts WHERE transactionId = ?', [id]);
            await db.runAsync('DELETE FROM transactions WHERE linkedTransactionId = ?', [id]);

            await upsertTombstone('transactions', id);
            if (pairedLeg) {
                await upsertTombstone('transactions', pairedLeg.id);
            }
        });

        // Optimistic cache update: remove from cache instead of full invalidation
        DataCache.deleteTransactionFromCache(id);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw new Error('Failed to delete transaction');
    }
};

/**
 * Merge-sync only: deletes a single transaction WITHOUT cascading to its paired transfer
 * leg. Normal deletes (deleteTransaction above) cascade because deleting one leg of a
 * transfer locally should always remove its pair too - there's no conflicting state to
 * consider on a single device. But a merge-driven delete is different: the merge plan
 * already decided each leg's fate independently (e.g. it may have decided to KEEP the
 * other leg because it was edited more recently elsewhere), and cascading here would
 * silently discard that decision and delete a leg the plan explicitly chose to preserve.
 * If the other leg should also go, its own tombstone (if present) drives its own
 * deleteOne call independently - this function only ever touches the exact id it's given.
 */
export const deleteTransactionForMerge = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
            await db.runAsync('DELETE FROM transaction_receipts WHERE transactionId = ?', [id]);
            await upsertTombstone('transactions', id);
        });

        DataCache.deleteTransactionFromCache(id);
    } catch (error) {
        console.error('Error merge-deleting transaction:', error);
        throw new Error('Failed to merge-delete transaction');
    }
};

export const getAllTransactionReceipts = async (): Promise<TransactionReceipt[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM transaction_receipts');

        const decryptedRows = await bulkDecryptItems<any>(rows, ['receiptData']);

        return decryptedRows.map(row => ({
            transactionId: row.transactionId,
            receiptData: row.receiptData,
            createdAt: row.createdAt,
        }));
    } catch (error) {
        console.error('Error getting transaction receipts:', error);
        return [];
    }
};

export const getRecentCategories = async (type: TransactionType, limit: number = 20): Promise<string[]> => {
    try {
        const db = await getDatabase();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString();

        // Query for unique categories used in the last 30 days, ordered by usage frequency (most used first)
        const rows = await db.getAllAsync<{ category: string }>(
            `SELECT category, COUNT(*) as usage_count, MAX(date) as last_used 
             FROM transactions 
             WHERE type = ? AND date >= ? AND category IS NOT NULL AND category != ''
             GROUP BY category 
             ORDER BY usage_count DESC, last_used DESC 
             LIMIT ?`,
            [type, dateStr, limit]
        );

        return rows.map(r => r.category);
    } catch (error) {
        console.error('Error getting recent categories:', error);
        return [];
    }
};

/**
 * Smart caching getter for transactions
 */
export const getCachedTransactions = async (): Promise<Transaction[]> => {
    const cache = DataCache.getTransactionCache();
    if (DataCache.isValid(cache)) {
        return cache!.data;
    }

    const data = await getAllTransactions();

    // Check if cache was updated while we were fetching
    const currentCache = DataCache.getTransactionCache();
    if (DataCache.isValid(currentCache)) {
        return currentCache!.data;
    }

    DataCache.setTransactionCache(data);
    return data;
};