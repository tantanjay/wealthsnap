import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, Transaction, Investment, Category, RecurrenceRule, GeminiConfig } from '../types';
import { encryptData, decryptData } from './encryptionService';

const KEYS = {
    USER_PROFILE: '@wealthsnap_user_profile',
    TRANSACTIONS: '@wealthsnap_transactions',
    INVESTMENTS: '@wealthsnap_investments',
    CATEGORIES: '@wealthsnap_categories',
    RECURRENCE_RULES: '@wealthsnap_recurrence_rules',
    ONBOARDING_COMPLETE: '@wealthsnap_onboarding_complete',
    GEMINI_CONFIG: '@wealthsnap_gemini_config',
};

// Helper to safely read Encrypted OR Plaintext data (Migration Logic)
const safeGet = async <T>(key: string): Promise<T | null> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        // Try decrypting first
        const decrypted = await decryptData(raw);
        if (decrypted) return decrypted;

        // If decryption returns null/empty, it might be legacy plain JSON (or initial dev data)
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

// Helper to save encrypted
const safeSave = async (key: string, data: any): Promise<void> => {
    try {
        const encrypted = await encryptData(data);
        await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
        console.error(`Error saving ${key}`, error);
        throw error; // Re-throw to handle UI errors
    }
};

// ============= User Profile =============

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

// ============= Transactions =============

export const saveTransaction = async (transaction: Transaction): Promise<void> => {
    try {
        const transactions = await getAllTransactions();
        const index = transactions.findIndex(t => t.id === transaction.id);
        if (index >= 0) {
            transactions[index] = transaction;
        } else {
            transactions.push(transaction);
        }
        await safeSave(KEYS.TRANSACTIONS, transactions);
    } catch (error) {
        console.error('Error saving transaction:', error);
        throw new Error('Failed to save transaction');
    }
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
    return (await safeGet<Transaction[]>(KEYS.TRANSACTIONS)) || [];
};

export const deleteTransaction = async (id: string): Promise<void> => {
    try {
        const transactions = await getAllTransactions();
        const filtered = transactions.filter(t => t.id !== id);
        await safeSave(KEYS.TRANSACTIONS, filtered);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw new Error('Failed to delete transaction');
    }
};

// ============= Investments =============

export const saveInvestment = async (investment: Investment): Promise<void> => {
    try {
        const investments = await getAllInvestments();
        const index = investments.findIndex(i => i.id === investment.id);
        if (index >= 0) {
            investments[index] = investment;
        } else {
            investments.push(investment);
        }
        await safeSave(KEYS.INVESTMENTS, investments);
    } catch (error) {
        console.error('Error saving investment:', error);
        throw new Error('Failed to save investment');
    }
};

export const getAllInvestments = async (): Promise<Investment[]> => {
    return (await safeGet<Investment[]>(KEYS.INVESTMENTS)) || [];
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const investments = await getAllInvestments();
        const filtered = investments.filter(i => i.id !== id);
        await safeSave(KEYS.INVESTMENTS, filtered);
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};

// ============= Categories =============

export const saveCategory = async (category: Category): Promise<void> => {
    try {
        const categories = await getAllCategories();
        const index = categories.findIndex(c => c.id === category.id);
        if (index >= 0) {
            categories[index] = category;
        } else {
            categories.push(category);
        }
        await safeSave(KEYS.CATEGORIES, categories);
    } catch (error) {
        console.error('Error saving category:', error);
        throw new Error('Failed to save category');
    }
};

export const getAllCategories = async (): Promise<Category[]> => {
    return (await safeGet<Category[]>(KEYS.CATEGORIES)) || [];
};

// ============= Recurrence Rules =============

export const saveRecurrenceRule = async (rule: RecurrenceRule): Promise<void> => {
    try {
        const rules = await getAllRecurrenceRules();
        const index = rules.findIndex(r => r.id === rule.id);
        if (index >= 0) {
            rules[index] = rule;
        } else {
            rules.push(rule);
        }
        await safeSave(KEYS.RECURRENCE_RULES, rules);
    } catch (error) {
        console.error('Error saving recurrence rule:', error);
        throw new Error('Failed to save recurrence rule');
    }
};

export const getAllRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
    return (await safeGet<RecurrenceRule[]>(KEYS.RECURRENCE_RULES)) || [];
};

// ============= Onboarding =============

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

// ============= Gemini Config =============

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

// ============= Clear All Data =============

export const clearAllData = async (): Promise<void> => {
    try {
        await AsyncStorage.multiRemove([
            KEYS.USER_PROFILE,
            KEYS.TRANSACTIONS,
            KEYS.INVESTMENTS,
            KEYS.CATEGORIES,
            KEYS.RECURRENCE_RULES,
            KEYS.ONBOARDING_COMPLETE,
            KEYS.GEMINI_CONFIG,
        ]);
        await SecureStore.deleteItemAsync(SECURE_KEY_API_KEY).catch(() => { });
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};
