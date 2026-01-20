import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'wealthsnap.db';
export const DATABASE_VERSION = 1;

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
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
            category TEXT,
            subCategory TEXT,
            note TEXT,
            creationMethod TEXT,
            isRecurring INTEGER DEFAULT 0,
            recurrenceId TEXT,
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
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('STOCK', 'CRYPTO', 'ETF', 'BOND', 'FUND', 'OTHER')),
            quantity REAL NOT NULL DEFAULT 0,
            averageBuyPrice REAL NOT NULL DEFAULT 0,
            currentPrice REAL,
            lastUpdated TEXT,
            notes TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol);
        CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);

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
            assetId TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT,
            FOREIGN KEY (assetId) REFERENCES investments(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_price_history_asset ON price_history(assetId);
        CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_price_history_asset_timestamp ON price_history(assetId, timestamp DESC);

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
            costUSD REAL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_usage_logs(timestamp DESC);
    `);

    console.log('[Database] Tables and indexes created successfully');
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
