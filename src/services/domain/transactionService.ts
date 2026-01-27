import BigNumber from 'bignumber.js';
import { Transaction } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, decryptField, encryptData, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import * as DataCache from '@services/core/dataCache';

interface PreparedTransaction extends Transaction {
    encryptedAmount: string | null;
    encryptedNote: string | null;
}

export const bulkSaveTransactions = async (transactions: Transaction[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(transactions, 100);
        const preparedData: PreparedTransaction[] = [];

        for (const chunk of chunks) {
            const processedChunk = await Promise.all(chunk.map(async (txn) => {
                const encryptedAmount = await encryptField(txn.amount);
                const encryptedNote = txn.note ? await encryptField(txn.note) : null;

                return {
                    ...txn,
                    encryptedAmount,
                    encryptedNote
                };
            }));
            preparedData.push(...processedChunk);
        }

        await db.withTransactionAsync(async () => {
            const query = `INSERT OR REPLACE INTO transactions 
                           (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            for (const txn of preparedData) {
                await db.runAsync(query, [
                    txn.id,
                    txn.date,
                    txn.encryptedAmount,
                    txn.type,
                    txn.category || null,
                    txn.subCategory || null,
                    txn.encryptedNote,
                    txn.creationMethod || null,
                    txn.isRecurring ? 1 : 0,
                    txn.recurrenceId || null
                ]);
            }
        });

        DataCache.invalidateTransactionCache();
    } catch (error) {
        console.error('Error bulk saving transactions:', error);
        throw new Error('Failed to bulk save transactions');
    }
};

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
    try {
        const db = await getDatabase();

        const encryptedAmount = await encryptField(transaction.amount);
        const encryptedNote = transaction.note ? await encryptField(transaction.note) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO transactions 
             (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction.id,
                transaction.date,
                encryptedAmount,
                transaction.type,
                transaction.category || null,
                transaction.subCategory || null,
                encryptedNote,
                transaction.creationMethod || null,
                transaction.isRecurring ? 1 : 0,
                transaction.recurrenceId || null
            ]
        );

        // Optimistic cache update: check if it's a new or existing transaction
        const cache = DataCache.getTransactionCache();
        if (cache) {
            const existsInCache = cache.data.some(t => t.id === transaction.id);
            if (existsInCache) {
                DataCache.updateTransactionInCache(transaction);
            } else {
                DataCache.addTransactionToCache(transaction);
            }
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error('Failed to save transaction');
    }
};

export const saveTransactionWithReceipt = async (transaction: Transaction, receiptData: any): Promise<void> => {
    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            // 1. Save Transaction (Duplicate logic to ensure atomicity within this transaction block)
            // Or reuse saveTransaction if we can guarantee transaction context? 
            // SQLite `runAsync` usually auto-commits if not in `withTransactionAsync`.
            // Let's replicate logic locally to be safe inside `withTransactionAsync`.

            // Encrypt sensitive fields
            const encryptedAmount = await encryptField(transaction.amount);
            const encryptedNote = transaction.note ? await encryptField(transaction.note) : null;

            await db.runAsync(
                `INSERT OR REPLACE INTO transactions 
                 (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.id,
                    transaction.date,
                    encryptedAmount,
                    transaction.type,
                    transaction.category || null,
                    transaction.subCategory || null,
                    encryptedNote,
                    transaction.creationMethod || null,
                    transaction.isRecurring ? 1 : 0,
                    transaction.recurrenceId || null
                ]
            );

            // 2. Save Encrypted Receipt
            const encryptedReceipt = await encryptData(receiptData);
            await db.runAsync(
                `INSERT OR REPLACE INTO transaction_receipts (transactionId, receiptData) VALUES (?, ?)`,
                [transaction.id, encryptedReceipt]
            );
        });

        // Optimistic cache update: check if it's a new or existing transaction
        const cache = DataCache.getTransactionCache();
        if (cache) {
            const existsInCache = cache.data.some(t => t.id === transaction.id);
            if (existsInCache) {
                DataCache.updateTransactionInCache(transaction);
            } else {
                DataCache.addTransactionToCache(transaction);
            }
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
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
        // Optimistic cache update: remove from cache instead of full invalidation
        DataCache.deleteTransactionFromCache(id);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw new Error('Failed to delete transaction');
    }
};