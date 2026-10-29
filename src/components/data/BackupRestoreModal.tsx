import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { BackupProgress } from '@services/integrations/backupService';

type BackupRestoreMode = 'backup' | 'restore';

interface BackupRestoreModalProps {
    visible: boolean;
    mode: BackupRestoreMode;
    onClose: () => void;
    onSubmit: (password: string) => void;
    isProcessing: boolean;
    progress?: BackupProgress | null;
}

const COPY: Record<BackupRestoreMode, { title: string; subtitle: string; idleLabel: string; processingLabel: string }> = {
    backup: {
        title: 'Create backup',
        subtitle: 'Enter a password to encrypt your backup file.',
        idleLabel: 'Create & share',
        processingLabel: 'Creating…',
    },
    restore: {
        title: 'Restore backup',
        subtitle: 'Enter the password for this backup file.',
        idleLabel: 'Restore data',
        processingLabel: 'Restoring…',
    },
};

const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
    visible,
    mode,
    onClose,
    onSubmit,
    isProcessing,
    progress,
}) => {
    const { ds } = useTheme();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const copy = COPY[mode];

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets form field on open; see FIXES.md
        if (visible) setPassword('');
    }, [visible]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={copy.title}
            subtitle={copy.subtitle}
            dismissable={false}
            footer={
                <>
                    {isProcessing && progress?.label ? (
                        <Text style={[type.small, styles.progress, { color: ds.text2 }]}>
                            {progress.label}
                        </Text>
                    ) : null}

                    <Pressable
                        onPress={() => onSubmit(password)}
                        disabled={isProcessing}
                        style={[styles.button, { backgroundColor: ds.accent }, isProcessing && styles.disabled]}
                        accessibilityRole="button"
                    >
                        {isProcessing && <ActivityIndicator size="small" color={ds.onAccent} />}
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>
                            {isProcessing ? copy.processingLabel : copy.idleLabel}
                        </Text>
                    </Pressable>
                    <Pressable onPress={onClose} disabled={isProcessing} style={[styles.textButton, isProcessing && styles.disabled]} accessibilityRole="button">
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
                            placeholder="Password"
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
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    input: {
        flex: 1,
        padding: 0,
    },
    progress: {
        textAlign: 'center',
        marginBottom: space[3],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        flexDirection: 'row',
        gap: space[2],
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

export default BackupRestoreModal;
