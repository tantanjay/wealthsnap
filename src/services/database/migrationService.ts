import AsyncStorage from '@react-native-async-storage/async-storage';

import { Transaction, Category, RecurrenceRule } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { decryptData, encryptField } from '@services/core/encryptionService';

const ASYNC_STORAGE_KEYS = {
    TRANSACTIONS: '@wealthsnap_transactions',
    INVESTMENTS: '@wealthsnap_investments',
    CATEGORIES: '@wealthsnap_categories',
    RECURRENCE_RULES: '@wealthsnap_recurrence_rules'
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
};

/**
 * Read and decrypt data from AsyncStorage
 */
const readAsyncStorageData = async <T>(key: string): Promise<T[]> => {
    try {
        const encrypted = await AsyncStorage.getItem(key);
        if (!encrypted) {
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
        return 0;
    }

    for (const txn of transactions) {
        // Encrypt sensitive fields
        const encryptedAmount = await encryptField(txn.amount);
        const encryptedNote = txn.note ? await encryptField(txn.note) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO transactions 
        (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, linkedTransactionId, investmentId, debtId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                txn.recurrenceId || null,
                txn.transferAccount || null,
                txn.linkedTransactionId || null,
                txn.investmentId || null,
                txn.debtId || null
            ]
        );
    }

    return transactions.length;
};

/**
 * Migrate categories from AsyncStorage to SQLite
 */
const migrateCategories = async (db: any): Promise<number> => {
    const categories = await readAsyncStorageData<Category>(ASYNC_STORAGE_KEYS.CATEGORIES);

    if (categories.length === 0) {
        return 0;
    }

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

    return categories.length;
};

/**
 * Migrate recurrence rules from AsyncStorage to SQLite
 */
const migrateRecurrenceRules = async (db: any): Promise<number> => {
    const rules = await readAsyncStorageData<RecurrenceRule>(ASYNC_STORAGE_KEYS.RECURRENCE_RULES);

    if (rules.length === 0) {
        return 0;
    }

    for (const rule of rules) {
        // Encrypt the entire template
        const encryptedTemplate = await encryptField(JSON.stringify(rule.transactionTemplate));

        // Encrypt the name (V2 requirement)
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

    return rules.length;
};

/**
 * Migrate from V1 to V2: Encrypt Recurrence Rule Names
 */
export const migrateV1ToV2 = async (db: any): Promise<void> => {
    try {
        const rules = await db.getAllAsync('SELECT * FROM recurrence_rules');

        await db.withTransactionAsync(async () => {
            for (const rule of rules) {
                // Skip if name is null/empty
                if (!rule.name) continue;

                // Encrypt the name
                const encryptedName = await encryptField(rule.name);

                // Update the record
                await db.runAsync(
                    'UPDATE recurrence_rules SET name = ? WHERE id = ?',
                    [encryptedName, rule.id]
                );
            }
        });

    } catch (error) {
        console.error('[Migration] ❌ V1 -> V2 migration failed:', error);
        throw error;
    }
};

/**
 * Migrate from V2 to V5: Add costUSD to ai_usage_logs
 */
export const migrateV2ToV5 = async (db: any): Promise<void> => {
    try {
        // 1. Check if we actually need to migrate by checking column type
        const tableInfo = await db.getAllAsync("PRAGMA table_info(ai_usage_logs)");
        const costCol = tableInfo.find((col: any) => col.name === 'costUSD');

        // If column is already TEXT, we're done.
        if (costCol && costCol.type.toUpperCase() === 'TEXT') return;

        // 2. Start a transaction for safety
        await db.runAsync('BEGIN TRANSACTION');

        // 3. Create a new table with the desired schema
        // Note: Replace "..." with your other existing columns
        await db.runAsync(`
            CREATE TABLE ai_usage_logs_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                other_col TEXT,
                costUSD TEXT DEFAULT "0"
            )
        `);

        // 4. Copy data, casting the old REAL values to TEXT
        await db.runAsync(`
            INSERT INTO ai_usage_logs_new (id, other_col, costUSD)
            SELECT id, other_col, CAST(costUSD AS TEXT)
            FROM ai_usage_logs
        `);

        // 5. Drop old table and rename new one
        await db.runAsync('DROP TABLE ai_usage_logs');
        await db.runAsync('ALTER TABLE ai_usage_logs_new RENAME TO ai_usage_logs');

        await db.runAsync('COMMIT');
    } catch (error: any) {
        await db.runAsync('ROLLBACK');
        console.error('[Migration] ❌ V2 -> V5 migration failed:', error);
        throw error;
    }
};

export const migrateV5ToV6 = async (db: any): Promise<void> => {
    try {
        // 1. Start transaction
        await db.runAsync('BEGIN TRANSACTION');

        // 2. Create new table with updated schema
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS transactions_new (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                amount TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT')),
                category TEXT,
                subCategory TEXT,
                note TEXT,
                creationMethod TEXT,
                isRecurring INTEGER DEFAULT 0,
                recurrenceId TEXT,
                transferAccount TEXT CHECK(transferAccount IN ('OTHER_ACCOUNT', 'INVESTMENTS', 'DEBT', 'CASH_ATM', 'DIGITAL_WALLET', 'CRYPTO', 'RECEIVABLE', 'TIME_DEPOSIT')),
                linkedTransactionId TEXT,
                investmentId TEXT,
                debtId TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Copy existing data
        await db.runAsync(`
            INSERT INTO transactions_new (
                id, date, amount, type, category, subCategory, note, 
                creationMethod, isRecurring, recurrenceId, createdAt, updatedAt
            )
            SELECT 
                id, date, amount, type, category, subCategory, note, 
                creationMethod, isRecurring, recurrenceId, createdAt, updatedAt
            FROM transactions
        `);

        // 4. Drop old table
        await db.runAsync('DROP TABLE transactions');

        // 5. Rename new table
        await db.runAsync('ALTER TABLE transactions_new RENAME TO transactions');

        // 6. Recreate indexes
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(isRecurring)');

        // 7. Drop investments table
        await db.runAsync('DROP TABLE investments');

        // 8. Create investments table
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS investments (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                symbol TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('STOCKS', 'FUNDS', 'BONDS', 'CRYPTO', 'COMMODITIES', 'OTHERS')),
                action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST')),
                quantity TEXT NOT NULL,
                price TEXT NOT NULL,
                fees TEXT,
                notes TEXT,
                creationMethod TEXT,
                isRecurring INTEGER DEFAULT 0,
                recurrenceId TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date DESC)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_investments_action ON investments(action)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_investments_recurring ON investments(isRecurring)');

        // 9. Commit
        await db.runAsync('COMMIT');

    } catch (error: any) {
        await db.runAsync('ROLLBACK');
        console.error('[Migration] ❌ V5 -> V6 migration failed:', error);
        throw error;
    }
};

export const migrateV6ToV7 = async (db: any): Promise<void> => {
    try {
        await db.runAsync('BEGIN TRANSACTION');

        // Drop price_history table if it exists
        await db.runAsync('DROP TABLE IF EXISTS price_history');

        // Recreate price_history table with new schema
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS price_history (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                price TEXT NOT NULL,
                high TEXT,
                low TEXT,
                volume TEXT,
                timestamp TEXT NOT NULL,
                source TEXT
            )
        `);

        // Recreate indexes
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC)');
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC)');

        await db.runAsync('COMMIT');
    } catch (error: any) {
        await db.runAsync('ROLLBACK');
        console.error('[Migration] ❌ V6 -> V7 migration failed:', error);
        throw error;
    }
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
            onProgress?.('Migrating transactions...', 1, 3);
            counts.transactions = await migrateTransactions(db);

            onProgress?.('Migrating categories...', 2, 3);
            counts.categories = await migrateCategories(db);

            onProgress?.('Migrating recurrence rules...', 3, 3);
            counts.recurrenceRules = await migrateRecurrenceRules(db);
        });

        // Validate migration
        const valid = await validateMigration(db, counts);

        if (!valid) {
            throw new Error('Migration validation failed - data counts do not match');
        }

        // Mark migration complete
        await markMigrationComplete();

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
