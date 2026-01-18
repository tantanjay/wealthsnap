import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput } from 'react-native';
import { Button } from './index';
import { useTheme } from '../context/ThemeContext';

interface BackupModalProps {
    visible: boolean;
    onClose: () => void;
    onBackup: (password: string) => void;
    isProcessing: boolean;
}

export const BackupModal: React.FC<BackupModalProps> = ({
    visible,
    onClose,
    onBackup,
    isProcessing
}) => {
    const { colors } = useTheme();
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (visible) setPassword('');
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Create Backup</Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>Enter a password to encrypt your backup file.</Text>

                    <TextInput
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 8,
                            padding: 12,
                            color: colors.text,
                            marginBottom: 20
                        }}
                        placeholder="Password"
                        placeholderTextColor={colors.gray500}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <View style={{ gap: 10 }}>
                        <Button
                            title={isProcessing ? "Creating..." : "Create & Share"}
                            onPress={() => onBackup(password)}
                            disabled={isProcessing}
                        />
                        <Button
                            variant="ghost"
                            title="Cancel"
                            onPress={onClose}
                            disabled={isProcessing}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

interface RestoreModalProps {
    visible: boolean;
    onClose: () => void;
    onRestore: (password: string) => void;
    isProcessing: boolean;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
    visible,
    onClose,
    onRestore,
    isProcessing
}) => {
    const { colors } = useTheme();
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (visible) setPassword('');
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Restore Backup</Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>Enter the password for this backup file.</Text>

                    <TextInput
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 8,
                            padding: 12,
                            color: colors.text,
                            marginBottom: 20
                        }}
                        placeholder="Password"
                        placeholderTextColor={colors.gray500}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <View style={{ gap: 10 }}>
                        <Button
                            title={isProcessing ? "Restoring..." : "Restore Data"}
                            onPress={() => onRestore(password)}
                            disabled={isProcessing}
                        />
                        <Button
                            variant="ghost"
                            title="Cancel"
                            onPress={onClose}
                            disabled={isProcessing}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};
