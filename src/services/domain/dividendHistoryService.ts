import { BigNumber } from 'bignumber.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";
import { PortfolioHolding } from '@services/domain/investmentService';
import { getAsset } from '@services/domain/assetService';
import { fetchExchangeRate } from '@services/integrations/currencyService';
import { decryptData } from '@services/core/encryptionService';
import { ASYNC_KEYS } from '@constants/config';
import { DividendHistory, Investment } from '@types';
import { getLocalDateStamp } from '@utils/financialMetrics';
import { averageUnitsHeld } from '@utils/investmentMetrics';

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

/**
 * Manual entries store exDate as a full ISO timestamp (round-trips safely through local Date
 * getters); AI-fetched entries store a bare YYYY-MM-DD string, which JS parses as UTC midnight -
 * reading that back with local .getMonth()/.getFullYear() then reapplies the device's local
 * offset, shifting the date into the wrong month (or year, for Jan 1st) for negative-UTC-offset
 * timezones. Detect the bare-date case and read its calendar components directly instead.
 */
const getExDateYearMonth = (exDate: string): { year: number; month: number } => {
    const bareDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(exDate);
    if (bareDateMatch) {
        return { year: Number(bareDateMatch[1]), month: Number(bareDateMatch[2]) - 1 };
    }
    const d = new Date(exDate);
    return { year: d.getFullYear(), month: d.getMonth() };
};

// Moves a YYYY-MM-DD stamp by whole years, as a string (Feb 29 lands on Mar 1 in a non-leap year, which is fine here).
const shiftYears = (stamp: string, years: number): string => {
    const [y, m, d] = stamp.split('-').map(Number);
    return getLocalDateStamp(new Date(y + years, m - 1, d));
};

// --- Queries ---

const INSERT_DIVIDEND_HISTORY_QUERY = `
    INSERT OR REPLACE INTO dividend_history (id, symbol, exDate, paymentDate, recordDate, amount, type, status, source)
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
// `id` is optional; AI fetches pass a deterministic one so two concurrent fetches collapse into one row.
export const addDividendHistory = async (dividend: Omit<DividendHistory, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<void> => {
    try {
        const db = await getDatabase();
        const id = dividend.id || generateUUID();
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
 * Projected dividends for the coming year, by month. `investments` (passed in to avoid importing investmentService)
 * supplies the dated buys and sells that pro-rated assets need.
 */
export const getProjectedDividends = async (holdings: PortfolioHolding[], investments: Investment[] = []): Promise<{ labels: string[], data: { total: number, breakdown: { symbol: string, amount: number }[] }[] }> => {
    try {
        const db = await getDatabase();

        // Initialize monthly aggregators (Jan-Dec)
        const monthlyData = Array.from({ length: 12 }, () => ({ total: 0, breakdown: [] as { symbol: string, amount: number }[] }));
        const today = getLocalDateStamp(new Date());

        for (const holding of holdings) {
            const history = await db.getAllAsync<any>(GET_DIVIDEND_HISTORY_BY_SYMBOL_QUERY, [holding.symbol]);
            const conversionRate = await getDividendConversionRate(holding.symbol);
            const asset = await getAsset(holding.symbol);
            const proRated = asset?.dividendBasis === 'PRO_RATED';
            const trades = proRated
                ? investments
                    .filter(inv => inv.symbol === holding.symbol && (inv.action === 'BUY' || inv.action === 'SELL'))
                    .map(inv => ({ date: getLocalDateStamp(new Date(inv.date)), units: (inv.action === 'BUY' ? 1 : -1) * new BigNumber(inv.quantity).toNumber() }))
                : [];
            // Pro-rated: a payout covers the year before it, so the next one (a year after a past ex-date) pays on the
            // units held through that year, assuming no more buys or sells. Per share: every unit held now.
            const unitsFor = (exDate: string) => {
                if (!proRated) return holding.shares;
                const payout = exDate > today ? exDate : shiftYears(exDate, 1);
                return averageUnitsHeld(trades, shiftYears(payout, -1), payout, asset?.proRateBy === 'DAILY' ? 'DAILY' : 'MONTHLY');
            };

            // Only regular cash dividends repeat as cash: specials are one-offs, stock and property dividends pay in kind.
            const regular = history.filter(d => d.type === 'CASH').map(d => ({ date: String(d.exDate).slice(0, 10), exDate: d.exDate, amount: d.amount }));
            if (regular.length === 0) continue;

            // One year of payouts, ending today or at an already-declared later one. Each payout counts once, in its own
            // month, so a dividend paid a few days later than last year (Apr 30 → May 4) isn't counted in both months.
            const latest = regular.reduce((max, d) => (d.date > max ? d.date : max), today);
            const windowStart = shiftYears(latest, -1);
            const perMonth = Array.from({ length: 12 }, () => new BigNumber(0));
            for (const d of regular) {
                if (d.date <= windowStart || d.date > latest) continue;
                const { month } = getExDateYearMonth(d.exDate);
                perMonth[month] = perMonth[month].plus(new BigNumber(d.amount).times(conversionRate).times(unitsFor(d.date)));
            }

            perMonth.forEach((total, m) => {
                if (!total.isGreaterThan(0)) return;
                const amount = total.toNumber();
                monthlyData[m].total += amount;
                monthlyData[m].breakdown.push({ symbol: holding.symbol, amount });
            });
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
            const events = rows.map(r => {
                const { year, month } = getExDateYearMonth(r.exDate);
                return {
                    month,
                    year,
                    symbol: r.symbol,
                    amount: new BigNumber(r.amount).times(conversionRate).toNumber(),
                    paymentDate: r.paymentDate,
                    exDate: r.exDate,
                    status: r.status
                };
            });

            // For each month, show every event (not just the first found) - a symbol can pay
            // more than once in the same month (a regular + special dividend, for instance).
            for (let m = 0; m < 12; m++) {
                // 1. Try events in the target year
                let monthEvents = events.filter(e => e.month === m && e.year === year);

                // 2. If none, fallback to the previous year (to show the "usual" schedule)
                if (monthEvents.length === 0) {
                    monthEvents = events.filter(e => e.month === m && e.year === year - 1);
                }

                calendar[m].push(...monthEvents);
            }
        }

        return calendar;
    } catch (error) {
        console.error('Error fetching dividend calendar:', error);
        return {};
    }
};

