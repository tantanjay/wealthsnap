import { Transaction, Investment } from '@types';

// Cache configuration
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Cache storage
// Cache storage
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

let transactionCache: CacheEntry<Transaction[]> | null = null;
let investmentCache: CacheEntry<Investment[]> | null = null;

// Track the last time a write operation occurred to prevent stale overwrites
let lastTransactionWriteTime = 0;

// Queue for actions that occur while cache is not yet initialized
let pendingTransactionActions: ((data: Transaction[]) => Transaction[])[] = [];

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

export const getLastTransactionWriteTime = (): number => {
    return lastTransactionWriteTime;
};

export const setTransactionCache = (data: Transaction[]): void => {
    let finalData = [...data];

    // Apply any pending actions that occurred during load
    if (pendingTransactionActions.length > 0) {
        pendingTransactionActions.forEach(action => {
            finalData = action(finalData);
        });
        pendingTransactionActions = [];
    }

    transactionCache = {
        data: finalData,
        timestamp: Date.now()
    };
};

export const invalidateTransactionCache = (): void => {
    transactionCache = null;
    pendingTransactionActions = [];
};

/**
 * Optimistically upsert (add or update) a transaction in the cache.
 * If cache is not ready, queues the action.
 */
export const upsertTransaction = (transaction: Transaction): void => {
    lastTransactionWriteTime = Date.now();

    const action = (currentData: Transaction[]): Transaction[] => {
        const newData = [...currentData];
        const index = newData.findIndex(t => t.id === transaction.id);

        if (index !== -1) {
            // Update existing
            newData[index] = transaction;
        } else {
            // Add new - Insert at correct position (sorted by date DESC)
            const insertIndex = newData.findIndex(t => new Date(t.date) < new Date(transaction.date));
            if (insertIndex === -1) {
                newData.push(transaction);
            } else {
                newData.splice(insertIndex, 0, transaction);
            }
        }

        // Ensure sort consistency
        return newData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    if (transactionCache) {
        const newData = action(transactionCache.data);
        transactionCache = {
            data: newData,
            timestamp: Date.now()
        };
    } else {
        pendingTransactionActions.push(action);
    }
};

/**
 * Optimistically remove a transaction from the cache.
 * If cache is not ready, queues the action.
 */
export const deleteTransactionFromCache = (id: string): void => {
    lastTransactionWriteTime = Date.now();

    const action = (currentData: Transaction[]): Transaction[] => {
        return currentData.filter(t => t.id !== id && t.linkedTransactionId !== id);
    };

    if (transactionCache) {
        const newData = action(transactionCache.data);
        transactionCache = {
            data: newData,
            timestamp: Date.now()
        };
    } else {
        pendingTransactionActions.push(action);
    }
};

// Legacy support (redirect to upsert)
export const addTransactionToCache = (transaction: Transaction) => upsertTransaction(transaction);
export const updateTransactionInCache = (transaction: Transaction) => upsertTransaction(transaction);

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
    invalidateTransactionCache();
    invalidateInvestmentCache();
};
