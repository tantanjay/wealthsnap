import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';

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

                <View style={{ gap: 10 }}>
                    <Button
                        title={isProcessing ? "Restoring..." : "Restore Data"}
                        onPress={() => onRestore(password)}
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

export default RestoreModal;
