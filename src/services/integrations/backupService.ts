import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { UserProfile, Transaction, Investment, Category, RecurrenceRule, Reminder, Budget, TransactionReceipt, Asset, PriceHistory, DividendHistory } from '@types';
import { decryptData, encryptData } from '@services/core/encryptionService';
import * as Storage from '@services/core/storageService';
import * as SQLite from '@services/domain';
import { CONFIG } from '@constants/config';
import { generateUUID, isUUID } from '@utils/uuid';

export interface BackupData {
    version: string;
    timestamp: string;
    profile: UserProfile | null;
    transactions: Transaction[];
    investments: Investment[];
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

/**
 * Create a backup with all data, encrypted with a password
 * @param password - The password to encrypt the backup data with
 * @returns URI of the created backup file
 */
export const createBackup = async (password: string): Promise<string> => {
    if (!password) {
        throw new Error('Backup password is required');
    }

    // 1. Gather all data
    const profile = await Storage.getUserProfile();
    const transactions = await SQLite.getAllTransactions();
    const investments = await SQLite.getAllInvestments();
    const categories = await SQLite.getAllCategories();
    const recurrenceRules = await SQLite.getAllRecurrenceRules();
    const budgets = await SQLite.getAllBudgets();
    const reminders = await SQLite.getAllReminders();
    const transactionReceipts = await SQLite.getAllTransactionReceipts();
    const assets = await SQLite.getAllAssets();
    const priceHistories = await SQLite.getAllPriceHistories();
    const dividendHistories = await SQLite.getAllDividendHistories();

    const backupData: BackupData = {
        version: '2.0', // Schema version 2.0 (SQLite Support)
        timestamp: new Date().toISOString(),
        profile,
        transactions,
        investments,
        categories,
        recurrenceRules,
        budgets,
        reminders,
        transactionReceipts,
        assets,
        priceHistories: priceHistories.slice(0, 100),
        dividendHistories: dividendHistories.slice(0, 100)
    };

    // 2. Create zip archive
    const zip = new JSZip();

    // ENCRYPT THE DATA
    const encryptedData = await encryptData(JSON.stringify(backupData), password);

    // Validate encryption worked
    if (!encryptedData) {
        throw new Error('Encryption failed');
    }

    zip.file('backup.enc', encryptedData);

    // 3. Generate zip blob
    const zipBlob = await zip.generateAsync({ type: 'base64' });

    // 4. Save zip file
    const fileName = `wealthsnap_backup_${new Date().toISOString().split('T')[0]}.zip`;
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, zipBlob, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
};

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

    const sanitized = data.map((item, index) => {
        // 2. Check if the item itself is null/undefined
        if (!item) {
            console.error(`sanitizeIds: Item at index ${index} is null or undefined. Skipping.`);
            return item;
        }

        const newItem = { ...item };

        // 3. Ensure the item has an ID property to check
        if (typeof newItem.id !== 'string') {
            console.error(`sanitizeIds: Item at index ${index} is missing a string ID. Generating a new one.`);
            newItem.id = generateUUID();
            // We can't map from an old ID if it didn't exist, 
            // but we ensure the record is now valid.
            return newItem;
        }

        // 4. Validate existing UUID
        if (!isUUID(newItem.id)) {
            const newId = generateUUID();
            map[newItem.id] = newId; // Track the change for foreign key updates
            newItem.id = newId;
        }

        return newItem;
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
 * Restore data from a backup file
 * @param fileUri - URI of the backup file
 * @param password - Password to decrypt the backup
 */
export const restoreFromBackup = async (
    fileUri: string,
    password?: string
): Promise<void> => {

    // Read zip
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(base64, { base64: true });

    const encryptedContent = await zip.file('backup.enc')?.async('string');

    let backupData: BackupData;

    if (encryptedContent) {
        if (!password) {
            throw new Error('PASSWORD_REQUIRED');
        }
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

    // Restore Data
    // We clear all existing data first to ensure the restore is a complete replacement/clean slate.
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
    const { sanitized: cleanCategories } = sanitizeIds(backupData.categories);
    const { sanitized: cleanRecurrenceRules } = sanitizeIds(backupData.recurrenceRules);
    const { sanitized: cleanReminders } = sanitizeIds(backupData.reminders);
    const cleanTransactionReceipts = updateForeignKeys(backupData.transactionReceipts, 'transactionId', transactionIdMap);

    await safeBulkSave(backupData.assets, SQLite.bulkSaveAssets);
    await safeBulkSave(cleanTransactions, SQLite.bulkSaveTransactions);
    await safeBulkSave(cleanInvestments, SQLite.bulkSaveInvestments);
    await safeBulkSave(cleanCategories, SQLite.bulkSaveCategories);
    await safeBulkSave(cleanRecurrenceRules, SQLite.bulkSaveRecurrenceRules);
    await safeBulkSave(cleanReminders, SQLite.bulkSaveReminders);
    await safeBulkSave(backupData.budgets, SQLite.bulkSaveBudgets);
    await safeBulkSave(cleanTransactionReceipts, SQLite.bulkSaveTransactionReceipts);
    await safeBulkSave(backupData.priceHistories, SQLite.bulkSavePriceHistories);
    await safeBulkSave(backupData.dividendHistories, SQLite.bulkSaveDividendHistories);

    // Reschedule Notifications
    if (backupData.reminders && Array.isArray(backupData.reminders) && backupData.reminders.length > 0) {
        for (const reminder of backupData.reminders) {
            if (reminder.isActive) {
                // scheduleReminderNotifications calculates the next occurrence starting from NOW,
                // so it correctly handles old reminders by finding their next future date.
                await SQLite.scheduleReminderNotifications(reminder).catch(err => {
                    console.error(`Failed to schedule notification for reminder ${reminder.id}:`, err);
                });
            }
        }
    }
};

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