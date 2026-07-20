import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import SettingItem from '@components/common/SettingItem';
import { Card, Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import * as Security from '@services/core/securityService';
import {
    AutoBackupFrequency,
    getAutoBackupSettings,
    setAutoBackupEnabled,
    setAutoBackupFrequency,
    pickAutoBackupFolder,
    getFolderDisplayName,
    hasAutoBackupPassword,
    setAutoBackupPassword,
    FOLDER_NOT_WRITABLE_MESSAGE,
} from '@services/integrations/autoBackupService';

const FREQUENCY_OPTIONS: { label: string; value: AutoBackupFrequency }[] = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Every 2 weeks', value: 'biweekly' },
];

const MIN_PASSWORD_LENGTH = 4;

const formatLastRun = (iso: string | null): string => {
    if (!iso) return 'Not run yet';
    const d = new Date(iso);
    return `Last run ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

interface AutoBackupCardProps {
    // Bumped by the "Run Auto Backup Now" developer option after it finishes, so the last-run
    // timestamp/folder shown here refresh without waiting for the screen to lose and regain focus.
    refreshSignal?: number;
}

const AutoBackupCard: React.FC<AutoBackupCardProps> = ({ refreshSignal }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    const [enabled, setEnabled] = useState(false);
    const [frequency, setFrequency] = useState<AutoBackupFrequency>('weekly');
    const [folderUri, setFolderUri] = useState<string | null>(null);
    const [lastRunAt, setLastRunAt] = useState<string | null>(null);
    const [hasPassword, setHasPassword] = useState(false);

    const [showFrequencyModal, setShowFrequencyModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordModalMode, setPasswordModalMode] = useState<'set' | 'change'>('set');

    const loadSettings = useCallback(async () => {
        const settings = await getAutoBackupSettings();
        setEnabled(settings.enabled);
        setFrequency(settings.frequency);
        setFolderUri(settings.folderUri);
        setLastRunAt(settings.lastRunAt);
        setHasPassword(await hasAutoBackupPassword());
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [loadSettings])
    );

    useEffect(() => {
        if (refreshSignal !== undefined) loadSettings();
    }, [refreshSignal, loadSettings]);

    // Shared by every call site that triggers the folder picker: applies a successful pick,
    // or explains why the folder was rejected (canceled needs no message).
    const handleFolderPickResult = (result: Awaited<ReturnType<typeof pickAutoBackupFolder>>) => {
        if (result.status === 'picked') {
            setFolderUri(result.uri);
        } else if (result.status === 'not_writable') {
            showAlert('Folder Not Supported', FOLDER_NOT_WRITABLE_MESSAGE);
        }
    };

    const handleToggle = async (value: boolean) => {
        setEnabled(value);
        await setAutoBackupEnabled(value);
        if (!value) return;

        const alreadyHasPassword = await hasAutoBackupPassword();
        if (!alreadyHasPassword) {
            // Don't also launch the folder picker here - it would collide with this modal.
            // handleSavePassword continues into the folder picker once this is done.
            setPasswordModalMode('set');
            setShowPasswordModal(true);
            return;
        }

        if (Platform.OS === 'android' && !folderUri) {
            handleFolderPickResult(await pickAutoBackupFolder());
        }
    };

    const handlePickFolder = async () => {
        handleFolderPickResult(await pickAutoBackupFolder());
    };

    const handlePasswordRowPress = async () => {
        if (hasPassword) {
            const canUseBiometrics = await Security.hasBiometrics();
            if (canUseBiometrics) {
                const success = await Security.authenticateBiometrics();
                if (!success) return;
            }
            setPasswordModalMode('change');
        } else {
            setPasswordModalMode('set');
        }
        setShowPasswordModal(true);
    };

    const handleSavePassword = async (password: string) => {
        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            showAlert('Error', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        await setAutoBackupPassword(password);
        setHasPassword(true);
        setShowPasswordModal(false);

        // Continue the enable flow into the folder picker (Android only) now that the
        // password prompt is out of the way - but only when this save came from first
        // turning auto-backup on, not from a later "change password" tap.
        if (passwordModalMode === 'set' && Platform.OS === 'android' && !folderUri) {
            handleFolderPickResult(await pickAutoBackupFolder());
        }
    };

    const handleSelectFrequency = async (value: AutoBackupFrequency) => {
        await setAutoBackupFrequency(value);
        setFrequency(value);
        setShowFrequencyModal(false);
    };

    const frequencyLabel = FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label ?? 'Weekly';
    const folderLabel = getFolderDisplayName(folderUri);

    return (
        <>
            <Card style={{ marginBottom: 16 }}>
                <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="time" size={22} color={colors.success} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Auto Backup</Text>
                </View>

                <SettingItem
                    icon="cloud-done"
                    title="Automatic Backups"
                    subtitle={enabled ? formatLastRun(lastRunAt) : 'Off'}
                    iconBg={colors.success + '20'}
                    iconColor={colors.success}
                    isLast={!enabled}
                    rightElement={
                        <Switch
                            value={enabled}
                            onValueChange={handleToggle}
                            trackColor={{ false: colors.gray300, true: colors.primary + '80' }}
                            thumbColor={enabled ? colors.primary : colors.gray300}
                        />
                    }
                />

                {enabled && (
                    <>
                        <SettingItem
                            icon="repeat"
                            title="Frequency"
                            subtitle={frequencyLabel}
                            onPress={() => setShowFrequencyModal(true)}
                            iconBg={colors.info + '20'}
                            iconColor={colors.info}
                        />

                        {Platform.OS === 'android' && (
                            <SettingItem
                                icon="folder"
                                title="Backup Folder"
                                subtitle={folderLabel ?? 'Required — tap to choose a folder'}
                                onPress={handlePickFolder}
                                iconBg={folderLabel ? colors.primary + '20' : colors.warning + '20'}
                                iconColor={folderLabel ? colors.primary : colors.warning}
                            />
                        )}

                        <SettingItem
                            icon="key"
                            title="Backup Password"
                            subtitle={hasPassword ? 'Tap to change' : 'Required — tap to set'}
                            onPress={handlePasswordRowPress}
                            iconBg={hasPassword ? colors.primary + '20' : colors.warning + '20'}
                            iconColor={hasPassword ? colors.primary : colors.warning}
                            isLast
                        />

                        {Platform.OS === 'ios' && (
                            <View style={{ paddingTop: 12 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
                                    Auto-backups are saved to WealthSnap&apos;s on-device folder. Open the Files app (On My iPhone → WealthSnap) to move copies to iCloud Drive or elsewhere.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </Card>

            {/* Frequency Selection Modal */}
            <BottomModal
                visible={showFrequencyModal}
                onClose={() => setShowFrequencyModal(false)}
                title="Backup Frequency"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8 }}>
                        {FREQUENCY_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => handleSelectFrequency(opt.value)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 14,
                                    paddingHorizontal: 4,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border
                                }}
                            >
                                <Text style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    fontWeight: frequency === opt.value ? '600' : '400'
                                }}>
                                    {opt.label}
                                </Text>
                                {frequency === opt.value && (
                                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </BottomModal>

            {/* Password Set/Change Modal */}
            <PasswordModal
                visible={showPasswordModal}
                mode={passwordModalMode}
                onClose={() => setShowPasswordModal(false)}
                onSubmit={handleSavePassword}
            />
        </>
    );
};

interface PasswordModalProps {
    visible: boolean;
    mode: 'set' | 'change';
    onClose: () => void;
    onSubmit: (password: string) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ visible, mode, onClose, onSubmit }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        if (visible) {
            setPassword('');
            setConfirmPassword('');
        }
    }, [visible]);

    const isPasswordTooShort = password.length < MIN_PASSWORD_LENGTH;

    const handleSubmit = () => {
        if (password !== confirmPassword) {
            showAlert('Error', 'Passwords do not match.');
            return;
        }
        onSubmit(password);
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={mode === 'set' ? 'Set Backup Password' : 'Change Backup Password'}
            subtitle="Stored securely on this device so auto-backups can run in the background without asking you each time."
            dismissable={false}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    marginBottom: 12,
                    backgroundColor: colors.surface
                }}>
                    <TextInput
                        style={{ flex: 1, padding: 12, color: colors.text }}
                        placeholder="New password"
                        placeholderTextColor={colors.gray500}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity
                        onPressIn={() => setShowPassword(true)}
                        onPressOut={() => setShowPassword(false)}
                        style={{ padding: 10 }}
                    >
                        <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    marginBottom: 20,
                    backgroundColor: colors.surface
                }}>
                    <TextInput
                        style={{ flex: 1, padding: 12, color: colors.text }}
                        placeholder="Confirm password"
                        placeholderTextColor={colors.gray500}
                        secureTextEntry={!showPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                <View style={{ gap: 10 }}>
                    <Button title="Save" onPress={handleSubmit} disabled={isPasswordTooShort} />
                    <Button variant="outline" title="Cancel" onPress={onClose} />
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
});

export default AutoBackupCard;
