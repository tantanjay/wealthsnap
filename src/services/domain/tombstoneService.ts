import { getDatabase } from '@services/database/databaseService';

export interface Tombstone {
    entityType: string;
    id: string;
    deletedAt: string;
}

/**
 * Records that a record was deleted, for multi-device merge sync to pick up later.
 * Called by every domain delete* function; deletedAt defaults to "now" for a normal
 * local delete, but merge-apply passes the original remote deletedAt explicitly so the
 * true delete time propagates unchanged through further syncs.
 */
export const upsertTombstone = async (entityType: string, id: string, deletedAt?: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
        'INSERT OR REPLACE INTO deleted_records (entityType, id, deletedAt) VALUES (?, ?, ?)',
        [entityType, id, deletedAt || new Date().toISOString()]
    );
};

/**
 * Removes a tombstone - used when a merge "resurrects" a record because the incoming
 * edit is newer than the local delete.
 */
export const clearTombstone = async (entityType: string, id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM deleted_records WHERE entityType = ? AND id = ?', [entityType, id]);
};

/**
 * Tombstones for one entity type, keyed by id, for merge-plan lookups.
 */
export const getTombstoneMap = async (entityType: string): Promise<Map<string, string>> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: string; deletedAt: string }>(
        'SELECT id, deletedAt FROM deleted_records WHERE entityType = ?',
        [entityType]
    );
    return new Map(rows.map(row => [row.id, row.deletedAt]));
};

/**
 * All tombstones across the given entity types, for exporting into a sync package.
 */
export const getTombstonesForTypes = async (entityTypes: string[]): Promise<Tombstone[]> => {
    if (entityTypes.length === 0) return [];
    const db = await getDatabase();
    const placeholders = entityTypes.map(() => '?').join(', ');
    return db.getAllAsync<Tombstone>(
        `SELECT entityType, id, deletedAt FROM deleted_records WHERE entityType IN (${placeholders})`,
        entityTypes
    );
};
