import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_KEYS } from '@constants/config';

export const DATABASE_NAME = 'wealthsnap.db';
export const DATABASE_VERSION = 11;

/**
 * Create all database tables and indexes
 */
export const createTables = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    await db.execAsync(`
        -- Metadata table for versioning and migration tracking
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            amount TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CAPITAL_LOSS', 'CAPITAL_GAIN')),
            category TEXT,
            subCategory TEXT,
            note TEXT,
            creationMethod TEXT,
            isRecurring INTEGER DEFAULT 0,
            recurrenceId TEXT,
            transferAccount TEXT CHECK(transferAccount IN ('OTHER_ACCOUNT', 'INVESTMENTS', 'DEBT', 'CASH_ATM', 'DIGITAL_WALLET', 'CRYPTO', 'RECEIVABLE', 'TIME_DEPOSIT', 'LOAN', 'CREDIT_CARD', 'MORTGAGE', 'STUDENT_LOAN', 'I_OWE_YOU', 'YOU_OWE_ME')),
            linkedTransactionId TEXT,
            investmentId TEXT,
            debtId TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
        CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(isRecurring);

        -- Investments table
        CREATE TABLE IF NOT EXISTS investments (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            symbol TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('STOCKS', 'FUNDS', 'BONDS', 'CRYPTO', 'COMMODITIES', 'OTHERS')),
            action TEXT NOT NULL CHECK(action IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST')),
            quantity TEXT NOT NULL,
            price TEXT NOT NULL,
            currency TEXT NOT NULL DEFAULT 'PHP',
            exchange_rate TEXT DEFAULT '1',
            fees TEXT,
            notes TEXT,
            creationMethod TEXT,
            isRecurring INTEGER DEFAULT 0,
            recurrenceId TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date DESC);
        CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol);
        CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
        CREATE INDEX IF NOT EXISTS idx_investments_action ON investments(action);
        CREATE INDEX IF NOT EXISTS idx_investments_recurring ON investments(isRecurring);

        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE', 'BOTH')),
            icon TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);

        -- Recurrence rules table
        CREATE TABLE IF NOT EXISTS recurrence_rules (
            id TEXT PRIMARY KEY,
            name TEXT,
            frequency TEXT NOT NULL,
            startDate TEXT,
            endDate TEXT,
            nextDueDate TEXT NOT NULL,
            transactionTemplate TEXT NOT NULL, -- JSON string of transaction template
            isActive INTEGER DEFAULT 1,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_recurrence_active ON recurrence_rules(isActive);
        CREATE INDEX IF NOT EXISTS idx_recurrence_next_due ON recurrence_rules(nextDueDate);

        -- Budgets table
        CREATE TABLE IF NOT EXISTS budgets (
            category TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Price history table (for future investment features)
        CREATE TABLE IF NOT EXISTS price_history (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            price TEXT NOT NULL,
            high TEXT,
            low TEXT,
            volume TEXT,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL CHECK(source IN ('MANUAL', 'AI_FETCH')),
            currency TEXT DEFAULT 'PHP',
            exchangeRate TEXT DEFAULT '1',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (symbol) REFERENCES assets(symbol) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
        CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC);

        -- Assets table (Metadata for symbols)
        CREATE TABLE IF NOT EXISTS assets (
            symbol TEXT PRIMARY KEY,
            name TEXT,
            exchange TEXT,
            sector TEXT,
            type TEXT,
            currency TEXT,
            description TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
        CREATE INDEX IF NOT EXISTS idx_assets_sector ON assets(sector);

        -- Dividend History table
        CREATE TABLE IF NOT EXISTS dividend_history (
            id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            exDate TEXT NOT NULL,
            paymentDate TEXT,
            recordDate TEXT,
            amount TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('CASH', 'STOCK', 'SPECIAL', 'PROPERTY')),
            status TEXT NOT NULL CHECK(status IN ('DECLARED', 'PAID', 'PROJECTED')),
            source TEXT NOT NULL CHECK(source IN ('MANUAL', 'AI_FETCH')),
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (symbol) REFERENCES assets(symbol) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_dividend_history_symbol ON dividend_history(symbol);
        CREATE INDEX IF NOT EXISTS idx_dividend_history_exDate ON dividend_history(exDate DESC);

        -- AI Usage logs table
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('success', 'error')),
            inputTokens INTEGER DEFAULT 0,
            outputTokens INTEGER DEFAULT 0,
            imageCount INTEGER DEFAULT 0,
            durationMs INTEGER DEFAULT 0,
            costUSD TEXT DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_usage_logs(timestamp DESC);

        -- Transaction Receipts table (Encrypted)
        CREATE TABLE IF NOT EXISTS transaction_receipts (
            transactionId TEXT PRIMARY KEY,
            receiptData TEXT NOT NULL, -- Encrypted JSON
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
        );

        -- Reminders table
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL, -- Encrypted
            frequency TEXT NOT NULL,
            startDate TEXT NOT NULL,
            times TEXT NOT NULL, -- JSON array of HH:mm
            isActive INTEGER DEFAULT 1,
            lastTriggered TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(isActive);

        -- Reminder logs table
        CREATE TABLE IF NOT EXISTS reminder_logs (
            id TEXT PRIMARY KEY,
            reminderId TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (reminderId) REFERENCES reminders(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder ON reminder_logs(reminderId);
        CREATE INDEX IF NOT EXISTS idx_reminder_logs_timestamp ON reminder_logs(timestamp DESC);

        CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,                  
            type TEXT NOT NULL CHECK(type IN (
                'LOAN', 'CREDIT_CARD', 'MORTGAGE', 'STUDENT_LOAN', 'I_OWE_YOU', 'YOU_OWE_ME'
            )),
            direction TEXT NOT NULL CHECK(direction IN ('PAYABLE', 'RECEIVABLE')),
            initialAmount TEXT NOT NULL,         
            currency TEXT DEFAULT 'PHP',
            interestRate TEXT DEFAULT 0,         
            interestType TEXT DEFAULT 'FIXED' CHECK(interestType IN ('FIXED', 'VARIABLE', 'FLAT', 'NONE')),
            minPayment TEXT DEFAULT 0,  
            fees TEXT,         
            startDate TEXT,                      
            termMonths TEXT,                  
            dueDate TEXT,                        
            status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PAID_OFF', 'FORGIVEN')),
            notes TEXT,
            contactId TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
        CREATE INDEX IF NOT EXISTS idx_debts_type ON debts(type);
        CREATE INDEX IF NOT EXISTS idx_debts_direction ON debts(direction);
    `);

};

/**
 * Initialize database version
 */
export const setDatabaseVersion = async (db: SQLite.SQLiteDatabase, version: number): Promise<void> => {
    await db.runAsync(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
        ['database_version', version.toString()]
    );
};

/**
 * Get database version
 */
export const getDatabaseVersion = async (db: SQLite.SQLiteDatabase): Promise<number> => {
    try {
        const result = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM metadata WHERE key = ?',
            ['database_version']
        );
        return result ? parseInt(result.value, 10) : 0;
    } catch {
        return 0;
    }
};

/**
 * Migrate to Version 8: Add currency to price_history
 */
export const migrateToVersion8 = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        console.log('[Migration] Starting migration to version 8...');

        // 1. Add column if not exists
        // Note: SQLite ALTER TABLE ADD COLUMN silently fails if column exists, or we can check pragma.
        // For simplicity in this env, we just try to add it.
        try {
            await db.execAsync(`ALTER TABLE price_history ADD COLUMN currency TEXT DEFAULT 'PHP'`);
            await db.execAsync(`ALTER TABLE investments ADD COLUMN currency TEXT DEFAULT 'PHP'`);
        } catch (e) {
            console.log('[Migration] Column currency might already exist or error:', e);
        }

        // 2. Fetch User Profile for default currency
        let defaultCurrency = 'PHP';
        try {
            const profileRaw = await AsyncStorage.getItem(ASYNC_KEYS.USER_PROFILE);
            if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                if (profile && profile.currency) {
                    defaultCurrency = profile.currency;
                }
            }
        } catch (e) {
            console.warn('[Migration] Failed to fetch user profile currency, defaulting to PHP', e);
        }

        console.log(`[Migration] Defaulting price_history currency to: ${defaultCurrency}`);

        // 3. Update existing records
        await db.runAsync(`UPDATE price_history SET currency = ?`, [defaultCurrency]);
        await db.runAsync(`UPDATE investments SET currency = ?`, [defaultCurrency]);

        // 4. Update Version
        await setDatabaseVersion(db, 8);
        console.log('[Migration] Successfully migrated to version 8');

    } catch (error) {
        console.error('[Migration] Failed version 8 migration:', error);
        throw error;
    }
};

/**
 * Migrate to Version 9: Add exchange_rate to investments
 */
export const migrateToVersion9 = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        console.log('[Migration] Starting migration to version 9...');

        try {
            await db.execAsync(`ALTER TABLE investments ADD COLUMN exchange_rate TEXT DEFAULT '1'`);
        } catch (e) {
            console.log('[Migration] Column exchange_rate might already exist or error:', e);
        }

        await setDatabaseVersion(db, 9);
        console.log('[Migration] Successfully migrated to version 9');

    } catch (error) {
        console.error('[Migration] Failed version 9 migration:', error);
        throw error;
    }
};

/**
 * Migrate to Version 10: Add exchangeRate to price_history
 */
export const migrateToVersion10 = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        console.log('[Migration] Starting migration to version 10...');

        // 1. Add column if not exists
        try {
            await db.execAsync(`ALTER TABLE price_history ADD COLUMN exchangeRate TEXT DEFAULT '1'`);
        } catch (e) {
            console.log('[Migration] Column exchangeRate might already exist or error:', e);
        }

        // 2. Update Version
        await setDatabaseVersion(db, 10);
        console.log('[Migration] Successfully migrated to version 10');

    } catch (error) {
        console.error('[Migration] Failed version 10 migration:', error);
        throw error;
    }
};
/**
 * Migrate to Version 11: Update transactions table check constraint for transferAccount
 */
export const migrateToVersion11 = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        console.log('[Migration] Starting migration to version 11...');

        // 1. Rename existing table
        await db.execAsync('ALTER TABLE transactions RENAME TO transactions_old');

        // 2. Create new table with updated CHECK constraint
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                amount TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT', 'CAPITAL_LOSS', 'CAPITAL_GAIN')),
                category TEXT,
                subCategory TEXT,
                note TEXT,
                creationMethod TEXT,
                isRecurring INTEGER DEFAULT 0,
                recurrenceId TEXT,
                transferAccount TEXT CHECK(transferAccount IN ('OTHER_ACCOUNT', 'INVESTMENTS', 'DEBT', 'CASH_ATM', 'DIGITAL_WALLET', 'CRYPTO', 'RECEIVABLE', 'TIME_DEPOSIT', 'LOAN', 'CREDIT_CARD', 'MORTGAGE', 'STUDENT_LOAN', 'I_OWE_YOU', 'YOU_OWE_ME')),
                linkedTransactionId TEXT,
                investmentId TEXT,
                debtId TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Copy data
        await db.execAsync(`
            INSERT INTO transactions (id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, linkedTransactionId, investmentId, debtId, createdAt, updatedAt)
            SELECT id, date, amount, type, category, subCategory, note, creationMethod, isRecurring, recurrenceId, transferAccount, linkedTransactionId, investmentId, debtId, createdAt, updatedAt
            FROM transactions_old
        `);

        // 4. Drop old table
        await db.execAsync('DROP TABLE transactions_old');

        // 5. Recreate Indexes
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
            CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
            CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(isRecurring);
        `);

        // 6. Update Version
        await setDatabaseVersion(db, 11);
        console.log('[Migration] Successfully migrated to version 11');

    } catch (error) {
        console.error('[Migration] Failed version 11 migration:', error);
        throw error;
    }
};
