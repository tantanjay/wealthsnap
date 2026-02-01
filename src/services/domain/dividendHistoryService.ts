import { BigNumber } from 'bignumber.js';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";
import { PortfolioHolding } from './investmentService';

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

/**
 * Calculate projected dividends for the current year based on holdings
 */
export const getProjectedDividends = async (holdings: PortfolioHolding[]): Promise<{ labels: string[], data: number[] }> => {
    try {
        const db = await getDatabase();

        // Initialize monthly aggregators (Jan-Dec)
        const monthlyTycoonAsync = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        for (const holding of holdings) {
            // Get all dividend history for this symbol
            // We get ALL history to be able to project forward if current year is missing, 
            // but for MVP let's stick to matching months in the current year OR 
            // if we want to be smarter: use last year's data projected to this year if this year is missing.
            // Let's implement a "smart projection":
            // 1. Look for confirmed/declared dividends for this year.
            // 2. If a month has no declared dividend, look for a paid dividend from last year in the same month (approx ex-date).

            const history = await db.getAllAsync<any>(GET_DIVIDEND_HISTORY_BY_SYMBOL_QUERY, [holding.symbol]);

            // Map to better objects
            const divEvents = history.map(d => ({
                month: new Date(d.exDate).getMonth(), // 0-11
                year: new Date(d.exDate).getFullYear(),
                amount: new BigNumber(d.amount),
                status: d.status
            }));

            // Group by month to avoid double counting if multiple entries (unlikely for same type but good to be safe)
            // Strategy: For each month 0-11:
            // - Is there an entry for CurrentYear? Use it.
            // - If not, is there an entry for LastYear? Use it as "Projected".

            for (let m = 0; m < 12; m++) {
                // Find event for this month in current year
                const thisYearEvent = divEvents.find(e => e.month === m && e.year === currentYear);

                let dividendAmount = new BigNumber(0);

                if (thisYearEvent) {
                    dividendAmount = thisYearEvent.amount;
                } else {
                    // Fallback to last year
                    const lastYearEvent = divEvents.find(e => e.month === m && e.year === currentYear - 1);
                    if (lastYearEvent) {
                        dividendAmount = lastYearEvent.amount;
                    }
                }

                if (dividendAmount.isGreaterThan(0)) {
                    // Calculate total: dividend per share * number of shares
                    const totalProposed = dividendAmount.times(holding.shares);
                    monthlyTycoonAsync[m] += totalProposed.toNumber();
                }
            }
        }

        return {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            data: monthlyTycoonAsync
        };

    } catch (error) {
        console.error('Error calculating projected dividends:', error);
        return { labels: [], data: [] };
    }
};
