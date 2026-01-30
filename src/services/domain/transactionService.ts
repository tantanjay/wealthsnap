import { BigNumber } from 'bignumber.js';
import { Transaction, TransactionReceipt } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, encryptData, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import * as DataCache from '@services/core/dataCache';

interface PreparedTransaction extends Transaction {
    encryptedAmount: string | null;
    encryptedNote: string | null;
}

// --- Constants & Helpers ---

const UPSERT_TRANSACTION_QUERY = `
  INSERT OR REPLACE INTO transactions 
  (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, transferRelatedId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        txn.transferRelatedId || null
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

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
    try {
        const db = await getDatabase();
        const values = await prepareTransactionValues(transaction);
        await db.runAsync(UPSERT_TRANSACTION_QUERY, values);
        DataCache.upsertTransaction(transaction);
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
            transferRelatedId: row.transferRelatedId,
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