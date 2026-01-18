import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import BottomModal from './BottomModal';
import { Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface RestoreModalProps {
    visible: boolean;
    onClose: () => void;
    onRestore: (password: string) => void;
    isProcessing: boolean;
}

const RestoreModal: React.FC<RestoreModalProps> = ({
    visible,
    onClose,
    onRestore,
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
            title="Restore Backup"
            subtitle="Enter the password for this backup file."
        >
            <View style={{ marginBottom: 20 }}>
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
        </BottomModal>
    );
};

export default RestoreModal;
