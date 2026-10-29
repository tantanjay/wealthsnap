import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

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
    const { ds } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Backup reminder"
            footer={
                <>
                    <Pressable onPress={onCreateBackup} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Create backup</Text>
                    </Pressable>
                    <Pressable onPress={onRemindLater} style={styles.textButton} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.text2 }]}>Remind me in 7 days</Text>
                    </Pressable>
                </>
            }
        >
            <Group padded>
                <Text style={[type.body, { color: ds.text2 }]}>
                    You haven&apos;t backed up your data yet. Do it now?
                </Text>
            </Group>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default BackupReminderModal;
