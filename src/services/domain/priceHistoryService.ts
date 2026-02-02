import { BigNumber } from 'bignumber.js';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";
import { PriceHistory } from '@types';

// --- Constants ---

const UPSERT_PRICE_HISTORY_QUERY = `
  INSERT OR REPLACE INTO price_history 
  (id, symbol, price, high, low, volume, timestamp, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

// --- Exported Functions ---

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
    metadata?: { high?: BigNumber | number, low?: BigNumber | number, volume?: BigNumber | number, source?: string, timestamp?: string }
): Promise<void> => {
    try {
        const db = await getDatabase();
        const id = generateUUID();
        const timestamp = metadata?.timestamp || new Date().toISOString();

        await db.runAsync(UPSERT_PRICE_HISTORY_QUERY, [
            id,
            symbol,
            new BigNumber(price).toString(),
            metadata?.high ? new BigNumber(metadata.high).toString() : null,
            metadata?.low ? new BigNumber(metadata.low).toString() : null,
            metadata?.volume ? new BigNumber(metadata.volume).toString() : null,
            timestamp,
            metadata?.source || 'MANUAL'
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
    metadata?: { high?: BigNumber | number, low?: BigNumber | number, volume?: BigNumber | number, source?: string, timestamp?: string }
): Promise<void> => {
    try {
        const db = await getDatabase();

        // We need to fetch existing to preserve fields if not updated? 
        // For simplicity, we assume we want to update the fields provided.
        // But since we are using UPSERT or simple UPDATE, let's use UPDATE.

        const query = `
            UPDATE price_history 
            SET price = ?, high = ?, low = ?, volume = ?, timestamp = ?, source = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.runAsync(query, [
            new BigNumber(price).toString(),
            metadata?.high ? new BigNumber(metadata.high).toString() : null,
            metadata?.low ? new BigNumber(metadata.low).toString() : null,
            metadata?.volume ? new BigNumber(metadata.volume).toString() : null,
            metadata?.timestamp || new Date().toISOString(), // Fallback shouldn't happen on update typically, but safe
            metadata?.source || 'MANUAL',
            id
        ]);
    } catch (error) {
        console.error('Error updating price history:', error);
        throw new Error('Failed to update price history');
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
            source: row.source
        }));
    } catch (error) {
        console.error('Error getting price history:', error);
        return [];
    }
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
