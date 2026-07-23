import * as SQLite from 'expo-sqlite';

import { createTables, setDatabaseVersion, getDatabaseVersion, migrateToVersion8, migrateToVersion9, migrateToVersion10, migrateToVersion11, migrateToVersion12, migrateToVersion13, migrateToVersion14, migrateToVersion15, DATABASE_NAME, DATABASE_VERSION } from '@services/database/databaseSchema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get or create database connection
 * Uses a singleton promise pattern to ensure initialization only happens once
 * and all callers wait for it to complete.
 */
export const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = (async () => {
        try {
            const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

            // Initialize tables - this must complete before we return the db
            await initializeDatabase(db);

            return db;
        } catch (error) {
            // Reset promise on failure so we can try again
            dbPromise = null;
            console.error('[Database] Failed to initialize:', error);
            throw error;
        }
    })();

    return dbPromise;
};

/**
 * Initialize database (create tables, indexes, etc.)
 */
export const initializeDatabase = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    try {
        // Create all tables and indexes
        await createTables(db);

        // Check and set database version
        let currentVersion = await getDatabaseVersion(db);

        // If version is mismatch or 0, just enforce the current version
        // This is a "fresh start" approach - we assume createTables handles schema
        if (currentVersion !== DATABASE_VERSION) {
            console.log(`[Database] Setting DB version to ${DATABASE_VERSION} (was ${currentVersion})`);

            if (currentVersion > 0) {
                if (currentVersion < 8) await migrateToVersion8(db);
                if (currentVersion < 9) await migrateToVersion9(db);
                if (currentVersion < 10) await migrateToVersion10(db);
                if (currentVersion < 11) await migrateToVersion11(db);
                if (currentVersion < 12) await migrateToVersion12(db);
                if (currentVersion < 13) await migrateToVersion13(db);
                if (currentVersion < 14) await migrateToVersion14(db);
                if (currentVersion < 15) await migrateToVersion15(db);
            } else {
                await setDatabaseVersion(db, DATABASE_VERSION);
            }
            console.log('[Database] Version set/migrated successfully');
        } else {
            console.log('[Database] Version matches, no action needed');
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
    if (dbPromise) {
        try {
            const db = await dbPromise;
            await db.closeAsync();
        } catch (error) {
            console.error('[Database] Error closing database:', error);
        }
    }
    dbPromise = null;
};

/**
 * Reset database (Clear data and schema) - USE WITH CAUTION (Dev only)
 */
export const resetDatabase = async (): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.closeAsync();
        dbPromise = null;

        await SQLite.deleteDatabaseAsync(DATABASE_NAME);
        console.warn('[Database] Database reset complete');
    } catch (error) {
        console.error('[Database] Error resetting database:', error);
        throw error;
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
