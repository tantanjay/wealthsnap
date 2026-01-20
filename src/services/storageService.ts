import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, Transaction, Investment, Category, RecurrenceRule, GeminiConfig } from '../types';
import { encryptData, decryptData, encryptField, decryptField } from './encryptionService';
import * as DataCache from './dataCache';
import { getDatabase } from './database/databaseService';

const KEYS = {
    USER_PROFILE: '@wealthsnap_user_profile',
    ONBOARDING_COMPLETE: '@wealthsnap_onboarding_complete',
    GEMINI_CONFIG: '@wealthsnap_gemini_config',
    HISTORY_PREFS: '@wealthsnap_history_prefs',
};

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
    await safeSave(KEYS.USER_PROFILE, profile);
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    return await safeGet<UserProfile>(KEYS.USER_PROFILE);
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
        DataCache.invalidateTransactionCache();
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error('Failed to save transaction');
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
        DataCache.invalidateTransactionCache();
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

        await db.runAsync(
            `INSERT OR REPLACE INTO recurrence_rules 
             (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                rule.id,
                rule.name || null,
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
            } catch (e) {
                // Fallback for unencrypted data (migration transition)
                try {
                    template = JSON.parse(row.transactionTemplate);
                } catch (pe) {
                    console.error('Failed to parse transaction template');
                }
            }

            return {
                id: row.id,
                name: row.name,
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
        await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (error) {
        console.error('Error setting onboarding complete:', error);
    }
};

export const isOnboardingComplete = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
};

// ============= Gemini Config (AsyncStorage) =============

const SECURE_KEY_API_KEY = 'wealthsnap_gemini_api_key';

export const saveGeminiConfig = async (config: GeminiConfig): Promise<void> => {
    try {
        if (config.apiKey) {
            await SecureStore.setItemAsync(SECURE_KEY_API_KEY, config.apiKey);
        } else {
            await SecureStore.deleteItemAsync(SECURE_KEY_API_KEY).catch(() => { });
        }
        await AsyncStorage.setItem(KEYS.GEMINI_CONFIG, JSON.stringify({ modelId: config.modelId }));
    } catch (error) {
        console.error('Failed to save Gemini config:', error);
        throw error;
    }
};

export const getGeminiConfig = async (): Promise<GeminiConfig | null> => {
    try {
        const apiKey = await SecureStore.getItemAsync(SECURE_KEY_API_KEY);
        const data = await AsyncStorage.getItem(KEYS.GEMINI_CONFIG);
        const config = data ? JSON.parse(data) : {};
        return {
            apiKey: apiKey || undefined,
            modelId: config.modelId
        };
    } catch (error) {
        console.error('Failed to get Gemini config:', error);
        return null;
    }
};

// ============= History Preferences (AsyncStorage) =============

export const saveHistoryTimeFrame = async (timeFrame: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(KEYS.HISTORY_PREFS, JSON.stringify({ timeFrame }));
    } catch (error) {
        console.error('Failed to save history prefs:', error);
    }
};

export const getHistoryTimeFrame = async (): Promise<string | null> => {
    try {
        const data = await AsyncStorage.getItem(KEYS.HISTORY_PREFS);
        return data ? JSON.parse(data).timeFrame : null;
    } catch (error) {
        console.error('Failed to get history prefs:', error);
        return null;
    }
};

// ============= Clear All Data =============

export const clearAllData = async (): Promise<void> => {
    try {
        // Clear AsyncStorage
        await AsyncStorage.multiRemove([
            KEYS.USER_PROFILE,
            KEYS.ONBOARDING_COMPLETE,
            KEYS.GEMINI_CONFIG,
            KEYS.HISTORY_PREFS,
        ]);
        await SecureStore.deleteItemAsync(SECURE_KEY_API_KEY).catch(() => { });

        // Clear SQLite
        const db = await getDatabase();
        await db.execAsync(`
            DELETE FROM transactions;
            DELETE FROM investments;
            DELETE FROM categories;
            DELETE FROM recurrence_rules;
            DELETE FROM budgets;
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

                await db.runAsync(
                    `INSERT OR REPLACE INTO recurrence_rules 
                     (id, name, frequency, startDate, endDate, nextDueDate, transactionTemplate, isActive)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rule.id,
                        rule.name || null,
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
