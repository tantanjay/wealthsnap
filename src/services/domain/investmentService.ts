import { BigNumber } from 'bignumber.js';
import { Investment } from "@types";
import { getDatabase } from "@services/database/databaseService";
import { bulkDecryptItems, encryptField } from "@services/core/encryptionService";
import { chunkArray } from "@utils/index";
import { invalidateInvestmentCache, getInvestmentCache, setInvestmentCache, isValid, getTransactionCache, setTransactionCache } from "@services/core/dataCache";
import { getAllPortfolioMetrics } from "@utils/investmentMetrics";
import { getLatestPrices } from "@services/domain/priceHistoryService";
import { getAllTransactions, deleteTransaction } from "@services/domain/transactionService";
import { getAllAssets } from "@services/domain/assetService";
import { getAnnualDividend } from "@services/domain/dividendHistoryService";
import { upsertTombstone } from "@services/domain/tombstoneService";

// --- Constants & Helpers ---

const UPSERT_INVESTMENT_QUERY = `
  INSERT OR REPLACE INTO investments
  (id, date, symbol, type, action, quantity, price, currency, exchange_rate, fees, notes, creationMethod, isRecurring, recurrenceId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// Used only by merge-sync: unlike UPSERT_INVESTMENT_QUERY, this binds createdAt/updatedAt
// explicitly so the incoming record's real timestamps survive the write instead of being
// re-stamped to "now" by SQLite's DEFAULT CURRENT_TIMESTAMP.
const UPSERT_INVESTMENT_FOR_MERGE_QUERY = `
  INSERT OR REPLACE INTO investments
  (id, date, symbol, type, action, quantity, price, currency, exchange_rate, fees, notes, creationMethod, isRecurring, recurrenceId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        inv.currency || 'PHP',
        inv.exchangeRate?.toString() || '1',
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

/**
 * Merge-sync only: upserts investments while preserving their real createdAt/updatedAt,
 * so a subsequent sync can still tell which side has the newer edit. Not used by normal
 * app saves or by backup restore.
 */
export const bulkUpsertInvestmentsForMerge = async (investments: Investment[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const now = new Date().toISOString();

        await db.withTransactionAsync(async () => {
            for (const inv of investments) {
                const values = await prepareInvestmentValues(inv);
                await db.runAsync(UPSERT_INVESTMENT_FOR_MERGE_QUERY, [
                    ...values,
                    inv.createdAt || now,
                    inv.updatedAt || now
                ]);
            }
        });

        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error merge-upserting investments:', error);
        throw new Error('Failed to merge-upsert investments');
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
            currency: row.currency || 'PHP',
            exchangeRate: new BigNumber(row.exchange_rate || 1),
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

export const getLatestInvestmentDate = async (): Promise<string | null> => {
    try {
        const db = await getDatabase();
        const result = await db.getAllAsync<{ createdAt: string }>('SELECT createdAt FROM investments ORDER BY createdAt DESC LIMIT 1');
        return result[0]?.createdAt || null;
    } catch (error) {
        console.error('Error getting latest investment date:', error);
        return null;
    }
};

export const getInvestmentCount = async (): Promise<number> => {
    try {
        const db = await getDatabase();
        // Count all investments
        const result = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM investments');
        return result[0]?.count || 0;
    } catch (error) {
        console.error('Error counting investments:', error);
        return 0;
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
    let unrealizedPL = new BigNumber(0);
    let totalCostBasis = new BigNumber(0);
    let totalRealizedCostBasis = new BigNumber(0);
    let totalDividends = new BigNumber(0);

    metrics.forEach(m => {
        totalEquity = totalEquity.plus(m.totalMarketValue);
        unrealizedPL = unrealizedPL.plus(m.unrealizedPL);
        totalCostBasis = totalCostBasis.plus(m.totalCostBasis);
        totalRealizedCostBasis = totalRealizedCostBasis.plus(m.realizedCostBasis);
    });

    // 5. Calculate Realized P/L from Transactions (Source of Truth)
    let totalRealizedPL = new BigNumber(0);
    if (transactions) {
        transactions.forEach(tx => {
            if (tx.type === 'CAPITAL_GAIN') {
                totalRealizedPL = totalRealizedPL.plus(tx.amount);
            } else if (tx.type === 'CAPITAL_LOSS') {
                totalRealizedPL = totalRealizedPL.minus(tx.amount);
            }
        });
    }

    // 6. Calculate Dividends separately (from actions) and This Month's Metrics
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

    let thisMonthDividends = new BigNumber(0);
    let thisMonthInvested = new BigNumber(0);

    investments.forEach(inv => {
        const isCurrentMonth = inv.date.startsWith(currentMonthStr);

        if (inv.action === 'DIVIDEND') {
            const val = inv.price.times(inv.quantity);
            totalDividends = totalDividends.plus(val);

            if (isCurrentMonth) {
                thisMonthDividends = thisMonthDividends.plus(val);
            }
        } else if (isCurrentMonth) {
            const amount = inv.price.times(inv.quantity);
            if (inv.action === 'BUY') {
                thisMonthInvested = thisMonthInvested.plus(amount).plus(inv.fees || 0);
            } else if (inv.action === 'SELL') {
                thisMonthInvested = thisMonthInvested.minus(amount.minus(inv.fees || 0));
            }
        }
    });

    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares) —
    // the percent is mathematically undefined, not 0%.
    const detailsUnrealizedPLPercent = totalCostBasis.isGreaterThan(0)
        ? unrealizedPL.dividedBy(totalCostBasis).times(100).toNumber()
        : (unrealizedPL.isZero() ? 0 : null);

    // Realized P/L % relative to the cost basis of the shares actually sold (not remaining holdings)
    const realizedPLPercent = totalRealizedCostBasis.isGreaterThan(0)
        ? totalRealizedPL.dividedBy(totalRealizedCostBasis).times(100).toNumber()
        : (totalRealizedPL.isZero() ? 0 : null);

    return {
        totalEquity: totalEquity.toNumber(),
        realizedPL: totalRealizedPL.toNumber(),
        realizedPLPercent,
        unrealizedPL: unrealizedPL.toNumber(),
        unrealizedPLPercent: detailsUnrealizedPLPercent,
        totalDividends: totalDividends.toNumber(),
        thisMonthDividends: thisMonthDividends.toNumber(),
        thisMonthInvested: thisMonthInvested.toNumber()
    };
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();

        // Realized gain/loss transactions only exist as a byproduct of this investment's
        // sale - they have no meaning without it, so they're deleted along with the
        // investment regardless of whether the caller chose to keep other linked
        // transactions (e.g. the original BUY's transfer). Otherwise a leftover
        // CAPITAL_GAIN/LOSS transaction with no matching cost basis corrupts realizedPLPercent.
        const allTxs = await getAllTransactions();
        const linkedPLTxs = allTxs.filter(t => t.investmentId === id && (t.type === 'CAPITAL_GAIN' || t.type === 'CAPITAL_LOSS'));

        await db.withTransactionAsync(async () => {
            await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);
            await upsertTombstone('investments', id);
        });

        for (const tx of linkedPLTxs) {
            await deleteTransaction(tx.id);
        }

        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};

/**
 * Get detailed portfolio holdings for the UI
 */
export interface PortfolioHolding {
    symbol: string;
    shares: number;
    price: number;
    totalValue: number;
    gainLoss: number;
    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares) —
    // the percent is mathematically undefined, not 0%.
    gainLossPercent: number | null;
    divYield: number;
    sector: string;
    name?: string;
    type?: string;
    priceAsOf?: string;
}

export const getPortfolioHoldings = async (): Promise<PortfolioHolding[]> => {
    const investments = await getCachedInvestments();

    const groupedInvestments: Record<string, Investment[]> = {};
    investments.forEach(inv => {
        if (!groupedInvestments[inv.symbol]) groupedInvestments[inv.symbol] = [];
        groupedInvestments[inv.symbol].push(inv);
    });

    const symbols = Object.keys(groupedInvestments);
    const latestPrices = await getLatestPrices(symbols);

    const priceMap: Record<string, BigNumber> = {};
    const priceDateMap: Record<string, string | undefined> = {};

    symbols.forEach(symbol => {
        if (latestPrices[symbol]) {
            priceMap[symbol] = latestPrices[symbol].price;
            priceDateMap[symbol] = latestPrices[symbol].timestamp;
        } else {
            const sorted = groupedInvestments[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            if (sorted.length > 0) {
                priceMap[symbol] = sorted[0].price;
                priceDateMap[symbol] = sorted[0].date;
            } else {
                priceMap[symbol] = new BigNumber(0);
            }
        }
    });

    const metrics = getAllPortfolioMetrics(investments, priceMap);

    const allAssets = await getAllAssets();
    const assetMap = new Map(allAssets.map(a => [a.symbol, a]));

    const annualDividends = await Promise.all(metrics.map(m => getAnnualDividend(m.symbol)));
    const dividendMap = new Map(metrics.map((m, i) => [m.symbol, annualDividends[i]]));


    const holdings: PortfolioHolding[] = metrics.map(m => {
        const asset = assetMap.get(m.symbol);

        const gainLossPercent = m.totalCostBasis.isGreaterThan(0)
            ? m.unrealizedPL.dividedBy(m.totalCostBasis).times(100).toNumber()
            : (m.unrealizedPL.isZero() ? 0 : null);

        const currentPrice = priceMap[m.symbol] ? priceMap[m.symbol].toNumber() : 0;
        const annualDiv = dividendMap.get(m.symbol) || 0;

        const divYield = currentPrice > 0 ? (annualDiv / currentPrice) * 100 : 0;

        return {
            symbol: m.symbol,
            shares: m.currentQuantity.toNumber(),
            price: currentPrice,
            totalValue: m.totalMarketValue.toNumber(),
            gainLoss: m.unrealizedPL.toNumber(),
            gainLossPercent: gainLossPercent,
            divYield: parseFloat(divYield.toFixed(2)),
            sector: asset?.sector || 'Other',
            name: asset?.name,
            type: asset?.type,
            priceAsOf: priceDateMap[m.symbol]
        };
    });

    return holdings.filter(h => h.shares > 0.000001);
};

export interface DividendBreakdown {
    symbol: string;
    amount: number;
}

export interface MonthlyDividend {
    total: number;
    breakdown: DividendBreakdown[];
}

export const getActualDividendsGrouped = async (): Promise<Record<number, MonthlyDividend[]>> => {
    const investments = await getCachedInvestments();
    const dividendMap: Record<number, MonthlyDividend[]> = {};

    investments.forEach(inv => {
        if (inv.action === 'DIVIDEND') {
            const date = new Date(inv.date);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11

            if (!dividendMap[year]) {
                dividendMap[year] = Array.from({ length: 12 }, () => ({ total: 0, breakdown: [] }));
            }

            const amount = inv.price.times(inv.quantity).toNumber();
            dividendMap[year][month].total += amount;
            
            // Add to breakdown (group by symbol in the breakdown too)
            const existing = dividendMap[year][month].breakdown.find(b => b.symbol === inv.symbol);
            if (existing) {
                existing.amount += amount;
            } else {
                dividendMap[year][month].breakdown.push({ symbol: inv.symbol, amount });
            }
        }
    });

    return dividendMap;
};
