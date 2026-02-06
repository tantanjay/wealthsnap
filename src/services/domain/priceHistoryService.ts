import { BigNumber } from 'bignumber.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";
import { PriceHistory } from '@types';
import { ASYNC_KEYS } from '@constants/config';
import { decryptData } from '@services/core/encryptionService';

// --- Constants ---

const UPSERT_PRICE_HISTORY_QUERY = `
  INSERT OR REPLACE INTO price_history 
  (id, symbol, price, high, low, volume, timestamp, source, currency)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// --- Helper Functions ---

/**
 * Helper to get user's default currency without importing storageService (circular dep prevention)
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

// --- Exported Functions ---

/**
 * Bulk save price histories (for restore)
 */
export const bulkSavePriceHistories = async (priceHistories: PriceHistory[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const history of priceHistories) {
                await db.runAsync(UPSERT_PRICE_HISTORY_QUERY, [
                    history.id || generateUUID(),
                    history.symbol,
                    new BigNumber(history.price).toString(),
                    history.high ? new BigNumber(history.high).toString() : null,
                    history.low ? new BigNumber(history.low).toString() : null,
                    history.volume ? new BigNumber(history.volume).toString() : null,
                    history.timestamp,
                    history.source || 'MANUAL',
                    history.currency || 'PHP' // Fallback if bulk data is missing currency
                ]);
            }
        });
    } catch (error) {
        console.error('Error bulk saving price histories:', error);
        throw error;
    }
};

/**
 * Gets the latest price entry for each requested symbol.
 */
export const getLatestPrices = async (symbols: string[]): Promise<Record<string, PriceHistory>> => {
    try {
        if (!symbols.length) return {};

        const db = await getDatabase();
        // Create placeholders for the IN clause
        const placeholders = symbols.map(() => '?').join(',');

        // Query to get the latest price for each symbol
        // We group by symbol and select the one with MAX timestamp
        const query = `
            SELECT ph.*
            FROM price_history ph
            INNER JOIN (
                SELECT symbol, MAX(timestamp) as max_ts
                FROM price_history
                WHERE symbol IN (${placeholders})
                GROUP BY symbol
            ) latest ON ph.symbol = latest.symbol AND ph.timestamp = latest.max_ts
        `;

        const rows = await db.getAllAsync<any>(query, symbols);

        const result: Record<string, PriceHistory> = {};
        rows.forEach(row => {
            result[row.symbol] = {
                id: row.id,
                symbol: row.symbol,
                price: new BigNumber(row.price),
                high: row.high ? new BigNumber(row.high) : undefined,
                low: row.low ? new BigNumber(row.low) : undefined,
                volume: row.volume ? new BigNumber(row.volume) : undefined,
                timestamp: row.timestamp,
                source: row.source,
                currency: row.currency || 'PHP',
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        });

        return result;
    } catch (error) {
        console.error('Error getting latest prices:', error);
        return {};
    }
};

/**
 * Adds a new price history entry.
 */
export const addPriceHistory = async (
    symbol: string,
    price: BigNumber | number | string,
    metadata?: { high?: BigNumber | number, low?: BigNumber | number, volume?: BigNumber | number, source?: string, timestamp?: string, currency?: string }
): Promise<void> => {
    try {
        const db = await getDatabase();
        const id = generateUUID();
        const timestamp = metadata?.timestamp || new Date().toISOString();
        const currency = metadata?.currency || await getDefaultCurrency();

        await db.runAsync(UPSERT_PRICE_HISTORY_QUERY, [
            id,
            symbol,
            new BigNumber(price).toString(),
            metadata?.high ? new BigNumber(metadata.high).toString() : null,
            metadata?.low ? new BigNumber(metadata.low).toString() : null,
            metadata?.volume ? new BigNumber(metadata.volume).toString() : null,
            timestamp,
            metadata?.source || 'MANUAL',
            currency
        ]);
    } catch (error) {
        console.error('Error adding price history:', error);
        throw new Error('Failed to add price history');
    }
};

/**
 * Updates an existing price history entry.
 */
export const updatePriceHistory = async (
    id: string,
    price: BigNumber | number | string,
    metadata?: { high?: BigNumber | number, low?: BigNumber | number, volume?: BigNumber | number, source?: string, timestamp?: string, currency?: string }
): Promise<void> => {
    try {
        const db = await getDatabase();

        let query = `
            UPDATE price_history 
            SET price = ?, high = ?, low = ?, volume = ?, timestamp = ?, source = ?, updatedAt = CURRENT_TIMESTAMP
        `;
        const params: any[] = [
            new BigNumber(price).toString(),
            metadata?.high ? new BigNumber(metadata.high).toString() : null,
            metadata?.low ? new BigNumber(metadata.low).toString() : null,
            metadata?.volume ? new BigNumber(metadata.volume).toString() : null,
            metadata?.timestamp || new Date().toISOString(),
            metadata?.source || 'MANUAL'
        ];

        if (metadata?.currency) {
            query += `, currency = ?`;
            params.push(metadata.currency);
        }

        query += ` WHERE id = ?`;
        params.push(id);

        await db.runAsync(query, params);
    } catch (error) {
        console.error('Error updating price history:', error);
        throw new Error('Failed to update price history');
    }
};

export const getAllPriceHistories = async (): Promise<PriceHistory[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(`SELECT * FROM price_history ORDER BY date(timestamp) DESC`);
        return rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            price: new BigNumber(row.price),
            high: row.high ? new BigNumber(row.high) : undefined,
            low: row.low ? new BigNumber(row.low) : undefined,
            volume: row.volume ? new BigNumber(row.volume) : undefined,
            timestamp: row.timestamp,
            source: row.source,
            currency: row.currency || 'PHP'
        }));
    } catch (error) {
        console.error('Error getting all price histories:', error);
        return [];
    }
};

/**
 * Get price history for a symbol, optionally filtered by date range.
 */
export const getPriceHistory = async (
    symbol: string,
    startDate?: string,
    endDate?: string
): Promise<PriceHistory[]> => {
    try {
        const db = await getDatabase();
        let query = `SELECT * FROM price_history WHERE symbol = ?`;
        const params: any[] = [symbol];

        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND timestamp <= ?`;
            params.push(endDate);
        }

        query += ` ORDER BY timestamp DESC`;

        const rows = await db.getAllAsync<any>(query, params);

        return rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            price: new BigNumber(row.price),
            high: row.high ? new BigNumber(row.high) : undefined,
            low: row.low ? new BigNumber(row.low) : undefined,
            volume: row.volume ? new BigNumber(row.volume) : undefined,
            timestamp: row.timestamp,
            source: row.source,
            currency: row.currency || 'PHP'
        }));
    } catch (error) {
        console.error('Error getting price history:', error);
        return [];
    }
};

/**
 * Get price history for multiple symbols, optionally filtered by date range.
 */
export const getPriceHistoryForSymbols = async (
    symbols: string[],
    startDate?: string,
    endDate?: string
): Promise<PriceHistory[]> => {
    if (!symbols || symbols.length === 0) return [];

    try {
        const db = await getDatabase();

        // Create placeholders (?, ?, ?) for the IN clause
        const placeholders = symbols.map(() => '?').join(', ');

        let query = `SELECT * FROM price_history WHERE symbol IN (${placeholders})`;
        const params: any[] = [...symbols];

        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND timestamp <= ?`;
            params.push(endDate);
        }

        query += ` ORDER BY symbol ASC, timestamp DESC`;

        const rows = await db.getAllAsync<any>(query, params);

        return rows.map(row => ({
            id: row.id,
            symbol: row.symbol,
            price: new BigNumber(row.price),
            high: row.high ? new BigNumber(row.high) : undefined,
            low: row.low ? new BigNumber(row.low) : undefined,
            volume: row.volume ? new BigNumber(row.volume) : undefined,
            timestamp: row.timestamp,
            source: row.source,
            currency: row.currency || 'PHP'
        }));
    } catch (error) {
        console.error('Error getting batch price history:', error);
        return [];
    }
};

export const getPriceHistoryByMonths = async (
    symbols: string[],
    monthsBack: number = 3
): Promise<PriceHistory[]> => {
    const endDate = new Date();
    const startDate = new Date();

    // Subtract months from the current date
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Call your existing SQLite method
    // Converting to ISO string ensures compatibility with SQLite string comparisons
    return await getPriceHistoryForSymbols(
        symbols,
        startDate.toISOString(),
        endDate.toISOString()
    );
};

/**
 * Delete a specific price history entry by ID.
 */
export const deletePriceHistory = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM price_history WHERE id = ?`, [id]);
    } catch (error) {
        console.error('Error deleting price history:', error);
        throw new Error('Failed to delete price history');
    }
};

/**
 * Delete ALL price history for a symbol.
 */
export const deleteAllPriceHistory = async (symbol: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM price_history WHERE symbol = ?`, [symbol]);
    } catch (error) {
        console.error('Error deleting all price history:', error);
        throw new Error('Failed to delete all price history');
    }
};
