import { BigNumber } from 'bignumber.js';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";

export interface DividendHistory {
    id: string;
    symbol: string;
    exDate: string;
    paymentDate?: string;
    recordDate?: string;
    amount: BigNumber;
    type: 'CASH' | 'STOCK' | 'SPECIAL' | 'PROPERTY';
    status: 'DECLARED' | 'PAID' | 'PROJECTED';
    createdAt?: string;
    updatedAt?: string;
}

// --- Queries ---

const INSERT_DIVIDEND_HISTORY_QUERY = `
    INSERT INTO dividend_history (id, symbol, exDate, paymentDate, recordDate, amount, type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_DIVIDEND_HISTORY_QUERY = `
    UPDATE dividend_history 
    SET symbol = ?, exDate = ?, paymentDate = ?, recordDate = ?, amount = ?, type = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
`;

const GET_DIVIDEND_HISTORY_BY_SYMBOL_QUERY = `
    SELECT * FROM dividend_history WHERE symbol = ? ORDER BY exDate DESC
`;

const GET_DIVIDEND_HISTORY_BY_ID_QUERY = `
    SELECT * FROM dividend_history WHERE id = ?
`;

const DELETE_DIVIDEND_HISTORY_QUERY = `
    DELETE FROM dividend_history WHERE id = ?
`;

/**
 * Add a new dividend history entry
 */
export const addDividendHistory = async (dividend: Omit<DividendHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
        const db = await getDatabase();
        const id = generateUUID();
        await db.runAsync(INSERT_DIVIDEND_HISTORY_QUERY, [
            id,
            dividend.symbol,
            dividend.exDate,
            dividend.paymentDate || null,
            dividend.recordDate || null,
            dividend.amount.toString(),
            dividend.type,
            dividend.status
        ]);
    } catch (error) {
        console.error('Error adding dividend history:', error);
        throw new Error('Failed to add dividend history');
    }
};

/**
 * Update an existing dividend history entry
 */
export const updateDividendHistory = async (id: string, dividend: Partial<Omit<DividendHistory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
        const db = await getDatabase();

        // Fetch existing logic could be here strictly speaking but for simplicity assuming the caller passes full relevant update or we merge if needed.
        // However, standard UPDATE query requires all fields if we write it that way, or we construct it dynamically.
        // Let's stick to a simpler approach: fetch first, merge, then update, or just requiring all fields if standard query used.
        // But for efficient selective update, let's use dynamic query construction or simpler "replace" if we have all data.
        // Actually, let's implement a straightforward update that expects the main fields or we fetch current first.

        const existing = await db.getFirstAsync<any>(GET_DIVIDEND_HISTORY_BY_ID_QUERY, [id]);
        if (!existing) throw new Error('Dividend history not found');

        const merged = {
            ...existing,
            ...dividend,
            amount: dividend.amount ? dividend.amount.toString() : existing.amount
        };

        await db.runAsync(UPDATE_DIVIDEND_HISTORY_QUERY, [
            merged.symbol,
            merged.exDate,
            merged.paymentDate,
            merged.recordDate,
            merged.amount,
            merged.type,
            merged.status,
            id
        ]);
    } catch (error) {
        console.error('Error updating dividend history:', error);
        throw new Error('Failed to update dividend history');
    }
};

/**
 * Get dividend history for a symbol
 */
export const getDividendHistory = async (symbol: string): Promise<DividendHistory[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(GET_DIVIDEND_HISTORY_BY_SYMBOL_QUERY, [symbol]);

        return rows.map(row => ({
            ...row,
            amount: new BigNumber(row.amount)
        }));
    } catch (error) {
        console.error('Error fetching dividend history:', error);
        return [];
    }
};

/**
 * Delete a dividend history entry
 */
export const deleteDividendHistory = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(DELETE_DIVIDEND_HISTORY_QUERY, [id]);
    } catch (error) {
        console.error('Error deleting dividend history:', error);
        throw new Error('Failed to delete dividend history');
    }
};
