import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import { Group, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';
import { useAlert } from '@context/AlertContext';
import { useSecurity } from '@context/SecurityContext';
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
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();

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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async storage read; see FIXES.md
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
            temporarilyDisableLock();
            handleFolderPickResult(await pickAutoBackupFolder());
        }
    };

    const handlePickFolder = async () => {
        temporarilyDisableLock();
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
            temporarilyDisableLock();
            handleFolderPickResult(await pickAutoBackupFolder());
        }
    };

    const handleSelectFrequency = async (value: AutoBackupFrequency) => {
        await setAutoBackupFrequency(value);
        setFrequency(value);
        setShowFrequencyModal(false);
    };

    const warningIcon = <Ionicons name="alert-circle-outline" size={18} color={ds.warning} />;
    const frequencyLabel = FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label ?? 'Weekly';
    const folderLabel = getFolderDisplayName(folderUri);

    return (
        <>
            <SectionHeader grouped title="Auto backup" />
            <Group>
                <Row
                    icon="cloud-done-outline"
                    title="Automatic backups"
                    subtitle={enabled ? formatLastRun(lastRunAt) : 'Off'}
                    last={!enabled}
                    trailing={
                        <Switch
                            value={enabled}
                            onValueChange={handleToggle}
                            trackColor={{ false: ds.hairline, true: ds.accentSoft }}
                            thumbColor={enabled ? ds.accent : ds.text3}
                        />
                    }
                />

                {enabled && (
                    <>
                        <Row icon="repeat-outline" title="Frequency" subtitle={frequencyLabel} chevron onPress={() => setShowFrequencyModal(true)} />

                        {Platform.OS === 'android' && (
                            <Row
                                icon="folder-outline"
                                title="Backup folder"
                                subtitle={folderLabel ?? 'Required — tap to choose a folder'}
                                trailing={folderLabel ? undefined : warningIcon}
                                chevron
                                onPress={handlePickFolder}
                            />
                        )}

                        <Row
                            icon="key-outline"
                            title="Backup password"
                            subtitle={hasPassword ? 'Tap to change' : 'Required — tap to set'}
                            trailing={hasPassword ? undefined : warningIcon}
                            chevron
                            onPress={handlePasswordRowPress}
                            last
                        />
                    </>
                )}
            </Group>

            {enabled && Platform.OS === 'ios' && (
                <Text style={[type.small, styles.note, { color: ds.text2 }]}>
                    Auto-backups are saved to WealthSnap&apos;s on-device folder. Open the Files app (On My iPhone → WealthSnap) to move copies to iCloud Drive or elsewhere.
                </Text>
            )}

            <BottomModal
                visible={showFrequencyModal}
                onClose={() => setShowFrequencyModal(false)}
                title="Backup frequency"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Group>
                        {FREQUENCY_OPTIONS.map((opt, i) => (
                            <Row
                                key={opt.value}
                                title={opt.label}
                                leading={<Radio selected={frequency === opt.value} />}
                                onPress={() => handleSelectFrequency(opt.value)}
                                last={i === FREQUENCY_OPTIONS.length - 1}
                            />
                        ))}
                    </Group>
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

const Radio: React.FC<{ selected: boolean }> = ({ selected }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
            {selected && <View style={[styles.radioDot, { backgroundColor: ds.accent }]} />}
        </View>
    );
};

const PasswordModal: React.FC<PasswordModalProps> = ({ visible, mode, onClose, onSubmit }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets form fields on open; see FIXES.md
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
            title={mode === 'set' ? 'Set backup password' : 'Change backup password'}
            subtitle="Stored securely on this device so auto-backups can run in the background without asking you each time."
            dismissable={false}
            footer={
                <>
                    <Pressable
                        onPress={handleSubmit}
                        disabled={isPasswordTooShort}
                        style={[styles.button, { backgroundColor: ds.accent }, isPasswordTooShort && styles.disabled]}
                        accessibilityRole="button"
                    >
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save</Text>
                    </Pressable>
                    <Pressable onPress={onClose} style={styles.textButton} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                </>
            }
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Group padded>
                    <View style={[styles.field, { backgroundColor: ds.inset }]}>
                        <Ionicons name="key-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={[type.body, styles.input, { color: ds.text }]}
                            placeholder="New password"
                            placeholderTextColor={ds.text3}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <Pressable
                            onPressIn={() => setShowPassword(true)}
                            onPressOut={() => setShowPassword(false)}
                            hitSlop={space[2]}
                        >
                            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={ds.text2} />
                        </Pressable>
                    </View>

                    <View style={[styles.field, styles.fieldGap, { backgroundColor: ds.inset }]}>
                        <Ionicons name="key-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={[type.body, styles.input, { color: ds.text }]}
                            placeholder="Confirm password"
                            placeholderTextColor={ds.text3}
                            secureTextEntry={!showPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </View>
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    note: {
        paddingTop: space[3],
        paddingHorizontal: layout.groupPadding,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: radius.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldGap: {
        marginTop: space[3],
    },
    input: {
        flex: 1,
        padding: 0,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default AutoBackupCard;
