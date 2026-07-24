import { BigNumber } from 'bignumber.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";
import { PortfolioHolding } from '@services/domain/investmentService';
import { getAsset } from '@services/domain/assetService';
import { fetchExchangeRate } from '@services/integrations/currencyService';
import { decryptData } from '@services/core/encryptionService';
import { ASYNC_KEYS } from '@constants/config';
import { DividendHistory } from '@types';
import { getLocalDateStamp } from '@utils/financialMetrics';

/**
 * Helper to get user's default currency without importing storageService (circular dep prevention).
 * Mirrors the same pattern used in priceHistoryService.ts
 */
const getDefaultCurrency = async (): Promise<string> => {
    try {
        const raw = await AsyncStorage.getItem(ASYNC_KEYS.USER_PROFILE);
        if (raw) {
            const decrypted: any = await decryptData(raw);
            if (decrypted && decrypted.currency) {
                return decrypted.currency;
            }
        }
    } catch {
        // ignore
    }
    return 'PHP';
};

/**
 * dividend_history has no currency column - amounts are stored raw in the asset's native
 * currency (both manual entry and the AI fetch save them unconverted). Convert to the user's
 * profile currency here at read time, since callers compare/combine these amounts against
 * profile-currency prices and holdings.
 */
const getDividendConversionRate = async (symbol: string): Promise<BigNumber> => {
    try {
        const [asset, profileCurrency] = await Promise.all([
            getAsset(symbol),
            getDefaultCurrency()
        ]);

        const assetCurrency = asset?.currency;
        if (!assetCurrency || assetCurrency === profileCurrency) return new BigNumber(1);

        const rate = await fetchExchangeRate(assetCurrency, profileCurrency);
        return rate ? new BigNumber(rate) : new BigNumber(1);
    } catch {
        return new BigNumber(1);
    }
};

// --- Queries ---

const INSERT_DIVIDEND_HISTORY_QUERY = `
    INSERT INTO dividend_history (id, symbol, exDate, paymentDate, recordDate, amount, type, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_DIVIDEND_HISTORY_QUERY = `
    UPDATE dividend_history 
    SET symbol = ?, exDate = ?, paymentDate = ?, recordDate = ?, amount = ?, type = ?, status = ?, source = ?, updatedAt = CURRENT_TIMESTAMP
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

const UPSERT_DIVIDEND_HISTORY_QUERY = `
    INSERT OR REPLACE INTO dividend_history (id, symbol, exDate, paymentDate, recordDate, amount, type, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Bulk save dividend histories (for restore)
 */
export const bulkSaveDividendHistories = async (dividendHistories: DividendHistory[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const history of dividendHistories) {
                await db.runAsync(UPSERT_DIVIDEND_HISTORY_QUERY, [
                    history.id || generateUUID(),
                    history.symbol,
                    history.exDate,
                    history.paymentDate || null,
                    history.recordDate || null,
                    new BigNumber(history.amount).toString(),
                    history.type,
                    history.status,
                    history.source || 'MANUAL'
                ]);
            }
        });
    } catch (error) {
        console.error('Error bulk saving dividend histories:', error);
        throw error;
    }
};

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
            dividend.status,
            dividend.source || 'MANUAL'
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
            merged.source,
            id
        ]);
    } catch (error) {
        console.error('Error updating dividend history:', error);
        throw new Error('Failed to update dividend history');
    }
};

export const getAllDividendHistories = async (): Promise<DividendHistory[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(`SELECT * FROM dividend_history ORDER BY date(exDate) DESC`);
        return rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            exDate: row.exDate,
            paymentDate: row.paymentDate,
            recordDate: row.recordDate,
            amount: new BigNumber(row.amount),
            type: row.type,
            status: row.status,
            source: row.source
        }));
    } catch (error) {
        console.error('Error getting all dividend histories:', error);
        return [];
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
 * Delete only auto-fetched (AI_FETCH) dividend history for a symbol.
 */
export const deleteAutoDividendHistory = async (symbol: string): Promise<void> => {
    try {
        const db = await getDatabase();
        // Delete where source is AI_FETCH
        await db.runAsync(`DELETE FROM dividend_history WHERE symbol = ? AND source = 'AI_FETCH'`, [symbol]);
    } catch (error) {
        console.error('Error deleting auto dividend history:', error);
        throw new Error('Failed to delete auto dividend history');
    }
};

/**
 * Calculate projected dividends for the current year based on holdings
 */
export const getProjectedDividends = async (holdings: PortfolioHolding[]): Promise<{ labels: string[], data: { total: number, breakdown: { symbol: string, amount: number }[] }[] }> => {
    try {
        const db = await getDatabase();

        // Initialize monthly aggregators (Jan-Dec)
        const monthlyData = Array.from({ length: 12 }, () => ({ total: 0, breakdown: [] as { symbol: string, amount: number }[] }));
        const currentYear = new Date().getFullYear();

        for (const holding of holdings) {
            const history = await db.getAllAsync<any>(GET_DIVIDEND_HISTORY_BY_SYMBOL_QUERY, [holding.symbol]);
            const conversionRate = await getDividendConversionRate(holding.symbol);

            // Map to better objects
            const divEvents = history.map(d => ({
                month: new Date(d.exDate).getMonth(), // 0-11
                year: new Date(d.exDate).getFullYear(),
                amount: new BigNumber(d.amount).times(conversionRate),
                status: d.status
            }));

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
                    const totalProposed = dividendAmount.times(holding.shares).toNumber();
                    monthlyData[m].total += totalProposed;
                    monthlyData[m].breakdown.push({ symbol: holding.symbol, amount: totalProposed });
                }
            }
        }

        return {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            data: monthlyData
        };

    } catch (error) {
        console.error('Error calculating projected dividends:', error);
        return { labels: [], data: [] };
    }
};

/**
 * Calculate the total dividends paid in the last 12 months for a symbol (Per Share)
 */
export const getAnnualDividend = async (symbol: string): Promise<number> => {
    try {
        const db = await getDatabase();
        // Get dividends from the last year
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const dateStr = getLocalDateStamp(oneYearAgo);

        const query = `
            SELECT amount FROM dividend_history 
            WHERE symbol = ? 
                AND exDate >= ? 
        `;

        const rows = await db.getAllAsync<any>(query, [symbol, dateStr]);

        let total = new BigNumber(0);
        rows.forEach(r => {
            total = total.plus(r.amount);
        });

        const conversionRate = await getDividendConversionRate(symbol);
        return total.times(conversionRate).toNumber();
    } catch (error) {
        console.error(`Error calculating annual dividend per share for ${symbol}:`, error);
        return 0;
    }
};

export interface CalendarEvent {
    symbol: string;
    amount: number;
    paymentDate: string | null;
    exDate: string;
    status: string;
}

/**
 * Get dividend events for the calendar view grouped by month
 */
export const getDividendCalendar = async (holdings: PortfolioHolding[], year: number = new Date().getFullYear()): Promise<Record<number, CalendarEvent[]>> => {
    try {
        const db = await getDatabase();
        const calendar: Record<number, CalendarEvent[]> = {};
        
        // Initialize 0-11
        for (let i = 0; i < 12; i++) {
            calendar[i] = [];
        }

        for (const holding of holdings) {
            // Get all dividend history for this symbol
            const query = `SELECT * FROM dividend_history WHERE symbol = ?`;
            const rows = await db.getAllAsync<any>(query, [holding.symbol]);
            const conversionRate = await getDividendConversionRate(holding.symbol);

            // Map to helper objects
            const events = rows.map(r => ({
                month: new Date(r.exDate).getMonth(),
                year: new Date(r.exDate).getFullYear(),
                symbol: r.symbol,
                amount: new BigNumber(r.amount).times(conversionRate).toNumber(),
                paymentDate: r.paymentDate,
                exDate: r.exDate,
                status: r.status
            }));

            // For each month, find the best event to show
            for (let m = 0; m < 12; m++) {
                // 1. Try to find an event in the target year
                let event = events.find(e => e.month === m && e.year === year);
                
                // 2. If not found, fallback to the previous year (to show the "usual" schedule)
                if (!event) {
                    event = events.find(e => e.month === m && e.year === year - 1);
                }

                if (event) {
                    calendar[m].push(event);
                }
            }
        }

        return calendar;
    } catch (error) {
        console.error('Error fetching dividend calendar:', error);
        return {};
    }
};

