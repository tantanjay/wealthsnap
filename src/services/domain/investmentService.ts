import { BigNumber } from 'bignumber.js';
import { Investment } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import { invalidateInvestmentCache, getInvestmentCache, setInvestmentCache, isValid, getTransactionCache, setTransactionCache } from "@services/core/dataCache";
import { calculatePortfolioMetrics, getAllPortfolioMetrics } from "@utils/investmentMetrics";
import { getLatestPrices } from "./priceHistoryService";
import { getAllTransactions } from "./transactionService";



// --- Constants & Helpers ---

const UPSERT_INVESTMENT_QUERY = `
  INSERT OR REPLACE INTO investments 
  (id, date, symbol, type, action, quantity, price, fees, notes, creationMethod, isRecurring, recurrenceId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        inv.action,
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
            action: row.action,
            quantity: new BigNumber(row.quantity || 0),
            price: new BigNumber(row.price || 0),
            fees: new BigNumber(row.fees || 0),
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

/**
 * Get investments with caching strategy
 */
export const getCachedInvestments = async (forceRefresh = false): Promise<Investment[]> => {
    const cache = getInvestmentCache();
    if (!forceRefresh && isValid(cache)) {
        return cache!.data;
    }

    const investments = await getAllInvestments();

    // Safety check just in case
    if (investments) {
        setInvestmentCache(investments);
        return investments;
    }
    return [];
};

/**
 * Calculate aggregated portfolio statistics
 */
export const getPortfolioStats = async () => {
    // 1. Get Cached Data (Investments & Transactions)
    const investments = await getCachedInvestments();

    // We need transactions to get accurate Realized P/L (same source of truth as Home Screen)
    // We'll mimic 'getCachedTransactions' logic here locally to avoid circular dependency
    // if we tried to import from storageService (which imports investmentService).
    // Or we can import from transactionService directly, but cache is better.
    let transactions = getTransactionCache()?.data;
    if (!transactions) {
        // Fallback if cache empty (rare if user came from Home)
        transactions = await getAllTransactions();
        setTransactionCache(transactions);
    }

    // 2. Group by symbol to optimize price fetching and fallback logic
    const groupedInvestments: Record<string, Investment[]> = {};
    investments.forEach(inv => {
        if (!groupedInvestments[inv.symbol]) groupedInvestments[inv.symbol] = [];
        groupedInvestments[inv.symbol].push(inv);
    });

    const symbols = Object.keys(groupedInvestments);
    const latestPrices = await getLatestPrices(symbols);

    // 3. Convert price history to simple key-value for metrics calc
    // With Fallback: If no price history, use the latest investment price
    const priceMap: Record<string, BigNumber> = {};

    symbols.forEach(symbol => {
        if (latestPrices[symbol]) {
            priceMap[symbol] = latestPrices[symbol].price;
        } else {
            // Fallback: Find latest transaction for this symbol
            // Sort Descending by Date
            const sorted = groupedInvestments[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (sorted.length > 0) {
                // Use the price from the latest transaction (BUY or SELL)
                priceMap[symbol] = sorted[0].price;
            } else {
                priceMap[symbol] = new BigNumber(0);
            }
        }
    });

    const metrics = getAllPortfolioMetrics(investments, priceMap);

    // 4. Aggregate totals
    let totalEquity = new BigNumber(0);
    // let realizedPL = new BigNumber(0); // We will calculate this from Transactions instead
    let unrealizedPL = new BigNumber(0);
    let totalCostBasis = new BigNumber(0);
    let totalDividends = new BigNumber(0);

    metrics.forEach(m => {
        totalEquity = totalEquity.plus(m.totalMarketValue);
        // realizedPL = realizedPL.plus(m.realizedPL); // Legacy calc method
        unrealizedPL = unrealizedPL.plus(m.unrealizedPL);
        totalCostBasis = totalCostBasis.plus(m.totalCostBasis);
    });

    // 5. Calculate Realized P/L from Transactions (Source of Truth)
    let totalRealizedPL = new BigNumber(0);
    if (transactions) {
        transactions.forEach(tx => {
            // Only consider transactions linked to investments if we want to be strict,
            // but CAPITAL_GAIN/LOSS types are inherently investment related in this schema.
            // AND the HomeScreen logic sums ALL CAPITAL_GAIN/LOSS.
            if (tx.type === 'CAPITAL_GAIN') {
                totalRealizedPL = totalRealizedPL.plus(tx.amount);
            } else if (tx.type === 'CAPITAL_LOSS') {
                totalRealizedPL = totalRealizedPL.minus(tx.amount);
            }
        });
    }

    // 6. Calculate Dividends separately (from actions)
    investments.forEach(inv => {
        if (inv.action === 'DIVIDEND') {
            const val = inv.price.times(inv.quantity);
            totalDividends = totalDividends.plus(val);
        }
    });

    // Unrealized PL %
    // (Current Value - Cost Basis) / Cost Basis
    const detailsUnrealizedPLPercent = totalCostBasis.isGreaterThan(0)
        ? unrealizedPL.dividedBy(totalCostBasis).times(100).toNumber()
        : 0;

    return {
        totalEquity: totalEquity.toNumber(),
        realizedPL: totalRealizedPL.toNumber(),
        unrealizedPL: unrealizedPL.toNumber(),
        unrealizedPLPercent: detailsUnrealizedPLPercent,
        totalDividends: totalDividends.toNumber()
    };
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);

        // Optimistic cache update or invalidation
        // For simplicity, just invalidate
        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};