import * as SQLite from 'expo-sqlite';

import { createTables, setDatabaseVersion, getDatabaseVersion, DATABASE_NAME, DATABASE_VERSION } from '@services/database/databaseSchema';

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
        if (currentVersion === 0) {
            // Fresh install: Tables are created with latest schema by createTables()
            // Just set the version and skip migrations
            await setDatabaseVersion(db, DATABASE_VERSION);
        } else {
            // Sequential migrations (Waterfall pattern)
            // This handles users jumping multiple versions (e.g. v1 -> v3)

            if (currentVersion < 2) {
                console.warn('[Database] Migrating V1 -> V2');
                const { migrateV1ToV2 } = await import('@services/database/migrationService');
                await migrateV1ToV2(db);
                await setDatabaseVersion(db, 2);
                currentVersion = 2;
            }

            /**
             * Jump to v5
             * Hard to say what version is users used just to make sure we cover all cases
             */
            if (currentVersion < 5) {
                console.warn('[Database] Migrating V2 -> V5');
                const { migrateV2ToV5 } = await import('@services/database/migrationService');
                await migrateV2ToV5(db);
                await setDatabaseVersion(db, 5);
                currentVersion = 5;
            }

            if (currentVersion < 6) {
                console.warn('[Database] Migrating V5 -> V6');
                const { migrateV5ToV6 } = await import('@services/database/migrationService');
                await migrateV5ToV6(db);
                await setDatabaseVersion(db, 6);
                currentVersion = 6;
            }

            if (currentVersion < 7) {
                console.warn('[Database] Migrating V6 -> V7');
                const { migrateV6ToV7 } = await import('@services/database/migrationService');
                await migrateV6ToV7(db);
                await setDatabaseVersion(db, 7);
                currentVersion = 7;
            }
        }

        // Ensure we are at target version
        if (currentVersion !== DATABASE_VERSION) {
            await setDatabaseVersion(db, DATABASE_VERSION);
        }

    } catch (error) {
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
