import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, Transaction, Investment, Category, RecurrenceRule, AIConfig, AIUsageLog, Reminder, ReminderLog } from '../types';
import { encryptData, decryptData, encryptField, decryptField } from './encryptionService';
import * as DataCache from './dataCache';
import { getDatabase } from './database/databaseService';
import { ALL_ASYNC_KEYS, ASYNC_KEYS, SECURE_KEYS } from '../constants/config';

/**
 * Storage Architecture:
 * - SQLite: Core data (Transactions, Investments, Budgets, Recurrence Rules).
 * - AsyncStorage: Lightweight preferences (User Profile, Onboarding State, History Prefs).
 * - SecureStore: Sensitive secrets (API Keys, etc. - managed separately).
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

// ============= User Profile (AsyncStorage - small data) =============

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

// ============= Transactions (SQLite) =============

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt sensitive fields
        const encryptedAmount = await encryptField(transaction.amount);
        const encryptedNote = transaction.note ? await encryptField(transaction.note) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO transactions 
             (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transaction.id,
                transaction.date,
                encryptedAmount,
                transaction.type,
                transaction.category || null,
                transaction.subCategory || null,
                encryptedNote,
                transaction.creationMethod || null,
                transaction.isRecurring ? 1 : 0,
                transaction.recurrenceId || null
            ]
        );

        // Optimistic cache update: check if it's a new or existing transaction
        const cache = DataCache.getTransactionCache();
        if (cache) {
            const existsInCache = cache.data.some(t => t.id === transaction.id);
            if (existsInCache) {
                DataCache.updateTransactionInCache(transaction);
            } else {
                DataCache.addTransactionToCache(transaction);
            }
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error('Failed to save transaction');
    }
};

export const saveTransactionWithReceipt = async (transaction: Transaction, receiptData: any): Promise<void> => {
    try {
        const db = await getDatabase();

        await db.withTransactionAsync(async () => {
            // 1. Save Transaction (Duplicate logic to ensure atomicity within this transaction block)
            // Or reuse saveTransaction if we can guarantee transaction context? 
            // SQLite `runAsync` usually auto-commits if not in `withTransactionAsync`.
            // Let's replicate logic locally to be safe inside `withTransactionAsync`.

            // Encrypt sensitive fields
            const encryptedAmount = await encryptField(transaction.amount);
            const encryptedNote = transaction.note ? await encryptField(transaction.note) : null;

            await db.runAsync(
                `INSERT OR REPLACE INTO transactions 
                 (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.id,
                    transaction.date,
                    encryptedAmount,
                    transaction.type,
                    transaction.category || null,
                    transaction.subCategory || null,
                    encryptedNote,
                    transaction.creationMethod || null,
                    transaction.isRecurring ? 1 : 0,
                    transaction.recurrenceId || null
                ]
            );

            // 2. Save Encrypted Receipt
            const encryptedReceipt = await encryptData(receiptData);
            await db.runAsync(
                `INSERT OR REPLACE INTO transaction_receipts (transactionId, receiptData) VALUES (?, ?)`,
                [transaction.id, encryptedReceipt]
            );
        });

        // Optimistic cache update: check if it's a new or existing transaction
        const cache = DataCache.getTransactionCache();
        if (cache) {
            const existsInCache = cache.data.some(t => t.id === transaction.id);
            if (existsInCache) {
                DataCache.updateTransactionInCache(transaction);
            } else {
                DataCache.addTransactionToCache(transaction);
            }
        }
    } catch (error) {
        console.error('Error saving transaction with receipt:', error);
        throw new Error('Failed to save transaction with receipt');
    }
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM transactions ORDER BY date DESC');

        // Decrypt sensitive fields for each transaction
        const decrypted = await Promise.all(rows.map(async (row) => {
            const decryptedNote = await decryptField(row.note);
            return {
                id: row.id,
                date: row.date,
                amount: parseFloat((await decryptField(row.amount)) || '0'),
                type: row.type,
                category: row.category,
                subCategory: row.subCategory,
                note: decryptedNote || undefined,
                creationMethod: row.creationMethod,
                isRecurring: row.isRecurring === 1,
                recurrenceId: row.recurrenceId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        }));

        return decrypted;
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
        // Optimistic cache update: remove from cache instead of full invalidation
        DataCache.deleteTransactionFromCache(id);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw new Error('Failed to delete transaction');
    }
};

export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(
            'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC',
            [startDate, endDate]
        );

        // Decrypt sensitive fields
        const decrypted = await Promise.all(rows.map(async (row) => {
            const decryptedNote = await decryptField(row.note);
            return {
                id: row.id,
                date: row.date,
                amount: parseFloat((await decryptField(row.amount)) || '0'),
                type: row.type,
                category: row.category,
                subCategory: row.subCategory,
                note: decryptedNote || undefined,
                creationMethod: row.creationMethod,
                isRecurring: row.isRecurring === 1,
                recurrenceId: row.recurrenceId,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        }));

        return decrypted;
    } catch (error) {
        console.error('Error getting transactions by date range:', error);
        return [];
    }
};

// ============= Investments (SQLite) =============

export const saveInvestment = async (investment: Investment): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt sensitive fields
        const encryptedQuantity = await encryptField(investment.quantity);
        const encryptedAvgPrice = await encryptField(investment.averageBuyPrice);
        const encryptedNotes = investment.notes ? await encryptField(investment.notes) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO investments 
             (id, symbol, name, type, quantity, averageBuyPrice, currentPrice, lastUpdated, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                investment.id,
                investment.symbol,
                investment.name,
                investment.type,
                encryptedQuantity,
                encryptedAvgPrice,
                investment.currentPrice || null,
                investment.lastUpdated || null,
                encryptedNotes
            ]
        );
        DataCache.invalidateInvestmentCache();
    } catch (error) {
        console.error('Error saving investment:', error);
        throw new Error('Failed to save investment');
    }
};

export const getAllInvestments = async (): Promise<Investment[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM investments ORDER BY symbol');

        // Decrypt sensitive fields
        const decrypted = await Promise.all(rows.map(async (row) => {
            const decryptedNotes = await decryptField(row.notes);
            return {
                id: row.id,
                symbol: row.symbol,
                name: row.name,
                type: row.type,
                quantity: parseFloat((await decryptField(row.quantity)) || '0'),
                averageBuyPrice: parseFloat((await decryptField(row.averageBuyPrice)) || '0'),
                currentPrice: row.currentPrice,
                lastUpdated: row.lastUpdated,
                notes: decryptedNotes || undefined
            };
        }));

        return decrypted;
    } catch (error) {
        console.error('Error getting investments:', error);
        return [];
    }
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);
        DataCache.invalidateInvestmentCache();
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};

// ============= Categories (SQLite) =============

export const saveCategory = async (category: Category): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT OR REPLACE INTO categories 
             (id, name, type, icon)
             VALUES (?, ?, ?, ?)`,
            [
                category.id,
                category.name,
                category.type,
                category.icon || null
            ]
        );
        DataCache.invalidateCategoryCache();
    } catch (error) {
        console.error('Error saving category:', error);
        throw new Error('Failed to save category');
    }
};

export const getAllCategories = async (): Promise<Category[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM categories');
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            icon: row.icon
        }));
    } catch (error) {
        console.error('Error getting categories:', error);
        return [];
    }
};

// ============= Recurrence Rules (SQLite) =============

export const saveRecurrenceRule = async (rule: RecurrenceRule): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt the entire template to protect sensitive fields inside
        const encryptedTemplate = await encryptField(JSON.stringify(rule.transactionTemplate));

        // Encrypt the name
        const encryptedName = rule.name ? await encryptField(rule.name) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO recurrence_rules 
             (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                rule.id,
                encryptedName,
                rule.frequency,
                rule.startDate || null,
                rule.endDate || null,
                rule.nextDueDate,
                encryptedTemplate,
                rule.isActive ? 1 : 0
            ]
        );
        DataCache.invalidateRecurrenceRuleCache();
    } catch (error) {
        console.error('Error saving recurrence rule:', error);
        throw new Error('Failed to save recurrence rule');
    }
};

export const getAllRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM recurrence_rules');

        const rules = await Promise.all(rows.map(async (row) => {
            let template: any = {};
            try {
                // Try to decrypt first
                const decrypted = await decryptField(row.transactionTemplate);
                template = decrypted ? JSON.parse(decrypted) : {};
            } catch {
                // Fallback for unencrypted data (migration transition)
                try {
                    template = JSON.parse(row.transactionTemplate);
                } catch {
                    console.error('Failed to parse transaction template');
                }
            }



            // Decrypt name
            const decryptedName = await decryptField(row.name);

            return {
                id: row.id,
                name: decryptedName || undefined,
                frequency: row.frequency,
                startDate: row.startDate,
                endDate: row.endDate,
                nextDueDate: row.nextDueDate,
                transactionTemplate: template,
                isActive: row.isActive === 1
            };
        }));

        return rules;
    } catch (error) {
        console.error('Error getting recurrence rules:', error);
        return [];
    }
};

export const deleteRecurrenceRule = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM recurrence_rules WHERE id = ?', [id]);
        DataCache.invalidateRecurrenceRuleCache();
    } catch (error) {
        console.error('Error deleting recurrence rule:', error);
        throw new Error('Failed to delete recurrence rule');
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
        await AsyncStorage.setItem(ASYNC_KEYS.AI.MODEL_ID, config.modelId || 'gemini-2.5-flash');
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

// ============= AI Usage Logs (SQLite) =============

export const saveAIUsageLog = async (log: AIUsageLog): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO ai_usage_logs 
             (id, timestamp, endpoint, provider, model, status, inputTokens, outputTokens, imageCount, durationMs, costUSD)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.timestamp,
                log.endpoint,
                log.provider,
                log.model,
                log.status,
                log.inputTokens,
                log.outputTokens,
                log.imageCount,
                log.durationMs,
                log.costUSD
            ]
        );
    } catch (error) {
        console.error('Failed to save AI log:', error);
    }
};

export const getAIUsageLogs = async (limit: number = 50): Promise<AIUsageLog[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(
            'SELECT * FROM ai_usage_logs ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );
        return rows as AIUsageLog[];
    } catch (error) {
        console.error('Failed to get AI logs:', error);
        return [];
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

// ============= Home Display Preferences (AsyncStorage) =============
// ============= Home Display Preferences (AsyncStorage) =============

export const saveHomeDisplayMode = async (mode: 'Overall' | 'Month'): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.HOME_SCREEN.DISPLAY_MODE, mode);
    } catch (error) {
        console.error('Failed to save home display mode:', error);
    }
};

export const getHomeDisplayMode = async (): Promise<'Overall' | 'Month' | null> => {
    try {
        const mode = await AsyncStorage.getItem(ASYNC_KEYS.HOME_SCREEN.DISPLAY_MODE);
        return (mode === 'Overall' || mode === 'Month') ? mode : null;
    } catch (error) {
        console.error('Failed to get home display mode:', error);
        return null;
    }
};

// ============= Insights Order (AsyncStorage) =============

export const saveInsightsCardOrder = async (order: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ASYNC_KEYS.INSIGHTS_SCREEN.CARD_ORDER, JSON.stringify(order));
    } catch (error) {
        console.error('Failed to save insights card order:', error);
    }
};

export const getInsightsCardOrder = async (): Promise<string[] | null> => {
    try {
        const data = await AsyncStorage.getItem(ASYNC_KEYS.INSIGHTS_SCREEN.CARD_ORDER);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get insights card order:', error);
        return null;
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
            DELETE FROM categories;
            DELETE FROM recurrence_rules;
            DELETE FROM budgets;
            DELETE FROM ai_usage_logs;
        `);

        DataCache.invalidateAllCaches();
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};

// ============= Bulk Operations =============

export const bulkSaveTransactions = async (transactions: Transaction[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const txn of transactions) {
                // Encrypt sensitive fields
                const encryptedAmount = await encryptField(txn.amount);
                const encryptedNote = txn.note ? await encryptField(txn.note) : null;

                await db.runAsync(
                    `INSERT OR REPLACE INTO transactions 
                     (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        txn.id,
                        txn.date,
                        encryptedAmount,
                        txn.type,
                        txn.category || null,
                        txn.subCategory || null,
                        encryptedNote,
                        txn.creationMethod || null,
                        txn.isRecurring ? 1 : 0,
                        txn.recurrenceId || null
                    ]
                );
            }
        });
        DataCache.invalidateTransactionCache();
    } catch (error) {
        console.error('Error bulk saving transactions:', error);
        throw new Error('Failed to bulk save transactions');
    }
};

export const bulkSaveInvestments = async (investments: Investment[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const inv of investments) {
                // Encrypt sensitive fields
                const encryptedQuantity = await encryptField(inv.quantity);
                const encryptedAvgPrice = await encryptField(inv.averageBuyPrice);
                const encryptedNotes = inv.notes ? await encryptField(inv.notes) : null;

                await db.runAsync(
                    `INSERT OR REPLACE INTO investments 
                     (id, symbol, name, type, quantity, averageBuyPrice, currentPrice, lastUpdated, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        inv.id,
                        inv.symbol,
                        inv.name,
                        inv.type,
                        encryptedQuantity,
                        encryptedAvgPrice,
                        inv.currentPrice || null,
                        inv.lastUpdated || null,
                        encryptedNotes
                    ]
                );
            }
        });
        DataCache.invalidateInvestmentCache();
    } catch (error) {
        console.error('Error bulk saving investments:', error);
        throw new Error('Failed to bulk save investments');
    }
};

export const bulkSaveCategories = async (categories: Category[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const cat of categories) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO categories 
                     (id, name, type, icon)
                     VALUES (?, ?, ?, ?)`,
                    [
                        cat.id,
                        cat.name,
                        cat.type,
                        cat.icon || null
                    ]
                );
            }
        });
        DataCache.invalidateCategoryCache();
    } catch (error) {
        console.error('Error bulk saving categories:', error);
        throw new Error('Failed to bulk save categories');
    }
};

export const bulkSaveRecurrenceRules = async (rules: RecurrenceRule[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const rule of rules) {
                // Encrypt the entire template
                const encryptedTemplate = await encryptField(JSON.stringify(rule.transactionTemplate));

                // Encrypt the name
                const encryptedName = rule.name ? await encryptField(rule.name) : null;

                await db.runAsync(
                    `INSERT OR REPLACE INTO recurrence_rules 
                     (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rule.id,
                        encryptedName,
                        rule.frequency,
                        rule.startDate || null,
                        rule.endDate || null,
                        rule.nextDueDate,
                        encryptedTemplate,
                        rule.isActive ? 1 : 0
                    ]
                );
            }
        });
        DataCache.invalidateRecurrenceRuleCache();
    } catch (error) {
        console.error('Error bulk saving recurrence rules:', error);
        throw new Error('Failed to bulk save recurrence rules');
    }
};

// ============= Reminders (SQLite) =============

export const saveReminder = async (reminder: Reminder): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt the title
        const encryptedTitle = await encryptField(reminder.title);

        await db.runAsync(
            `INSERT OR REPLACE INTO reminders 
             (id, title, frequency, startDate, times, isActive, lastTriggered, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reminder.id,
                encryptedTitle,
                reminder.frequency,
                reminder.startDate,
                JSON.stringify(reminder.times),
                reminder.isActive ? 1 : 0,
                reminder.lastTriggered || null,
                reminder.createdAt || new Date().toISOString(),
                new Date().toISOString()
            ]
        );
    } catch (error) {
        console.error('Error saving reminder:', error);
        throw new Error('Failed to save reminder');
    }
};

export const getAllReminders = async (): Promise<Reminder[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM reminders ORDER BY createdAt DESC');

        const reminders = await Promise.all(rows.map(async (row) => {
            const decryptedTitle = await decryptField(row.title);
            return {
                id: row.id,
                title: decryptedTitle || 'Untitled Reminder',
                frequency: row.frequency,
                startDate: row.startDate,
                times: JSON.parse(row.times),
                isActive: row.isActive === 1,
                lastTriggered: row.lastTriggered,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        }));

        return reminders;
    } catch (error) {
        console.error('Error getting reminders:', error);
        return [];
    }
};

export const deleteReminder = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting reminder:', error);
        throw new Error('Failed to delete reminder');
    }
};

// ============= Reminder Logs (SQLite) =============

export const saveReminderLog = async (log: ReminderLog): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO reminder_logs (id, reminderId, action, timestamp) VALUES (?, ?, ?, ?)`,
            [log.id, log.reminderId, log.action, log.timestamp]
        );
    } catch (error) {
        console.error('Error saving reminder log:', error);
    }
};

export const getReminderLogs = async (reminderId?: string, limit: number = 50): Promise<ReminderLog[]> => {
    try {
        const db = await getDatabase();
        let sql = 'SELECT * FROM reminder_logs';
        let params: any[] = [];

        if (reminderId) {
            sql += ' WHERE reminderId = ?';
            params.push(reminderId);
        }

        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const rows = await db.getAllAsync<any>(sql, params);
        return rows as ReminderLog[];
    } catch (error) {
        console.error('Error getting reminder logs:', error);
        return [];
    }
};

// ============= Smart Caching =============

export const getCachedTransactions = async (): Promise<Transaction[]> => {
    const cache = DataCache.getTransactionCache();
    if (DataCache.isValid(cache)) {
        return cache!.data;
    }

    const data = await getAllTransactions();
    DataCache.setTransactionCache(data);
    return data;
};

export const getCachedInvestments = async (): Promise<Investment[]> => {
    const cache = DataCache.getInvestmentCache();
    if (DataCache.isValid(cache)) {
        return cache!.data;
    }

    const data = await getAllInvestments();
    DataCache.setInvestmentCache(data);
    return data;
};

export const getCachedCategories = async (): Promise<Category[]> => {
    const cache = DataCache.getCategoryCache();
    if (DataCache.isValid(cache)) {
        return cache!.data;
    }

    const data = await getAllCategories();
    DataCache.setCategoryCache(data);
    return data;
};

export const getCachedRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
    const cache = DataCache.getRecurrenceRuleCache();
    if (DataCache.isValid(cache)) {
        return cache!.data;
    }

    const data = await getAllRecurrenceRules();
    DataCache.setRecurrenceRuleCache(data);
    return data;
};
