import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface BackupReminderModalProps {
    visible: boolean;
    onClose: () => void;
    onCreateBackup: () => void;
    onRemindLater: () => void;
}

const BackupReminderModal: React.FC<BackupReminderModalProps> = ({
    visible,
    onClose,
    onCreateBackup,
    onRemindLater
}) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title=""
        >
            <View style={styles.container}>
                <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="cloud-offline" size={32} color={colors.warning} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Backup Reminder</Text>

                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    You haven&apos;t backed up your data yet. Do it now?
                </Text>

                <View style={styles.buttonContainer}>
                    <Button
                        title="Create Backup"
                        onPress={onCreateBackup}
                        style={styles.primaryButton}
                    />
                    <Button
                        title="Remind me in 7 days"
                        onPress={onRemindLater}
                        variant="outline"
                        style={styles.secondaryButton}
                    />
                </View>
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
    },
    secondaryButton: {
        width: '100%',
    },
});

export default BackupReminderModal;
