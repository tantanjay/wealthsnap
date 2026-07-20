import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
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
        title: 'Create Backup',
        subtitle: 'Enter a password to encrypt your backup file.',
        idleLabel: 'Create & Share',
        processingLabel: 'Creating...',
    },
    restore: {
        title: 'Restore Backup',
        subtitle: 'Enter the password for this backup file.',
        idleLabel: 'Restore Data',
        processingLabel: 'Restoring...',
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
    const { colors } = useTheme();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const copy = COPY[mode];

    useEffect(() => {
        if (visible) setPassword('');
    }, [visible]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={copy.title}
            subtitle={copy.subtitle}
            dismissable={false}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
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
                        style={{
                            flex: 1,
                            padding: 12,
                            color: colors.text,
                        }}
                        placeholder="Password"
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
                        <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {isProcessing && progress?.label ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                        {progress.label}
                    </Text>
                ) : null}

                <View style={{ gap: 10 }}>
                    <Button
                        title={isProcessing ? copy.processingLabel : copy.idleLabel}
                        onPress={() => onSubmit(password)}
                        disabled={isProcessing}
                    />
                    <Button
                        variant="outline"
                        title="Cancel"
                        onPress={onClose}
                        disabled={isProcessing}
                    />
                </View>
            </ScrollView>
        </BottomModal>
    );
};

export default BackupRestoreModal;
