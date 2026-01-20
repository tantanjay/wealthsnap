import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import {
    getUserProfile,
    getAllTransactions,
    getAllInvestments,
    getAllCategories,
    getAllRecurrenceRules,
    getGeminiConfig,
    saveUserProfile,
    bulkSaveTransactions,
    bulkSaveInvestments,
    bulkSaveCategories,
    bulkSaveRecurrenceRules,
    saveGeminiConfig,
    clearAllData,
    setOnboardingComplete
} from './storageService';
import { getBudgets, setBudget, clearBudgets, Budget } from './budgetService';
import { encryptData, decryptData } from './encryptionService';
import { UserProfile, Transaction, Investment, Category, RecurrenceRule, GeminiConfig } from '../types';

export interface BackupData {
    version: string;
    timestamp: string;
    profile: UserProfile | null;
    transactions: Transaction[];
    investments: Investment[];
    categories: Category[];
    recurrenceRules: RecurrenceRule[];
    geminiConfig: GeminiConfig | null;
    budgets: Budget[];
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
    const profile = await getUserProfile();
    const transactions = await getAllTransactions();
    const investments = await getAllInvestments();
    const categories = await getAllCategories();
    const recurrenceRules = await getAllRecurrenceRules();
    const geminiConfig = await getGeminiConfig();
    const budgets = await getBudgets();

    const backupData: BackupData = {
        version: '2.0', // Schema version 2.0 (SQLite Support)
        timestamp: new Date().toISOString(),
        profile,
        transactions,
        investments,
        categories,
        recurrenceRules,
        geminiConfig: geminiConfig ? { ...geminiConfig, apiKey: undefined } : null,
        budgets
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
        } catch (e) {
            // Fallback if double stringified (unlikely with this setup but safe)
            try {
                backupData = JSON.parse(JSON.parse(decrypted));
            } catch (e2) {
                throw new Error('FAILED_TO_PARSE_BACKUP');
            }
        }

    } else {
        throw new Error('INVALID_BACKUP_FORMAT');
    }

    // Restore Data
    // We clear all existing data first to ensure the restore is a complete replacement/clean slate.
    await clearAllData();

    if (backupData.profile) {
        await saveUserProfile(backupData.profile);
        // Explicitly restore the onboarding flag if the profile suggests it is complete, 
        // or generally assume a restored backup implies completed onboarding.
        if (backupData.profile.isOnboardingComplete) {
            await setOnboardingComplete();
        }
    }

    if (backupData.budgets) {
        await clearBudgets();
        for (const b of backupData.budgets) await setBudget(b.category, b.amount);
    }

    // Bulk save all data for maximum performance
    if (backupData.transactions.length > 0) {
        await bulkSaveTransactions(backupData.transactions);
    }
    if (backupData.investments.length > 0) {
        await bulkSaveInvestments(backupData.investments);
    }
    if (backupData.categories.length > 0) {
        await bulkSaveCategories(backupData.categories);
    }
    if (backupData.recurrenceRules.length > 0) {
        await bulkSaveRecurrenceRules(backupData.recurrenceRules);
    }

    if (backupData.geminiConfig) await saveGeminiConfig(backupData.geminiConfig);
};
