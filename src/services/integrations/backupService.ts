import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { UserProfile, Transaction, Investment, Category, RecurrenceRule, Reminder, Budget } from '@types';
import { decryptData, encryptData } from '@services/core/encryptionService';
import * as Storage from '@services/core/storageService';
import * as SQLite from '@services/domain';
import { CONFIG } from '@constants/config';

export interface BackupData {
    version: string;
    timestamp: string;
    profile: UserProfile | null;
    transactions: Transaction[];
    investments: Investment[];
    categories: Category[];
    recurrenceRules: RecurrenceRule[];
    budgets: Budget[];
    reminders?: Reminder[];
}

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

    const backupData: BackupData = {
        version: '2.0', // Schema version 2.0 (SQLite Support)
        timestamp: new Date().toISOString(),
        profile,
        transactions,
        investments,
        categories,
        recurrenceRules,
        budgets,
        reminders
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

    await safeBulkSave(backupData.transactions, SQLite.bulkSaveTransactions);
    await safeBulkSave(backupData.investments, SQLite.bulkSaveInvestments);
    await safeBulkSave(backupData.categories, SQLite.bulkSaveCategories);
    await safeBulkSave(backupData.recurrenceRules, SQLite.bulkSaveRecurrenceRules);
    await safeBulkSave(backupData.budgets, SQLite.bulkSaveBudgets);
    await safeBulkSave(backupData.reminders, SQLite.bulkSaveReminders);

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