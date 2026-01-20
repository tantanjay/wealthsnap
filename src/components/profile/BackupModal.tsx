import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import BottomModal from '../common/BottomModal';
import { Button } from '..';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface BackupModalProps {
    visible: boolean;
    onClose: () => void;
    onBackup: (password: string) => void;
    isProcessing: boolean;
}

const BackupModal: React.FC<BackupModalProps> = ({
    visible,
    onClose,
    onBackup,
    isProcessing
}) => {
    const { colors } = useTheme();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (visible) setPassword('');
    }, [visible]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Create Backup"
            subtitle="Enter a password to encrypt your backup file."
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
            </ScrollView>
        </BottomModal>
    );
};

export default BackupModal;
