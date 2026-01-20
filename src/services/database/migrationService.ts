import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from './databaseService';
import { decryptData, encryptField } from '../encryptionService';
import { Transaction, Investment, Category, RecurrenceRule } from '../../types';
import { Budget } from '../budgetService';

const ASYNC_STORAGE_KEYS = {
    TRANSACTIONS: '@wealthsnap_transactions',
    INVESTMENTS: '@wealthsnap_investments',
    CATEGORIES: '@wealthsnap_categories',
    RECURRENCE_RULES: '@wealthsnap_recurrence_rules',
    BUDGETS: '@budgets',
};

/**
 * Check if migration from AsyncStorage to SQLite is needed
 */
export const isMigrationNeeded = async (): Promise<boolean> => {
    try {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM metadata WHERE key = ?',
            ['migration_complete']
        );
        return result?.value !== 'true';
    } catch (error) {
        console.error('[Migration] Error checking migration status:', error);
        return true; // Assume migration needed on error
    }
};

/**
 * Mark migration as complete
 */
const markMigrationComplete = async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
        ['migration_complete', 'true']
    );
    console.log('[Migration] Marked as complete');
};

/**
 * Read and decrypt data from AsyncStorage
 */
const readAsyncStorageData = async <T>(key: string): Promise<T[]> => {
    try {
        const encrypted = await AsyncStorage.getItem(key);
        if (!encrypted) {
            console.log(`[Migration] No data found for key: ${key}`);
            return [];
        }

        // Try decrypting first (for encrypted data)
        try {
            const decrypted = await decryptData(encrypted);
            if (decrypted) {
                return Array.isArray(decrypted) ? decrypted : [];
            }
        } catch {
            // Decryption failed - likely plain JSON, will try parsing below
            // This is expected for some data types like budgets that weren't encrypted
        }

        // Fallback to plain JSON (legacy/dev data or non-encrypted data)
        try {
            const parsed = JSON.parse(encrypted);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            console.warn(`[Migration] Could not parse data for key: ${key}`);
            return [];
        }
    } catch (error) {
        console.error(`[Migration] Error reading ${key}:`, error);
        return [];
    }
};

/**
 * Migrate transactions from AsyncStorage to SQLite
 */
const migrateTransactions = async (db: any): Promise<number> => {
    const transactions = await readAsyncStorageData<Transaction>(ASYNC_STORAGE_KEYS.TRANSACTIONS);

    if (transactions.length === 0) {
        console.log('[Migration] No transactions to migrate');
        return 0;
    }

    console.log(`[Migration] Migrating ${transactions.length} transactions...`);

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

    console.log(`[Migration] ✅ Migrated ${transactions.length} transactions`);
    return transactions.length;
};

/**
 * Migrate investments from AsyncStorage to SQLite
 */
const migrateInvestments = async (db: any): Promise<number> => {
    const investments = await readAsyncStorageData<Investment>(ASYNC_STORAGE_KEYS.INVESTMENTS);

    if (investments.length === 0) {
        console.log('[Migration] No investments to migrate');
        return 0;
    }

    console.log(`[Migration] Migrating ${investments.length} investments...`);

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

    console.log(`[Migration] ✅ Migrated ${investments.length} investments`);
    return investments.length;
};

/**
 * Migrate categories from AsyncStorage to SQLite
 */
const migrateCategories = async (db: any): Promise<number> => {
    const categories = await readAsyncStorageData<Category>(ASYNC_STORAGE_KEYS.CATEGORIES);

    if (categories.length === 0) {
        console.log('[Migration] No categories to migrate');
        return 0;
    }

    console.log(`[Migration] Migrating ${categories.length} categories...`);

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

    console.log(`[Migration] ✅ Migrated ${categories.length} categories`);
    return categories.length;
};

/**
 * Migrate recurrence rules from AsyncStorage to SQLite
 */
const migrateRecurrenceRules = async (db: any): Promise<number> => {
    const rules = await readAsyncStorageData<RecurrenceRule>(ASYNC_STORAGE_KEYS.RECURRENCE_RULES);

    if (rules.length === 0) {
        console.log('[Migration] No recurrence rules to migrate');
        return 0;
    }

    console.log(`[Migration] Migrating ${rules.length} recurrence rules...`);

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

    console.log(`[Migration] ✅ Migrated ${rules.length} recurrence rules`);
    return rules.length;
};

/**
 * Migrate budgets from AsyncStorage to SQLite
 */
const migrateBudgets = async (db: any): Promise<number> => {
    const budgets = await readAsyncStorageData<Budget>(ASYNC_STORAGE_KEYS.BUDGETS);

    if (budgets.length === 0) {
        console.log('[Migration] No budgets to migrate');
        return 0;
    }

    console.log(`[Migration] Migrating ${budgets.length} budgets...`);

    for (const budget of budgets) {
        const encryptedAmount = await encryptField(budget.amount);
        await db.runAsync(
            `INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)`,
            [budget.category, encryptedAmount]
        );
    }

    console.log(`[Migration] ✅ Migrated ${budgets.length} budgets`);
    return budgets.length;
};

/**
 * Validate migration by comparing counts
 */
const validateMigration = async (db: any, counts: { [key: string]: number }): Promise<boolean> => {
    try {
        const txnCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM transactions') as { count: number } | null;
        const invCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM investments') as { count: number } | null;
        const catCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories') as { count: number } | null;
        const ruleCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM recurrence_rules') as { count: number } | null;
        const budgetCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM budgets') as { count: number } | null;

        const valid =
            txnCount?.count === counts.transactions &&
            invCount?.count === counts.investments &&
            catCount?.count === counts.categories &&
            ruleCount?.count === counts.recurrenceRules &&
            budgetCount?.count === counts.budgets;

        if (!valid) {
            console.error('[Migration] ❌ Validation failed!');
            console.error('Expected:', counts);
            console.error('Actual:', {
                transactions: txnCount?.count,
                investments: invCount?.count,
                categories: catCount?.count,
                recurrenceRules: ruleCount?.count,
                budgets: budgetCount?.count
            });
        }

        return valid;
    } catch (error) {
        console.error('[Migration] Validation error:', error);
        return false;
    }
};

/**
 * Main migration function - migrate all data from AsyncStorage to SQLite
 */
export const migrateFromAsyncStorage = async (
    onProgress?: (step: string, current: number, total: number) => void
): Promise<{ success: boolean; counts: { [key: string]: number } }> => {
    console.log('[Migration] 🚀 Starting migration from AsyncStorage to SQLite...');

    const counts = {
        transactions: 0,
        investments: 0,
        categories: 0,
        recurrenceRules: 0,
        budgets: 0
    };

    try {
        const db = await getDatabase();

        // Migrate all data in a single transaction for atomicity
        await db.withTransactionAsync(async () => {
            onProgress?.('Migrating transactions...', 1, 5);
            counts.transactions = await migrateTransactions(db);

            onProgress?.('Migrating investments...', 2, 5);
            counts.investments = await migrateInvestments(db);

            onProgress?.('Migrating categories...', 3, 5);
            counts.categories = await migrateCategories(db);

            onProgress?.('Migrating recurrence rules...', 4, 5);
            counts.recurrenceRules = await migrateRecurrenceRules(db);

            onProgress?.('Migrating budgets...', 5, 5);
            counts.budgets = await migrateBudgets(db);
        });

        // Validate migration
        console.log('[Migration] Validating migration...');
        const valid = await validateMigration(db, counts);

        if (!valid) {
            throw new Error('Migration validation failed - data counts do not match');
        }

        // Mark migration complete
        await markMigrationComplete();

        console.log('[Migration] ✅ Migration completed successfully!');
        console.log('[Migration] Summary:', counts);

        return { success: true, counts };
    } catch (error) {
        console.error('[Migration] ❌ Migration failed:', error);
        return { success: false, counts };
    }
};

/**
 * Check if AsyncStorage has any data (for fresh installs)
 */
export const hasAsyncStorageData = async (): Promise<boolean> => {
    try {
        const txnData = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TRANSACTIONS);
        const invData = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.INVESTMENTS);
        return !!(txnData || invData);
    } catch (error) {
        console.error('[Migration] Error checking AsyncStorage data:', error);
        return false;
    }
};
