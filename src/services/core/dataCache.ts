import { Transaction, Investment, Category, RecurrenceRule, Reminder, Budget } from '@types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache storage
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

let transactionCache: CacheEntry<Transaction[]> | null = null;
let investmentCache: CacheEntry<Investment[]> | null = null;

// Cache validity checker
export const isValid = <T>(cache: CacheEntry<T> | null): boolean => {
    if (!cache) return false;
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_TTL;
};

// ============= Transactions =============

export const getTransactionCache = (): CacheEntry<Transaction[]> | null => {
    return transactionCache;
};

export const setTransactionCache = (data: Transaction[]): void => {
    transactionCache = {
        data,
        timestamp: Date.now()
    };
};

export const invalidateTransactionCache = (): void => {
    transactionCache = null;
};

/**
 * Optimistically add a transaction to the cache without refetching.
 * Inserts at the correct position based on date (descending order).
 */
export const addTransactionToCache = (transaction: Transaction): void => {
    if (!transactionCache) return;

    // Insert at correct position (sorted by date DESC)
    const newData = [...transactionCache.data];
    const insertIndex = newData.findIndex(t => new Date(t.date) < new Date(transaction.date));

    if (insertIndex === -1) {
        newData.push(transaction); // Oldest transaction
    } else {
        newData.splice(insertIndex, 0, transaction);
    }

    transactionCache = {
        data: newData,
        timestamp: Date.now()
    };
};

/**
 * Optimistically update a transaction in the cache without refetching.
 */
export const updateTransactionInCache = (transaction: Transaction): void => {
    if (!transactionCache) return;

    const index = transactionCache.data.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
        const newData = [...transactionCache.data];
        newData[index] = transaction;

        // Re-sort by date DESC in case date changed
        newData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        transactionCache = {
            data: newData,
            timestamp: Date.now()
        };
    }
};

/**
 * Optimistically remove a transaction from the cache without refetching.
 */
export const deleteTransactionFromCache = (id: string): void => {
    if (!transactionCache) return;

    transactionCache = {
        data: transactionCache.data.filter(t => t.id !== id),
        timestamp: Date.now()
    };
};

// ============= Investments =============

export const getInvestmentCache = (): CacheEntry<Investment[]> | null => {
    return investmentCache;
};

export const setInvestmentCache = (data: Investment[]): void => {
    investmentCache = {
        data,
        timestamp: Date.now()
    };
};

export const invalidateInvestmentCache = (): void => {
    investmentCache = null;
};

// ============= Clear All Caches =============

export const invalidateAllCaches = (): void => {
    transactionCache = null;
    investmentCache = null;
};
