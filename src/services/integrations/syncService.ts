import { File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import Constants from 'expo-constants';

import { encryptData, decryptData } from '@services/core/encryptionService';
import * as DataCache from '@services/core/dataCache';
import { scheduleReminderNotifications } from '@services/domain/reminderService';
import { upsertTombstone, clearTombstone, getTombstoneMap, getTombstonesForTypes, Tombstone } from '@services/domain/tombstoneService';
import { SYNC_ENTITY_REGISTRY, SyncEntityDescriptor } from '@services/integrations/syncEntities';

export interface SyncProgress {
    stage: 'gathering' | 'encrypting' | 'writing' | 'reading' | 'decrypting' | 'merging' | 'applying' | 'done';
    label: string;
    current?: number;
    total?: number;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

export interface SyncSummary {
    added: number;
    updated: number;
    removed: number;
}

interface SyncManifest {
    containerVersion: 'sync-1';
    createdAt: string;
    appVersion: string;
    entities: string[];
    counts: Record<string, number>;
}

const SYNC_ENTITY_KEYS = SYNC_ENTITY_REGISTRY.map(d => d.key);

/**
 * ISO strings (our own new Date().toISOString() calls) and SQLite's `DEFAULT
 * CURRENT_TIMESTAMP` strings ("YYYY-MM-DD HH:MM:SS", no "T"/"Z") both exist in this app's
 * data - most entities never explicitly bind createdAt/updatedAt on a normal save, so
 * SQLite's own format is what's actually stored for those columns. Plain string
 * comparison of the two formats is NOT chronologically safe (the "T" vs " " delimiter
 * byte dominates the comparison regardless of the actual time), so every timestamp
 * compared during merge goes through this to get a real epoch-ms value.
 */
const parseTimestamp = (ts: string | undefined | null): number => {
    if (!ts) return 0;
    const normalized = ts.includes('T') ? ts : `${ts.replace(' ', 'T')}Z`;
    const ms = Date.parse(normalized);
    return Number.isNaN(ms) ? 0 : ms;
};

const isNewer = (a: string | undefined | null, b: string | undefined | null): boolean =>
    parseTimestamp(a) > parseTimestamp(b);

/**
 * Creates a password-encrypted "sync package" - the personal entities in
 * SYNC_ENTITY_REGISTRY plus their tombstones - for merging into another device.
 * Deliberately a different container shape than createBackup's (no manifest.json,
 * no backup.enc, no profile) so it can never be fed into the destructive
 * restoreFromBackup path by mistake.
 */
export const createSyncPackage = async (
    password: string,
    onProgress?: SyncProgressCallback
): Promise<string> => {
    if (!password) {
        throw new Error('Sync password is required');
    }

    onProgress?.({ stage: 'gathering', label: 'Gathering data…' });
    const gathered: Record<string, any[]> = {};
    for (let i = 0; i < SYNC_ENTITY_REGISTRY.length; i++) {
        const d = SYNC_ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'gathering', label: `Reading ${d.label}…`, current: i + 1, total: SYNC_ENTITY_REGISTRY.length });
        gathered[d.key] = await d.getAll();
    }
    const tombstones = await getTombstonesForTypes(SYNC_ENTITY_KEYS);

    const zip = new JSZip();
    const counts: Record<string, number> = {};

    for (let i = 0; i < SYNC_ENTITY_REGISTRY.length; i++) {
        const d = SYNC_ENTITY_REGISTRY[i];
        const items = gathered[d.key] ?? [];
        counts[d.key] = items.length;
        onProgress?.({ stage: 'encrypting', label: `Encrypting ${d.label}…`, current: i + 1, total: SYNC_ENTITY_REGISTRY.length });
        const encrypted = await encryptData(items, password);
        zip.file(`entities/${d.key}.enc`, encrypted);
    }

    onProgress?.({ stage: 'encrypting', label: 'Encrypting tombstones…' });
    zip.file('tombstones.enc', await encryptData(tombstones, password));

    const manifest: SyncManifest = {
        containerVersion: 'sync-1',
        createdAt: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        entities: SYNC_ENTITY_KEYS,
        counts,
    };
    zip.file('sync-manifest.json', JSON.stringify(manifest));

    onProgress?.({ stage: 'writing', label: 'Writing sync file…' });
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });

    const dateStr = new Date().toISOString().split('T')[0];
    const file = new File(Paths.document, `wealthsnap_sync_${dateStr}.zip`);
    file.write(zipBytes);

    onProgress?.({ stage: 'done', label: 'Sync package ready' });
    return file.uri;
};

interface EntityMergePlan {
    toUpsert: any[];
    toDeleteIds: string[];
    tombstonesToWrite: { id: string; deletedAt: string }[];
    tombstonesToClear: string[];
    addedCount: number;
    updatedCount: number;
}

/**
 * Pure, in-memory: decides what to do with one entity type's incoming rows/tombstones
 * against local state. Nothing here touches the database - see applyMergePlan for that.
 * Last-write-wins by updatedAt/deletedAt; local wins ties.
 */
async function buildMergePlan(
    d: SyncEntityDescriptor,
    incomingRows: any[],
    incomingTombstones: Tombstone[]
): Promise<EntityMergePlan> {
    const localRows = await d.getAll();
    const localMap = new Map(localRows.map((r: any) => [String(r[d.idField]), r]));
    const localTombMap = await getTombstoneMap(d.key);

    const incomingMap = new Map(incomingRows.map((r: any) => [String(r[d.idField]), r]));
    const incomingTombMap = new Map(incomingTombstones.map(t => [t.id, t.deletedAt]));

    const plan: EntityMergePlan = {
        toUpsert: [],
        toDeleteIds: [],
        tombstonesToWrite: [],
        tombstonesToClear: [],
        addedCount: 0,
        updatedCount: 0,
    };

    // 1. Incoming deletes
    for (const [id, remoteDeletedAt] of incomingTombMap) {
        const localRecord: any = localMap.get(id);
        if (localRecord) {
            if (isNewer(remoteDeletedAt, localRecord.updatedAt)) {
                plan.toDeleteIds.push(id);
                plan.tombstonesToWrite.push({ id, deletedAt: remoteDeletedAt });
            }
            // else: local edit is newer than the remote delete -> keep local, ignore the delete
        } else {
            const existingLocalTomb = localTombMap.get(id);
            const winner = !existingLocalTomb || isNewer(remoteDeletedAt, existingLocalTomb)
                ? remoteDeletedAt
                : existingLocalTomb;
            plan.tombstonesToWrite.push({ id, deletedAt: winner });
        }
    }

    // 2. Incoming records
    for (const [id, incomingRecord] of incomingMap) {
        const localTombDeletedAt = localTombMap.get(id);
        if (localTombDeletedAt !== undefined) {
            if (isNewer((incomingRecord as any).updatedAt, localTombDeletedAt)) {
                plan.toUpsert.push(incomingRecord);
                plan.tombstonesToClear.push(id);
                plan.addedCount++; // resurrected
            }
            // else: local delete is newer/equal -> discard incoming, stays deleted
        } else {
            const localRecord: any = localMap.get(id);
            if (!localRecord) {
                plan.toUpsert.push(incomingRecord);
                plan.addedCount++;
            } else if (isNewer((incomingRecord as any).updatedAt, localRecord.updatedAt)) {
                plan.toUpsert.push(incomingRecord);
                plan.updatedCount++;
            }
            // else: local wins tie/newer -> discard incoming
        }
    }

    return plan;
}

/** The only part of the merge that writes to SQLite. Runs after every plan is built. */
async function applyMergePlan(d: SyncEntityDescriptor, plan: EntityMergePlan): Promise<void> {
    for (const id of plan.toDeleteIds) {
        if (d.deleteOne) {
            await d.deleteOne(id);
        }
    }
    // deleteOne's own tombstone write (if any) used "now" - overwrite with the plan's real
    // deletedAt so the original delete time propagates unchanged through further syncs.
    for (const t of plan.tombstonesToWrite) {
        await upsertTombstone(d.key, t.id, t.deletedAt);
    }
    for (const id of plan.tombstonesToClear) {
        await clearTombstone(d.key, id);
    }
    if (plan.toUpsert.length > 0) {
        await d.bulkUpsertForMerge(plan.toUpsert);
    }
}

/**
 * Merges a sync package created by createSyncPackage into local data. Unlike
 * restoreFromBackup, this never wipes anything - every entity is merged record-by-record
 * using last-write-wins, with deletes tracked via tombstones so they propagate too.
 */
export const applySyncPackage = async (
    fileUri: string,
    password: string,
    onProgress?: SyncProgressCallback
): Promise<SyncSummary> => {
    if (!password) {
        throw new Error('PASSWORD_REQUIRED');
    }

    onProgress?.({ stage: 'reading', label: 'Reading sync file…' });
    const bytes = await new File(fileUri).bytes();
    const zip = await JSZip.loadAsync(bytes);

    // Phase A - validate container before touching the database.
    if (zip.file('manifest.json') || zip.file('backup.enc')) {
        throw new Error('WRONG_FILE_TYPE_BACKUP');
    }
    if (!zip.file('sync-manifest.json')) {
        throw new Error('INVALID_SYNC_FORMAT');
    }

    // Phase B - decrypt everything before touching local data.
    const incoming: Record<string, any[]> = {};
    for (let i = 0; i < SYNC_ENTITY_REGISTRY.length; i++) {
        const d = SYNC_ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'decrypting', label: `Decrypting ${d.label}…`, current: i + 1, total: SYNC_ENTITY_REGISTRY.length });
        const file = zip.file(`entities/${d.key}.enc`);
        if (!file) {
            incoming[d.key] = [];
            continue;
        }
        const decrypted = await decryptData(await file.async('string'), password);
        if (decrypted === null) {
            throw new Error('INVALID_PASSWORD');
        }
        incoming[d.key] = Array.isArray(decrypted) ? decrypted : [];
    }

    let incomingTombstones: Tombstone[] = [];
    const tombstoneFile = zip.file('tombstones.enc');
    if (tombstoneFile) {
        onProgress?.({ stage: 'decrypting', label: 'Decrypting tombstones…' });
        const decrypted = await decryptData(await tombstoneFile.async('string'), password);
        if (decrypted === null) {
            throw new Error('INVALID_PASSWORD');
        }
        incomingTombstones = Array.isArray(decrypted) ? decrypted : [];
    }

    // Phase C - compute merge plans (pure/in-memory, no writes yet).
    const plans: Record<string, EntityMergePlan> = {};
    for (let i = 0; i < SYNC_ENTITY_REGISTRY.length; i++) {
        const d = SYNC_ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'merging', label: `Comparing ${d.label}…`, current: i + 1, total: SYNC_ENTITY_REGISTRY.length });
        const tombsForType = incomingTombstones.filter(t => t.entityType === d.key);
        plans[d.key] = await buildMergePlan(d, incoming[d.key] ?? [], tombsForType);
    }

    // Phase D - apply. Only phase that writes to SQLite.
    let added = 0, updated = 0, removed = 0;
    for (let i = 0; i < SYNC_ENTITY_REGISTRY.length; i++) {
        const d = SYNC_ENTITY_REGISTRY[i];
        const plan = plans[d.key];
        onProgress?.({ stage: 'applying', label: `Applying ${d.label}…`, current: i + 1, total: SYNC_ENTITY_REGISTRY.length });
        await applyMergePlan(d, plan);
        added += plan.addedCount;
        updated += plan.updatedCount;
        removed += plan.toDeleteIds.length;
    }

    // Phase E - housekeeping. No navigation reset happens after sync (unlike restore), so
    // in-memory caches must be invalidated explicitly here.
    DataCache.invalidateAllCaches();
    if (plans.reminders?.toUpsert.length) {
        for (const reminder of plans.reminders.toUpsert) {
            if (reminder.isActive) {
                await scheduleReminderNotifications(reminder).catch(err => {
                    console.error(`Failed to schedule notification for reminder ${reminder.id}:`, err);
                });
            }
        }
    }

    onProgress?.({ stage: 'done', label: 'Sync complete' });
    return { added, updated, removed };
};
