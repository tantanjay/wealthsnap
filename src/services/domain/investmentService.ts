import { BigNumber } from 'bignumber.js';
import { Investment } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import { invalidateInvestmentCache } from "@services/core/dataCache";



// --- Constants & Helpers ---

const UPSERT_INVESTMENT_QUERY = `
  INSERT OR REPLACE INTO investments 
  (id, date, symbol, type, quantity, price, fees, notes, creationMethod, isRecurring, recurrenceId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Encrypts fields and returns the array of values in the correct SQL order
 */
const prepareInvestmentValues = async (inv: Investment) => {
    const [encryptedQty, encryptedPrice, encryptedFees, encryptedNotes] = await Promise.all([
        encryptField(inv.quantity),
        encryptField(inv.price),
        inv.fees ? encryptField(inv.fees) : Promise.resolve(null),
        inv.notes ? encryptField(inv.notes) : Promise.resolve(null)
    ]);

    return [
        inv.id,
        inv.date,
        inv.symbol,
        inv.type,
        encryptedQty,
        encryptedPrice,
        encryptedFees,
        encryptedNotes,
        inv.creationMethod || null,
        inv.isRecurring ? 1 : 0,
        inv.recurrenceId || null
    ];
};

// --- Exported Functions ---

export const bulkSaveInvestments = async (investments: Investment[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(investments);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Encrypt current chunk
            const preparedRows = await Promise.all(chunk.map(prepareInvestmentValues));

            await db.withTransactionAsync(async () => {
                for (const values of preparedRows) {
                    await db.runAsync(UPSERT_INVESTMENT_QUERY, values);
                }
            });

            // Yield to event loop to allow UI updates (spinner animation)
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error bulk saving investments:', error);
        throw new Error('Failed to bulk save investments');
    }
};

export const saveInvestment = async (investment: Investment): Promise<void> => {
    try {
        const db = await getDatabase();
        const values = await prepareInvestmentValues(investment);
        await db.runAsync(UPSERT_INVESTMENT_QUERY, values);
        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error saving investment:', error);
        throw new Error('Failed to save investment');
    }
};

/**
 * Use non-blocking bulk decryption to prevent Main Thread / UI freezing.
 * This processes records in chunks (e.g., 500) and yields control back to the 
 * JS event loop using setTimeout(0), ensuring the UI remains interactive.
 */
export const getAllInvestments = async (): Promise<Investment[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM investments ORDER BY date DESC');

        // 1. Decrypt the bulk data (Handles the background/non-blocking logic)
        // Decrypted fields: quantity, price, fees, notes
        const decryptedRows = await bulkDecryptItems<any>(rows, ['quantity', 'price', 'fees', 'notes']);

        // 2. Map the results to your specific Investment type
        return decryptedRows.map(row => ({
            id: row.id,
            date: row.date,
            symbol: row.symbol,
            type: row.type,
            quantity: new BigNumber(row.quantity || new BigNumber(0)),
            price: new BigNumber(row.price || new BigNumber(0)),
            fees: new BigNumber(row.fees || new BigNumber(0)),
            notes: row.notes || '',
            creationMethod: row.creationMethod,
            isRecurring: row.isRecurring === 1,
            recurrenceId: row.recurrenceId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

    } catch (error) {
        console.error('Error getting investments:', error);
        return [];
    }
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);
        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};