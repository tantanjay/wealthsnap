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
    saveTransaction, // We might need a bulk save, but for now we loop or use specific bulk setters if created
    saveInvestment,
    saveCategory,
    saveRecurrenceRule,
    saveGeminiConfig,
    clearAllData
} from './storageService';
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

    const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        profile,
        transactions,
        investments,
        categories,
        recurrenceRules,
        geminiConfig
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
    // Clear existing first? Yes, usually restore is a full replacement.
    await clearAllData();

    if (backupData.profile) await saveUserProfile(backupData.profile);

    // Bulk save would be better, but loop is fine for local async storage for now
    for (const t of backupData.transactions) await saveTransaction(t);
    for (const i of backupData.investments) await saveInvestment(i);
    for (const c of backupData.categories) await saveCategory(c);
    for (const r of backupData.recurrenceRules) await saveRecurrenceRule(r);

    if (backupData.geminiConfig) await saveGeminiConfig(backupData.geminiConfig);
};
