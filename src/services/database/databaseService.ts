import * as SQLite from 'expo-sqlite';
import { createTables, setDatabaseVersion, getDatabaseVersion, DATABASE_NAME, DATABASE_VERSION } from './databaseSchema';

let databaseInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create database connection
 */
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (databaseInstance) {
        return databaseInstance;
    }

    databaseInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Initialize tables
    await initializeDatabase(databaseInstance);

    return databaseInstance;
};

/**
 * Initialize database (create tables, indexes, etc.)
 */
export const initializeDatabase = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        // Create all tables and indexes
        await createTables(db);

        // Check and set database version
        const currentVersion = await getDatabaseVersion(db);
        if (currentVersion === 0) {
            await setDatabaseVersion(db, DATABASE_VERSION);
        } else if (currentVersion < DATABASE_VERSION) {
            if (currentVersion === 1) {
                // Import dynamically to avoid circular dependencies if possible, or just standard import
                const { migrateV1ToV2 } = require('./migrationService');
                await migrateV1ToV2(db);
            }

            await setDatabaseVersion(db, DATABASE_VERSION);
        }
    } catch (error) {
        console.error('[Database] Initialization error:', error);
        throw error;
    }
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
    if (databaseInstance) {
        await databaseInstance.closeAsync();
        databaseInstance = null;
    }
};

/**
 * Execute a query and return all results
 */
export const query = async<T>(sql: string, params?: any[]): Promise<T[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<T>(sql, params || []);
    return result || [];
};

/**
 * Execute a query and return first result
 */
export const queryFirst = async <T>(sql: string, params?: any[]): Promise<T | null> => {
    const db = await getDatabase();
    return await db.getFirstAsync<T>(sql, params || []);
};

/**
 * Execute a command (INSERT, UPDATE, DELETE)
 */
export const execute = async (sql: string, params?: any[]): Promise<SQLite.SQLiteRunResult> => {
    const db = await getDatabase();
    return await db.runAsync(sql, params || []);
};

/**
 * Execute multiple commands in a transaction
 */
export const transaction = async (callback: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
        await callback(db);
    });
};
