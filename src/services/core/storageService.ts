import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { UserProfile, AIConfig } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { encryptData, decryptData } from '@services/core/encryptionService';
import { ALL_ASYNC_KEYS, ASYNC_KEYS, SECURE_KEYS } from '@constants/config';
import * as DataCache from '@services/core/dataCache';
import { clearAllNotifications } from '@services/background/notificationService';

/**
 * Storage Architecture:
 * - SQLite: Core data (Transactions, Investments, Budgets, Recurrence Rules).
 * - AsyncStorage: Lightweight preferences (User Profile, Onboarding State, History Prefs, Backup Timestamp).
 * - SecureStore: Sensitive secrets (PIN, API Keys, etc.).
 */

// ============= AsyncStorage Helpers (for small data) =============

const safeGet = async <T>(key: string): Promise<T | null> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const decrypted = await decryptData(raw);
        if (decrypted) return decrypted;

        try {
            return JSON.parse(raw) as T;
        } catch (e) {
            console.error(`Failed to parse legacy data for ${key}`, e);
            return null;
        }
    } catch (error) {
        console.error(`Error reading ${key}`, error);
        return null;
    }
};

const safeSave = async (key: string, data: any): Promise<void> => {
    try {
        const encrypted = await encryptData(data);
        await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
        console.error(`Error saving ${key}`, error);
        throw error;
    }
};

// ============= User Profile (AsyncStorage) =============

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
    await safeSave(ASYNC_KEYS.USER_PROFILE, profile);
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    return await safeGet<UserProfile>(ASYNC_KEYS.USER_PROFILE);
};

export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
        const currentProfile = await getUserProfile();
        if (!currentProfile) {
            throw new Error('No profile found');
        }

        const updatedProfile = {
            ...currentProfile,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await saveUserProfile(updatedProfile);
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw new Error('Failed to update user profile');
    }
};


// ============= Onboarding (AsyncStorage) =============

export const setOnboardingComplete = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.ONBOARDING.COMPLETE, 'true');
    } catch (error) {
        console.error('Error setting onboarding complete:', error);
    }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ASYNC_KEYS.ONBOARDING.COMPLETE);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
};

export const saveAcceptedTermsVersion = async (version: number): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.ONBOARDING.ACCEPTED_TERMS_VERSION, version.toString());
    } catch (error) {
        console.error('Error saving accepted terms version:', error);
    }
};

export const getAcceptedTermsVersion = async (): Promise<number> => {
    try {
        const value = await AsyncStorage.getItem(ASYNC_KEYS.ONBOARDING.ACCEPTED_TERMS_VERSION);
        if (!value) return 0;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
        console.error('Error getting accepted terms version:', error);
        return 0;
    }
};

// ============= AI Config (AsyncStorage) =============

export const saveAIConfig = async (config: AIConfig): Promise<void> => {
    try {
        if (config.apiKey) {
            await SecureStore.setItemAsync(SECURE_KEYS.AI_API_KEY, config.apiKey);
        } else {
            await SecureStore.deleteItemAsync(SECURE_KEYS.AI_API_KEY).catch(() => { });
        }
        await AsyncStorage.setItem(ASYNC_KEYS.AI.MODEL_ID, config.modelId || 'gemini-3.8-flash');
    } catch (error) {
        console.error('Failed to save AI config:', error);
        throw error;
    }
};

export const getAIConfig = async (): Promise<AIConfig | null> => {
    try {
        const apiKey = await SecureStore.getItemAsync(SECURE_KEYS.AI_API_KEY);
        const modelId = await AsyncStorage.getItem(ASYNC_KEYS.AI.MODEL_ID);
        return {
            apiKey: apiKey || undefined,
            modelId: modelId || undefined
        };
    } catch (error) {
        console.error('Failed to get AI config:', error);
        return null;
    }
};

// ============= History Preferences (AsyncStorage) =============

export const saveHistoryTimeFrame = async (timeFrame: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.HISTORY_SCREEN.PREFERENCE, JSON.stringify({ timeFrame }));
    } catch (error) {
        console.error('Failed to save history prefs:', error);
    }
};

export const getHistoryTimeFrame = async (): Promise<string | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.HISTORY_SCREEN.PREFERENCE);
        return data ? JSON.parse(data).timeFrame : null;
    } catch (error) {
        console.error('Failed to get history prefs:', error);
        return null;
    }
};

// ============= Home Snapshot Preferences (AsyncStorage) =============
export type SnapshotRowId = 'cash' | 'investments' | 'loans' | 'goals';
export type SnapshotPeriod = 'overall' | 'month';
// How far back the net worth graph reaches.
export type SnapshotRange = '6M' | '1Y' | '3Y' | 'ALL';

export const SNAPSHOT_RANGES: { key: SnapshotRange; label: string; months: number | 'ALL' }[] = [
    { key: '6M', label: '6 months', months: 6 },
    { key: '1Y', label: '1 year', months: 12 },
    { key: '3Y', label: '3 years', months: 36 },
    { key: 'ALL', label: 'All time', months: 'ALL' },
];

export const DEFAULT_SNAPSHOT_ORDER: SnapshotRowId[] = ['cash', 'investments', 'loans', 'goals'];

// Old Home card ids -> Snapshot rows. 'financial-health' and 'transactions' are dropped (hero and Recent are fixed).
const LEGACY_CARD_TO_ROW: Record<string, SnapshotRowId> = {
    'cash-flow': 'cash',
    'portfolio': 'investments',
    'debt': 'loans',
    'savings-goals': 'goals',
};

// Keeps known ids once each, in order, and appends any missing ones.
const normalizeSnapshotOrder = (ids: string[]): SnapshotRowId[] => {
    const known = ids.filter((id, i): id is SnapshotRowId =>
        (DEFAULT_SNAPSHOT_ORDER as string[]).includes(id) && ids.indexOf(id) === i);
    return [...known, ...DEFAULT_SNAPSHOT_ORDER.filter(id => !known.includes(id))];
};

export const saveSnapshotOrder = async (order: SnapshotRowId[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_ORDER, JSON.stringify(order));
    } catch (error) {
        console.error('Failed to save snapshot order:', error);
    }
};

// Migrates the old Home card order silently the first time it's read.
export const getSnapshotOrder = async (): Promise<SnapshotRowId[]> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_ORDER);
        if (data) return normalizeSnapshotOrder(JSON.parse(data));

        const legacy = await AsyncStorage.getItem(ASYNC_KEYS.HOME_SCREEN.CARD_ORDER);
        if (!legacy) return DEFAULT_SNAPSHOT_ORDER;

        const migrated = normalizeSnapshotOrder((JSON.parse(legacy) as string[]).map(id => LEGACY_CARD_TO_ROW[id]).filter(Boolean));
        await saveSnapshotOrder(migrated);
        await AsyncStorage.multiRemove([ASYNC_KEYS.HOME_SCREEN.CARD_ORDER, ...ASYNC_KEYS.HOME_SCREEN.LEGACY_DISPLAY_MODES]);
        return migrated;
    } catch (error) {
        console.error('Failed to get snapshot order:', error);
        return DEFAULT_SNAPSHOT_ORDER;
    }
};

export const saveSnapshotPeriod = async (period: SnapshotPeriod): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_PERIOD, period);
    } catch (error) {
        console.error('Failed to save snapshot period:', error);
    }
};

export const saveSnapshotRange = async (range: SnapshotRange): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_RANGE, range);
    } catch (error) {
        console.error('Failed to save snapshot range:', error);
    }
};

export const getSnapshotRange = async (): Promise<SnapshotRange> => {
    try {
        const range = await AsyncStorage.getItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_RANGE);
        return SNAPSHOT_RANGES.some(r => r.key === range) ? (range as SnapshotRange) : '6M';
    } catch (error) {
        console.error('Failed to get snapshot range:', error);
        return '6M';
    }
};

export const getSnapshotPeriod = async (): Promise<SnapshotPeriod> => {
    try {
        const period = await AsyncStorage.getItem(ASYNC_KEYS.HOME_SCREEN.SNAPSHOT_PERIOD);
        return period === 'month' ? 'month' : 'overall';
    } catch (error) {
        console.error('Failed to get snapshot period:', error);
        return 'overall';
    }
};

// ============= Insights Order (AsyncStorage) =============

// The Financial Health pool (docs/METRICS.md → Financial Health grid).
export type HealthMetricId =
    | 'runway' | 'spending' | 'debt' | 'wealth'
    | 'budget' | 'netflow' | 'savings' | 'income' | 'expense' | 'burn' | 'daily' | 'annual' | 'topcat';

export const HEALTH_METRIC_IDS: HealthMetricId[] = [
    'runway', 'spending', 'debt', 'wealth',
    'budget', 'netflow', 'savings', 'income', 'expense', 'burn', 'daily', 'annual', 'topcat',
];

export const HEALTH_GRID_SIZE = 4;
export const DEFAULT_HEALTH_GRID: HealthMetricId[] = ['runway', 'spending', 'debt', 'wealth'];

export const saveHealthGrid = async (ids: HealthMetricId[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.HEALTH_GRID, JSON.stringify(ids));
    } catch (error) {
        console.error('Failed to save health grid:', error);
    }
};

// Grid order = the order the ids were checked. The old overview card order is dropped, not migrated.
export const getHealthGrid = async (): Promise<HealthMetricId[]> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.HEALTH_GRID);
        if (!data) {
            await AsyncStorage.removeItem(ASYNC_KEYS.INSIGHTS_SCREEN.CARD_ORDER);
            return DEFAULT_HEALTH_GRID;
        }
        const ids = (JSON.parse(data) as string[]).filter((id, i, all): id is HealthMetricId =>
            (HEALTH_METRIC_IDS as string[]).includes(id) && all.indexOf(id) === i);
        return ids.slice(0, HEALTH_GRID_SIZE);
    } catch (error) {
        console.error('Failed to get health grid:', error);
        return DEFAULT_HEALTH_GRID;
    }
};

export const saveInsightsSectionOrder = async (order: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.SECTION_ORDER, JSON.stringify(order));
    } catch (error) {
        console.error('Failed to save insights section order:', error);
    }
};

export const getInsightsSectionOrder = async (): Promise<string[] | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.SECTION_ORDER);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get insights section order:', error);
        return null;
    }
};

export const saveInsightsExpenseGrouping = async (grouping: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.EXPENSE_GROUPING, grouping);
    } catch (error) {
        console.error('Failed to save insights expense grouping:', error);
    }
};

export const getInsightsExpenseGrouping = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.EXPENSE_GROUPING);
    } catch (error) {
        console.error('Failed to get insights expense grouping:', error);
        return null;
    }
};

export const saveInsightsIncomeTab = async (tab: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.INCOME_TAB, tab);
    } catch (error) {
        console.error('Failed to save insights income tab:', error);
    }
};

export const getInsightsIncomeTab = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.INCOME_TAB);
    } catch (error) {
        console.error('Failed to get insights income tab:', error);
        return null;
    }
};

export const saveInsightsIncomeTimeRange = async (range: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.INCOME_TIME_RANGE, range);
    } catch (error) {
        console.error('Failed to save insights income time range:', error);
    }
};

export const getInsightsIncomeTimeRange = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.INCOME_TIME_RANGE);
    } catch (error) {
        console.error('Failed to get insights income time range:', error);
        return null;
    }
};

export const saveInsightsComparisonView = async (view: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.COMPARISON_VIEW, view);
    } catch (error) {
        console.error('Failed to save insights comparison view:', error);
    }
};

export const getInsightsComparisonView = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.COMPARISON_VIEW);
    } catch (error) {
        console.error('Failed to get insights comparison view:', error);
        return null;
    }
};

export const saveInsightsComparisonTimeRange = async (range: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.COMPARISON_TIME_RANGE, range);
    } catch (error) {
        console.error('Failed to save insights comparison time range:', error);
    }
};

export const getInsightsComparisonTimeRange = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.COMPARISON_TIME_RANGE);
    } catch (error) {
        console.error('Failed to get insights comparison time range:', error);
        return null;
    }
};

export const saveInsightsSavingsTab = async (tab: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.SAVINGS_TAB, tab);
    } catch (error) {
        console.error('Failed to save insights savings tab:', error);
    }
};

export const getInsightsSavingsTab = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.SAVINGS_TAB);
    } catch (error) {
        console.error('Failed to get insights savings tab:', error);
        return null;
    }
};

export const saveInsightsSavingsTimeRange = async (range: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.SAVINGS_TIME_RANGE, range);
    } catch (error) {
        console.error('Failed to save insights savings time range:', error);
    }
};

export const getInsightsSavingsTimeRange = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.SAVINGS_TIME_RANGE);
    } catch (error) {
        console.error('Failed to get insights savings time range:', error);
        return null;
    }
};

export const saveInsightsPulsePeriod = async (period: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.PULSE_PERIOD, period);
    } catch (error) {
        console.error('Failed to save insights pulse period:', error);
    }
};

export const getInsightsPulsePeriod = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.PULSE_PERIOD);
    } catch (error) {
        console.error('Failed to get insights pulse period:', error);
        return null;
    }
};

// ============= Investment Screen Preferences (AsyncStorage) =============

export const saveInvestmentStatsOrder = async (order: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.STATS_ORDER, JSON.stringify(order));
    } catch (error) {
        console.error('Failed to save investment stats order:', error);
    }
};

export const getInvestmentStatsOrder = async (): Promise<string[] | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.STATS_ORDER);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get investment stats order:', error);
        return null;
    }
};

export const saveInvestmentSectionOrder = async (order: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.SECTION_ORDER, JSON.stringify(order));
    } catch (error) {
        console.error('Failed to save investment section order:', error);
    }
};

export const getInvestmentSectionOrder = async (): Promise<string[] | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.SECTION_ORDER);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get investment section order:', error);
        return null;
    }
};

export const saveInvestmentHoldingsSort = async (sort: { option: string, direction: string }): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.HOLDINGS_SORT, JSON.stringify(sort));
    } catch (error) {
        console.error('Failed to save investment holdings sort:', error);
    }
};

export const getInvestmentHoldingsSort = async (): Promise<{ option: string, direction: string } | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.HOLDINGS_SORT);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get investment holdings sort:', error);
        return null;
    }
};

export const saveInvestmentDividendTab = async (tab: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.DIVIDEND_TAB, tab);
    } catch (error) {
        console.error('Failed to save investment dividend tab:', error);
    }
};

export const getInvestmentDividendTab = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.DIVIDEND_TAB);
    } catch (error) {
        console.error('Failed to get investment dividend tab:', error);
        return null;
    }
};

export const saveInvestmentAllocationTab = async (tab: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.ALLOCATION_TAB, tab);
    } catch (error) {
        console.error('Failed to save investment allocation tab:', error);
    }
};

export const getInvestmentAllocationTab = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.ALLOCATION_TAB);
    } catch (error) {
        console.error('Failed to get investment allocation tab:', error);
        return null;
    }
};

export const saveInvestmentAdvisorPriority = async (priority: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INVESTMENT_SCREEN.ADVISOR_PRIORITY, priority);
    } catch (error) {
        console.error('Failed to save investment advisor priority:', error);
    }
};

export const getInvestmentAdvisorPriority = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.INVESTMENT_SCREEN.ADVISOR_PRIORITY);
    } catch (error) {
        console.error('Failed to get investment advisor priority:', error);
        return null;
    }
};

// ============= Debt Screen Preferences (AsyncStorage) =============

export const saveDebtStrategy = async (strategy: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.DEBT_SCREEN.STRATEGY, strategy);
    } catch (error) {
        console.error('Failed to save debt strategy:', error);
    }
};

export const getDebtStrategy = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.DEBT_SCREEN.STRATEGY);
    } catch (error) {
        console.error('Failed to get debt strategy:', error);
        return null;
    }
};

// ============= Chat Screen Preferences (AsyncStorage) =============

export const saveChatExcludedCategories = async (categories: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.CHAT_SCREEN.EXCLUDED_CATEGORIES, JSON.stringify(categories));
    } catch (error) {
        console.error('Failed to save chat excluded categories:', error);
    }
};

export const getChatExcludedCategories = async (): Promise<string[] | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.CHAT_SCREEN.EXCLUDED_CATEGORIES);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get chat excluded categories:', error);
        return null;
    }
};

// Whether debt *names* are included in what's sent to the AI - amounts/status/type are
// always included regardless, same principle as excluded categories (hides the label, not
// the numbers). null = not yet chosen, caller defaults to true (disclose).
export const saveChatDiscloseDebtNames = async (disclose: boolean): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.CHAT_SCREEN.DISCLOSE_DEBT_NAMES, JSON.stringify(disclose));
    } catch (error) {
        console.error('Failed to save chat debt disclosure preference:', error);
    }
};

export const getChatDiscloseDebtNames = async (): Promise<boolean | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.CHAT_SCREEN.DISCLOSE_DEBT_NAMES);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get chat debt disclosure preference:', error);
        return null;
    }
};

// ============= Backup Timestamp (AsyncStorage) =============

export const saveLastBackupDate = async (date: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.BACKUP_TIMESTAMP, date);
    } catch (error) {
        console.error('Failed to save last backup date:', error);
    }
};

export const getLastBackupDate = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ASYNC_KEYS.BACKUP_TIMESTAMP);
    } catch (error) {
        console.error('Failed to get last backup date:', error);
        return null;
    }
};

// ============= Clear All Data =============

export const clearAllData = async (): Promise<void> => {
    try {
        // Clear AsyncStorage
        await AsyncStorage.multiRemove(ALL_ASYNC_KEYS);
        await SecureStore.deleteItemAsync(SECURE_KEYS.AI_API_KEY).catch(() => { });

        // Clear SQLite
        const db = await getDatabase();
        await db.execAsync(`
            DELETE FROM transactions;
            DELETE FROM investments;
            DELETE FROM debts;
            DELETE FROM savings_goals;
            DELETE FROM categories;
            DELETE FROM recurrence_rules;
            DELETE FROM budgets;
            DELETE FROM reminders;
            DELETE FROM transaction_receipts;
            DELETE FROM reminder_logs;
            DELETE FROM ai_usage_logs;
            DELETE FROM price_history;
            DELETE FROM dividend_history;
            DELETE FROM assets;
            DELETE FROM monthly_summary;
            DELETE FROM deleted_records;
        `);

        DataCache.invalidateAllCaches();
        await clearAllNotifications();
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};