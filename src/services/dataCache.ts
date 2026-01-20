import { Transaction, Investment, Category, RecurrenceRule } from '../types';
import * as StorageService from './storageService';

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
const isValid = <T>(cache: CacheEntry<T> | null): boolean => {
    if (!cache) return false;
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_TTL;
};

// ============= Transactions =============

export const getCachedTransactions = async (): Promise<Transaction[]> => {
    if (isValid(transactionCache)) {
        console.log('[Cache] Transactions loaded from cache');
        return transactionCache!.data;
    }

    console.log('[Cache] Transactions loaded from storage');
    const data = await StorageService.getAllTransactions();
    transactionCache = {
        data,
        timestamp: Date.now()
    };
    return data;
};

export const invalidateTransactionCache = (): void => {
    console.log('[Cache] Transactions cache invalidated');
    transactionCache = null;
};

// ============= Investments =============

export const getCachedInvestments = async (): Promise<Investment[]> => {
    if (isValid(investmentCache)) {
        console.log('[Cache] Investments loaded from cache');
        return investmentCache!.data;
    }

    console.log('[Cache] Investments loaded from storage');
    const data = await StorageService.getAllInvestments();
    investmentCache = {
        data,
        timestamp: Date.now()
    };
    return data;
};

export const invalidateInvestmentCache = (): void => {
    console.log('[Cache] Investments cache invalidated');
    investmentCache = null;
};

// ============= Categories =============

export const getCachedCategories = async (): Promise<Category[]> => {
    if (isValid(categoryCache)) {
        console.log('[Cache] Categories loaded from cache');
        return categoryCache!.data;
    }

    console.log('[Cache] Categories loaded from storage');
    const data = await StorageService.getAllCategories();
    categoryCache = {
        data,
        timestamp: Date.now()
    };
    return data;
};

export const invalidateCategoryCache = (): void => {
    console.log('[Cache] Categories cache invalidated');
    categoryCache = null;
};

// ============= Recurrence Rules =============

export const getCachedRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
    if (isValid(recurrenceRuleCache)) {
        console.log('[Cache] Recurrence rules loaded from cache');
        return recurrenceRuleCache!.data;
    }

    console.log('[Cache] Recurrence rules loaded from storage');
    const data = await StorageService.getAllRecurrenceRules();
    recurrenceRuleCache = {
        data,
        timestamp: Date.now()
    };
    return data;
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
