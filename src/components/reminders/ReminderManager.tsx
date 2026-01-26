import React, { useState } from 'react';
import { View, StyleSheet, } from 'react-native';

import { ReminderForm } from '@components/reminders/ReminderForm';
import { ReminderList } from '@components/reminders/ReminderList';
import { Reminder } from '@types';

interface ReminderManagerProps {
    onClose: () => void;
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({ onClose }) => {
    const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
    const [editingReminder, setEditingReminder] = useState<Reminder | undefined>(undefined);

    const handleAdd = () => {
        setEditingReminder(undefined);
        setView('FORM');
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setView('FORM');
    };

    const handleSave = () => {
        setView('LIST');
    };

    const handleCancel = () => {
        setView('LIST');
    };

    return (
        <View style={styles.container}>
            {view === 'LIST' ? (
                <ReminderList onEdit={handleEdit} onAdd={handleAdd} />
            ) : (
                <ReminderForm
                    reminder={editingReminder}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
