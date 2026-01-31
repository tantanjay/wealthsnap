import { BigNumber } from 'bignumber.js';
import { getDatabase } from "@services/database/databaseService";
import { generateUUID } from "@utils/uuid";

export interface PriceHistory {
    id: string;
    symbol: string;
    price: BigNumber;
    high?: BigNumber;
    low?: BigNumber;
    volume?: BigNumber;
    timestamp: string;
    source?: string;
}

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
                source: row.source
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
