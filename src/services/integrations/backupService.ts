import { File, Paths } from 'expo-file-system';
import JSZip from 'jszip';
import Constants from 'expo-constants';

import { UserProfile, Transaction, Investment, Category, RecurrenceRule, Reminder, Budget, TransactionReceipt, Asset, PriceHistory, DividendHistory, Debt } from '@types';
import { decryptData, encryptData } from '@services/core/encryptionService';
import * as Storage from '@services/core/storageService';
import { ASYNC_KEYS, CONFIG } from '@constants/config';
import { generateUUID, isUUID } from '@utils/uuid';
import { scheduleReminderNotifications, bulkSaveReminders } from '@services/domain/reminderService';
import { bulkSaveTransactionReceipts, bulkSaveTransactions } from '@services/domain/transactionService';
import { bulkSaveInvestments } from '@services/domain/investmentService';
import { bulkSaveCategories } from '@services/domain/categoryService';
import { bulkSaveRecurrenceRules } from '@services/domain/recurrenceService';
import { bulkSaveBudgets } from '@services/domain/budgetService';
import { bulkSaveAssets } from '@services/domain/assetService';
import { bulkSavePriceHistories } from '@services/domain/priceHistoryService';
import { bulkSaveDividendHistories } from '@services/domain/dividendHistoryService';
import { bulkSaveDebts } from '@services/domain/debtService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENTITY_REGISTRY } from '@services/integrations/backupEntities';

export interface BackupData {
    version: string;
    timestamp: string;
    profile: UserProfile | null;
    transactions: Transaction[];
    investments: Investment[];
    debts: Debt[];
    categories: Category[];
    recurrenceRules: RecurrenceRule[];
    budgets: Budget[];
    reminders: Reminder[];
    transactionReceipts: TransactionReceipt[];
    assets: Asset[];
    priceHistories: PriceHistory[];
    dividendHistories: DividendHistory[];
}

interface BaseEntity {
    id: string;
    [key: string]: any; // Allows for other properties like categoryId, amount, etc.
}

// A map to keep track of changed IDs: { [oldId]: newId }
type IdMap = Record<string, string>;

export interface BackupProgress {
    stage: 'gathering' | 'encrypting' | 'writing' | 'reading' | 'decrypting' | 'clearing' | 'restoring' | 'rescheduling' | 'done';
    label: string;
    current?: number;
    total?: number;
}

export type BackupProgressCallback = (progress: BackupProgress) => void;

interface BackupManifestV2 {
    containerVersion: 2;
    schemaVersion: '2.0';
    createdAt: string;
    appVersion: string;
    hasProfile: boolean;
    entities: string[];
    counts: Record<string, number>;
}

/**
 * Create a backup with all data, encrypted with a password.
 * Writes the v2 container format: a plaintext manifest.json plus one AES-encrypted
 * file per entity under entities/, instead of a single monolithic blob.
 * @param password - The password to encrypt the backup data with
 * @returns URI of the created backup file
 */
export const createBackup = async (password: string, onProgress?: BackupProgressCallback): Promise<string> => {
    if (!password) {
        throw new Error('Backup password is required');
    }

    onProgress?.({ stage: 'gathering', label: 'Gathering data…' });
    const profile = await Storage.getUserProfile();

    const gathered: Record<string, any[]> = {};
    for (let i = 0; i < ENTITY_REGISTRY.length; i++) {
        const d = ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'gathering', label: `Reading ${d.label}…`, current: i + 1, total: ENTITY_REGISTRY.length });
        gathered[d.key] = await d.getAll();
    }
    if (gathered.priceHistories) gathered.priceHistories = limitPerSymbol(gathered.priceHistories, 100);
    if (gathered.dividendHistories) gathered.dividendHistories = limitPerSymbol(gathered.dividendHistories, 10);

    const zip = new JSZip();
    const counts: Record<string, number> = {};

    if (profile) {
        onProgress?.({ stage: 'encrypting', label: 'Encrypting profile…' });
        const encProfile = await encryptData(profile, password);
        zip.file('entities/profile.enc', encProfile);
    }

    for (let i = 0; i < ENTITY_REGISTRY.length; i++) {
        const d = ENTITY_REGISTRY[i];
        const items = gathered[d.key] ?? [];
        counts[d.key] = items.length;
        onProgress?.({ stage: 'encrypting', label: `Encrypting ${d.label}…`, current: i + 1, total: ENTITY_REGISTRY.length });
        const encrypted = await encryptData(items, password);
        if (!encrypted) {
            throw new Error('Encryption failed');
        }
        zip.file(`entities/${d.key}.enc`, encrypted);
    }

    const manifest: BackupManifestV2 = {
        containerVersion: 2,
        schemaVersion: '2.0',
        createdAt: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        hasProfile: !!profile,
        entities: ENTITY_REGISTRY.map(d => d.key),
        counts,
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    onProgress?.({ stage: 'writing', label: 'Writing backup file…' });
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });

    const fileName = `wealthsnap_backup_${new Date().toISOString().split('T')[0]}.zip`;
    const file = new File(Paths.document, fileName);
    file.write(zipBytes);

    await Storage.saveLastBackupDate(new Date().toISOString());

    onProgress?.({ stage: 'done', label: 'Backup complete' });
    return file.uri;
};

function limitPerSymbol<T extends { symbol: string }>(
    items: T[],
    limit: number
): T[] {
    const map = new Map<string, T[]>();

    for (const item of items) {
        const list = map.get(item.symbol) ?? [];
        if (list.length < limit) {
            list.push(item);
            map.set(item.symbol, list);
        }
    }

    return Array.from(map.values()).flat();
}


/**
 * Ensures all entities in an array have valid UUIDs.
 * Returns the sanitized array and a map of old IDs to new IDs.
 */
export function sanitizeIds<T extends BaseEntity>(data: T[] | null | undefined): { sanitized: T[], map: IdMap } {
    const map: IdMap = {};

    // 1. Check if data is missing or not an array
    if (!data || !Array.isArray(data)) {
        console.warn('sanitizeIds: Input data is null, undefined, or not an array. Returning empty results.');
        return { sanitized: [], map: {} };
    }

    const sanitized: T[] = [];

    data.forEach((item, index) => {
        // 2. Check if the item itself is null/undefined - drop it rather than re-inserting the falsy value
        if (!item) {
            console.error(`sanitizeIds: Item at index ${index} is null or undefined. Skipping.`);
            return;
        }

        const newItem = { ...item };

        // 3. Ensure the item has an ID property to check
        if (typeof newItem.id !== 'string') {
            console.error(`sanitizeIds: Item at index ${index} is missing a string ID. Generating a new one.`);
            newItem.id = generateUUID();
            // We can't map from an old ID if it didn't exist,
            // but we ensure the record is now valid.
            sanitized.push(newItem);
            return;
        }

        // 4. Validate existing UUID
        if (!isUUID(newItem.id)) {
            const newId = generateUUID();
            map[newItem.id] = newId; // Track the change for foreign key updates
            newItem.id = newId;
        }

        sanitized.push(newItem);
    });

    return { sanitized, map };
}

const updateForeignKeys = <T>(
    data: T[] | null | undefined,
    foreignKeyName: keyof T,
    idMap: Record<string, string>
): T[] => {
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => {
        const oldForeignKey = String(item[foreignKeyName]);

        // If the old foreign key exists in our map, replace it with the new UUID
        if (idMap[oldForeignKey]) {
            return { ...item, [foreignKeyName]: idMap[oldForeignKey] };
        }
        return item;
    });
};

/**
 * RecurrenceRule.transactionTemplate embeds investmentId/debtId in a nested object,
 * which the generic top-level fkFields pass in ENTITY_REGISTRY can't reach.
 */
function remapRecurrenceTemplateFks(
    rules: RecurrenceRule[],
    investmentIdMap: IdMap,
    debtIdMap: IdMap
): RecurrenceRule[] {
    return rules.map(rule => {
        if (!rule.transactionTemplate) return rule;
        const template: any = { ...rule.transactionTemplate };
        if (template.investmentId && investmentIdMap[template.investmentId]) {
            template.investmentId = investmentIdMap[template.investmentId];
        }
        if (template.debtId && debtIdMap[template.debtId]) {
            template.debtId = debtIdMap[template.debtId];
        }
        return { ...rule, transactionTemplate: template };
    });
}

/**
 * Restore data from a backup file. Dispatches to the v2 reader (manifest.json present)
 * or the legacy v1 reader (single backup.enc blob) based on which file exists in the zip.
 * @param fileUri - URI of the backup file
 * @param password - Password to decrypt the backup
 */
export const restoreFromBackup = async (
    fileUri: string,
    password?: string,
    onProgress?: BackupProgressCallback
): Promise<void> => {
    onProgress?.({ stage: 'reading', label: 'Reading backup file…' });
    const bytes = await new File(fileUri).bytes();

    const zip = await JSZip.loadAsync(bytes);

    if (zip.file('manifest.json')) {
        return restoreV2(zip, password, onProgress);
    }
    if (zip.file('backup.enc')) {
        return restoreV1Legacy(zip, password, onProgress);
    }
    throw new Error('INVALID_BACKUP_FORMAT');
};

/**
 * Legacy (v1) restore path — reads the original single `backup.enc` blob format.
 * Frozen as-is (including its known id-remap gap and the double-JSON.parse defensive
 * unwind) so every backup created before the v2 container format keeps restoring
 * identically forever. Do not rewire this onto ENTITY_REGISTRY or the fixed FK-remap
 * logic used by restoreV2.
 */
async function restoreV1Legacy(zip: JSZip, password: string | undefined, onProgress?: BackupProgressCallback): Promise<void> {
    const encryptedContent = await zip.file('backup.enc')?.async('string');

    let backupData: BackupData;

    if (encryptedContent) {
        if (!password) {
            throw new Error('PASSWORD_REQUIRED');
        }
        onProgress?.({ stage: 'decrypting', label: 'Decrypting backup…' });
        const decrypted = await decryptData(encryptedContent, password);
        if (!decrypted) {
            throw new Error('INVALID_PASSWORD');
        }

        try {
            backupData = JSON.parse(decrypted) as BackupData;
        } catch {
            // Fallback if double stringified (unlikely with this setup but safe)
            try {
                backupData = JSON.parse(JSON.parse(decrypted));
            } catch {
                throw new Error('FAILED_TO_PARSE_BACKUP');
            }
        }

    } else {
        throw new Error('INVALID_BACKUP_FORMAT');
    }

    // Set to today so it wont prompt during restoring data
    await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.LAST_PROMPT, new Date().toISOString());

    // Restore Data
    // We clear all existing data first to ensure the restore is a complete replacement/clean slate.
    onProgress?.({ stage: 'clearing', label: 'Clearing existing data…' });
    await Storage.clearAllData();

    if (backupData.profile) {
        await Storage.saveUserProfile(backupData.profile);
        // Explicitly restore the onboarding flag if the profile suggests it is complete,
        // or generally assume a restored backup implies completed onboarding.
        if (backupData.profile.isOnboardingComplete) {
            await Storage.saveAcceptedTermsVersion(CONFIG.TERMS_VERSION);
            await Storage.setOnboardingComplete();
        }
    }

    const { sanitized: cleanTransactions, map: transactionIdMap } = sanitizeIds(backupData.transactions);
    const { sanitized: cleanInvestments } = sanitizeIds(backupData.investments);
    const { sanitized: cleanDebts } = sanitizeIds(backupData.debts);
    const { sanitized: cleanCategories } = sanitizeIds(backupData.categories);
    const { sanitized: cleanRecurrenceRules } = sanitizeIds(backupData.recurrenceRules);
    const { sanitized: cleanReminders } = sanitizeIds(backupData.reminders);
    const cleanTransactionReceipts = updateForeignKeys(backupData.transactionReceipts, 'transactionId', transactionIdMap);

    onProgress?.({ stage: 'restoring', label: 'Restoring data…' });
    await safeBulkSave(backupData.assets, bulkSaveAssets);
    await safeBulkSave(cleanTransactions, bulkSaveTransactions);
    await safeBulkSave(cleanInvestments, bulkSaveInvestments);
    await safeBulkSave(cleanDebts, bulkSaveDebts);
    await safeBulkSave(cleanCategories, bulkSaveCategories);
    await safeBulkSave(cleanRecurrenceRules, bulkSaveRecurrenceRules);
    await safeBulkSave(cleanReminders, bulkSaveReminders);
    await safeBulkSave(cleanTransactionReceipts, bulkSaveTransactionReceipts);
    await safeBulkSave(backupData.budgets, bulkSaveBudgets);
    await safeBulkSave(backupData.priceHistories, bulkSavePriceHistories);
    await safeBulkSave(backupData.dividendHistories, bulkSaveDividendHistories);

    // Reschedule Notifications
    onProgress?.({ stage: 'rescheduling', label: 'Rescheduling reminders…' });
    if (backupData.reminders && Array.isArray(backupData.reminders) && backupData.reminders.length > 0) {
        for (const reminder of backupData.reminders) {
            if (reminder.isActive) {
                // scheduleReminderNotifications calculates the next occurrence starting from NOW,
                // so it correctly handles old reminders by finding their next future date.
                await scheduleReminderNotifications(reminder).catch(err => {
                    console.error(`Failed to schedule notification for reminder ${reminder.id}:`, err);
                });
            }
        }
    }
    onProgress?.({ stage: 'done', label: 'Restore complete' });
}

/**
 * v2 restore path — reads the manifest.json + entities/*.enc container format.
 * Phases are fully separated so ID-map computation, FK rewriting, and the destructive
 * wipe never interleave: everything is decrypted and validated (Phase A) before any
 * local data is touched, so a wrong password or corrupt entity file aborts before
 * Storage.clearAllData() ever runs.
 */
async function restoreV2(zip: JSZip, password: string | undefined, onProgress?: BackupProgressCallback): Promise<void> {
    if (!password) {
        throw new Error('PASSWORD_REQUIRED');
    }

    const manifestRaw = await zip.file('manifest.json')!.async('string');
    const manifest: BackupManifestV2 = JSON.parse(manifestRaw);

    // Phase A — decrypt everything before touching local data.
    const raw: Record<string, any[]> = {};
    for (let i = 0; i < ENTITY_REGISTRY.length; i++) {
        const d = ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'decrypting', label: `Decrypting ${d.label}…`, current: i + 1, total: ENTITY_REGISTRY.length });
        const file = zip.file(`entities/${d.key}.enc`);
        if (!file) {
            raw[d.key] = [];
            continue;
        }
        const decrypted = await decryptData(await file.async('string'), password);
        if (decrypted === null) {
            throw new Error('INVALID_PASSWORD');
        }
        raw[d.key] = Array.isArray(decrypted) ? decrypted : [];
    }

    let profile: UserProfile | null = null;
    const profileFile = zip.file('entities/profile.enc');
    if (profileFile) {
        onProgress?.({ stage: 'decrypting', label: 'Decrypting profile…' });
        profile = await decryptData(await profileFile.async('string'), password);
        if (profile === null && manifest.hasProfile) {
            throw new Error('INVALID_PASSWORD');
        }
    }

    // Phase B — sanitize ids for every entity that has one. Order-independent: each call
    // only needs that entity's own raw array, not any other entity's map.
    const idMaps: Record<string, IdMap> = {};
    const sanitized: Record<string, any[]> = {};
    for (const d of ENTITY_REGISTRY) {
        if (d.hasId) {
            const { sanitized: clean, map } = sanitizeIds(raw[d.key]);
            sanitized[d.key] = clean;
            idMaps[d.key] = map;
        } else {
            sanitized[d.key] = raw[d.key] ?? [];
        }
    }

    // Phase C — rewrite top-level FK fields using each entity's declared fkFields. Also
    // order-independent: all idMaps already exist from Phase B.
    for (const d of ENTITY_REGISTRY) {
        if (!d.fkFields?.length) continue;
        let items = sanitized[d.key];
        for (const fk of d.fkFields) {
            const map = idMaps[fk.refEntity];
            if (map && Object.keys(map).length) {
                items = updateForeignKeys(items, fk.field as any, map);
            }
        }
        sanitized[d.key] = items;
    }
    // One-off: RecurrenceRule.transactionTemplate embeds investmentId/debtId in a nested
    // object, which the generic top-level fkFields pass above can't reach.
    if (sanitized.recurrenceRules) {
        sanitized.recurrenceRules = remapRecurrenceTemplateFks(
            sanitized.recurrenceRules,
            idMaps.investments ?? {},
            idMaps.debts ?? {}
        );
    }

    // Phase D — only now do we wipe local data, after everything above has already succeeded.
    onProgress?.({ stage: 'clearing', label: 'Clearing existing data…' });
    await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.LAST_PROMPT, new Date().toISOString());
    await Storage.clearAllData();

    if (profile) {
        await Storage.saveUserProfile(profile);
        if (profile.isOnboardingComplete) {
            await Storage.saveAcceptedTermsVersion(CONFIG.TERMS_VERSION);
            await Storage.setOnboardingComplete();
        }
    }

    // Phase E — save. Registry order is purely for a readable progress sequence; there are
    // no DB-level FK constraints, so save order has no effect on success/failure.
    for (let i = 0; i < ENTITY_REGISTRY.length; i++) {
        const d = ENTITY_REGISTRY[i];
        onProgress?.({ stage: 'restoring', label: `Restoring ${d.label}…`, current: i + 1, total: ENTITY_REGISTRY.length });
        await safeBulkSave(sanitized[d.key], d.bulkSave);
    }

    // Phase F — reschedule using the SANITIZED reminders (the ids actually written to SQLite),
    // not the raw pre-sanitize array.
    onProgress?.({ stage: 'rescheduling', label: 'Rescheduling reminders…' });
    for (const reminder of sanitized.reminders ?? []) {
        if (reminder.isActive) {
            await scheduleReminderNotifications(reminder).catch(err => {
                console.error(`Failed to schedule notification for reminder ${reminder.id}:`, err);
            });
        }
    }
    onProgress?.({ stage: 'done', label: 'Restore complete' });
}

/**
 * Safely executes a bulk save operation if the data is a valid non-empty array.
 * @param data - The array of data to save (could be undefined or null from old backups)
 * @param saveFn - The bulk save function from your storage service
 */
const safeBulkSave = async <T>(
    data: T[] | undefined | null,
    saveFn: (items: T[]) => Promise<void>
): Promise<void> => {
    if (data && Array.isArray(data) && data.length > 0) {
        try {
            await saveFn(data);
        } catch (error) {
            console.error(`Bulk save failed for data:`, error);
            // Optionally re-throw or handle based on your app's needs
            throw error;
        }
    }
};
