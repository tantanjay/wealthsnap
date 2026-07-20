import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';

import { ASYNC_KEYS, SECURE_KEYS } from '@constants/config';
import { createBackup } from '@services/integrations/backupService';

export type AutoBackupFrequency = 'weekly' | 'biweekly';

const FREQUENCY_DAYS: Record<AutoBackupFrequency, number> = {
    weekly: 7,
    biweekly: 14,
};

export interface AutoBackupSettings {
    enabled: boolean;
    frequency: AutoBackupFrequency;
    folderUri: string | null; // Android (SAF) only - iOS has no persistent folder-picker equivalent
    lastRunAt: string | null;
}

export const getAutoBackupSettings = async (): Promise<AutoBackupSettings> => {
    const [enabled, frequency, folderUri, lastRunAt] = await Promise.all([
        AsyncStorage.getItem(ASYNC_KEYS.AUTO_BACKUP.ENABLED),
        AsyncStorage.getItem(ASYNC_KEYS.AUTO_BACKUP.FREQUENCY),
        AsyncStorage.getItem(ASYNC_KEYS.AUTO_BACKUP.FOLDER_URI),
        AsyncStorage.getItem(ASYNC_KEYS.AUTO_BACKUP.LAST_RUN),
    ]);

    return {
        enabled: enabled === 'true',
        frequency: (frequency as AutoBackupFrequency) === 'biweekly' ? 'biweekly' : 'weekly',
        folderUri: folderUri || null,
        lastRunAt: lastRunAt || null,
    };
};

export const setAutoBackupEnabled = async (enabled: boolean): Promise<void> => {
    await AsyncStorage.setItem(ASYNC_KEYS.AUTO_BACKUP.ENABLED, enabled ? 'true' : 'false');
};

export const setAutoBackupFrequency = async (frequency: AutoBackupFrequency): Promise<void> => {
    await AsyncStorage.setItem(ASYNC_KEYS.AUTO_BACKUP.FREQUENCY, frequency);
};

export type PickFolderResult =
    | { status: 'picked'; uri: string }
    | { status: 'canceled' }
    | { status: 'not_writable' }
    | { status: 'unsupported' };

/**
 * User-facing explanation for the 'not_writable' PickFolderResult / AutoBackupRunResult.error
 * cases - shared so the pick-time check and the actual-run failure use identical wording.
 */
export const FOLDER_NOT_WRITABLE_MESSAGE =
    "This folder doesn't support automatic background writes. This is a known limitation of " +
    "some cloud providers' Android folder pickers - Google Drive included, which grants the " +
    "folder permission but then rejects file creation. Pick a folder on local/device storage " +
    "instead (e.g. Downloads), or one from a provider whose Android app supports direct file " +
    "creation (Dropbox, OneDrive, etc).";

/**
 * Android-only: lets the user pick a persistent folder (e.g. a synced cloud-drive folder) via
 * the Storage Access Framework. The granted permission survives app restarts, which a silent
 * background task depends on since it has no way to prompt for a folder itself. There's no iOS
 * equivalent - the modern Directory.pickDirectoryAsync() only grants iOS access for the current
 * app session, which is useless once the app is backgrounded.
 *
 * Immediately probes the folder with a real create+write+delete before accepting it. Some
 * providers (Google Drive's SAF implementation in particular) grant the directory permission
 * but then reject actual file creation with an IOException - catching that here, at pick time,
 * is far better than discovering it weeks later when the background task silently fails.
 */
export const pickAutoBackupFolder = async (): Promise<PickFolderResult> => {
    if (Platform.OS !== 'android') return { status: 'unsupported' };

    const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!result.granted) return { status: 'canceled' };

    const writable = await probeFolderWritable(result.directoryUri);
    if (!writable) return { status: 'not_writable' };

    await AsyncStorage.setItem(ASYNC_KEYS.AUTO_BACKUP.FOLDER_URI, result.directoryUri);
    return { status: 'picked', uri: result.directoryUri };
};

const probeFolderWritable = async (folderUri: string): Promise<boolean> => {
    try {
        const probeUri = await StorageAccessFramework.createFileAsync(folderUri, '.wealthsnap_write_test', 'text/plain');
        await StorageAccessFramework.writeAsStringAsync(probeUri, 'ok', { encoding: 'utf8' });
        await StorageAccessFramework.deleteAsync(probeUri, { idempotent: true });
        return true;
    } catch {
        return false;
    }
};

export const clearAutoBackupFolder = async (): Promise<void> => {
    await AsyncStorage.removeItem(ASYNC_KEYS.AUTO_BACKUP.FOLDER_URI);
};

/**
 * Best-effort human-readable label for a SAF directory URI (e.g. "WealthSnap" out of
 * ".../tree/primary%3ADownload%2FWealthSnap"). SAF URIs aren't real paths, so this is
 * only ever a display hint, not something to parse for logic.
 */
export const getFolderDisplayName = (uri: string | null): string | null => {
    if (!uri) return null;
    try {
        const decoded = decodeURIComponent(uri);
        const lastSegment = decoded.split(/[:/]/).filter(Boolean).pop();
        return lastSegment || decoded;
    } catch {
        return uri;
    }
};

export const hasAutoBackupPassword = async (): Promise<boolean> => {
    const pw = await SecureStore.getItemAsync(SECURE_KEYS.AUTO_BACKUP_PASSWORD);
    return !!pw;
};

export const setAutoBackupPassword = async (password: string): Promise<void> => {
    await SecureStore.setItemAsync(SECURE_KEYS.AUTO_BACKUP_PASSWORD, password);
};

export const clearAutoBackupPassword = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(SECURE_KEYS.AUTO_BACKUP_PASSWORD);
};

const getAutoBackupPassword = async (): Promise<string | null> => {
    return SecureStore.getItemAsync(SECURE_KEYS.AUTO_BACKUP_PASSWORD);
};

const isDue = (settings: AutoBackupSettings): boolean => {
    if (!settings.lastRunAt) return true;
    const elapsedMs = Date.now() - new Date(settings.lastRunAt).getTime();
    // An unparseable lastRunAt would make elapsedMs NaN, and NaN >= anything is always false -
    // treat that as "due" instead of silently disabling auto-backup forever for that user.
    if (Number.isNaN(elapsedMs)) return true;
    const dueMs = FREQUENCY_DAYS[settings.frequency] * 24 * 60 * 60 * 1000;
    return elapsedMs >= dueMs;
};

export type AutoBackupRunResult =
    | { status: 'success' }
    | { status: 'skipped'; reason: string }
    | { status: 'error'; message: string };

/**
 * Entry point called from the daily background task (see backgroundService.ts). No-ops unless
 * auto-backup is enabled, a password is stored, and the chosen frequency's interval has actually
 * elapsed since the last successful run - the background task itself fires opportunistically
 * (not on a guaranteed schedule), so the real cadence gating happens here.
 *
 * Never throws: failures are caught and returned as a result instead, so a broken auto-backup
 * can't take down the rest of the background task (recurrence processing, monthly summary sync).
 * LAST_RUN is only updated on full success, so a failed run (e.g. folder access revoked) is
 * retried next time the background task fires rather than being silently marked done.
 *
 * @param options.force - Skip the due-date check (still respects enabled/password/folder). Used
 * by the "Run Auto Backup Now" developer option to test the real end-to-end flow immediately
 * instead of waiting up to two weeks for it to naturally become due.
 */
export const runAutoBackupIfDue = async (options?: { force?: boolean }): Promise<AutoBackupRunResult> => {
    try {
        const settings = await getAutoBackupSettings();
        if (!settings.enabled) {
            return { status: 'skipped', reason: 'Auto-backup is turned off.' };
        }
        if (!options?.force && !isDue(settings)) {
            return { status: 'skipped', reason: 'Not due yet.' };
        }

        const password = await getAutoBackupPassword();
        if (!password) {
            return { status: 'skipped', reason: 'No backup password has been set.' };
        }

        if (Platform.OS === 'android' && !settings.folderUri) {
            return { status: 'skipped', reason: 'No backup folder has been chosen.' };
        }

        // createBackup always stages the encrypted zip in the app's own sandboxed Documents
        // dir first (same as a manual backup does).
        const stagedUri = await createBackup(password, undefined, 'auto');

        if (Platform.OS === 'android' && settings.folderUri) {
            const staged = new File(stagedUri);
            const base64 = await staged.base64();
            const nameWithoutExt = staged.name.replace(/\.zip$/i, '');
            const safUri = await StorageAccessFramework.createFileAsync(
                settings.folderUri,
                nameWithoutExt,
                'application/zip'
            );
            await StorageAccessFramework.writeAsStringAsync(safUri, base64, { encoding: 'base64' });

            // The internal staging copy was never meant to be user-visible - now that it's
            // safely in the user's chosen folder, drop it so it doesn't pile up in app storage.
            // (This is separate from the "no auto-pruning" decision, which is about not
            // touching files inside the user's own chosen folder.)
            try {
                staged.delete();
            } catch (err) {
                console.warn('[AutoBackup] Failed to clean up staging file:', err);
            }
        }
        // iOS: nothing further to do - the staged file in Paths.document IS the destination,
        // browsable/movable via the Files app (see ios.infoPlist UIFileSharingEnabled).

        await AsyncStorage.setItem(ASYNC_KEYS.AUTO_BACKUP.LAST_RUN, new Date().toISOString());
        return { status: 'success' };
    } catch (error) {
        console.error('[AutoBackup] Run failed:', error);
        const rawMessage = (error as Error).message ?? String(error);
        const message = /isn't writable|is not writable/i.test(rawMessage)
            ? FOLDER_NOT_WRITABLE_MESSAGE
            : rawMessage;
        return { status: 'error', message };
    }
};
