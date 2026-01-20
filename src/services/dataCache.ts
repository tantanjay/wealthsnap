import { Transaction, Investment, Category, RecurrenceRule } from '../types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache storage
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

let transactionCache: CacheEntry<Transaction[]> | null = null;
let investmentCache: CacheEntry<Investment[]> | null = null;
let categoryCache: CacheEntry<Category[]> | null = null;
let recurrenceRuleCache: CacheEntry<RecurrenceRule[]> | null = null;

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
    console.log('[Cache] Transactions cache invalidated');
    transactionCache = null;
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
    console.log('[Cache] Investments cache invalidated');
    investmentCache = null;
};

// ============= Categories =============

export const getCategoryCache = (): CacheEntry<Category[]> | null => {
    return categoryCache;
};

export const setCategoryCache = (data: Category[]): void => {
    categoryCache = {
        data,
        timestamp: Date.now()
    };
};

export const invalidateCategoryCache = (): void => {
    console.log('[Cache] Categories cache invalidated');
    categoryCache = null;
};

// ============= Recurrence Rules =============

export const getRecurrenceRuleCache = (): CacheEntry<RecurrenceRule[]> | null => {
    return recurrenceRuleCache;
};

export const setRecurrenceRuleCache = (data: RecurrenceRule[]): void => {
    recurrenceRuleCache = {
        data,
        timestamp: Date.now()
    };
};

export const invalidateRecurrenceRuleCache = (): void => {
    console.log('[Cache] Recurrence rules cache invalidated');
    recurrenceRuleCache = null;
};

// ============= Clear All Caches =============

export const invalidateAllCaches = (): void => {
    console.log('[Cache] All caches invalidated');
    transactionCache = null;
    investmentCache = null;
    categoryCache = null;
    recurrenceRuleCache = null;
};
