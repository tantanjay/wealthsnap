import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { Group, Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { SavingsGoal } from '@types';
import { useConfirmDeleteSavingsGoal } from '@hooks/useConfirmDeleteSavingsGoal';

interface SavingsGoalOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    goal: SavingsGoal | null;
    balance: BigNumber;
    onEdit: (goal: SavingsGoal) => void;
    onDelete: (id: string) => void;
    onTogglePause: (goal: SavingsGoal) => void;
    onWithdraw: (goal: SavingsGoal) => void;
    onAddFunds: (goal: SavingsGoal) => void;
}

// Same shape as DebtStatusModal: Edit/Delete on top, then state-changing actions
// that explain themselves inline instead of a second confirm step.
const SavingsGoalOptionsModal: React.FC<SavingsGoalOptionsModalProps> = ({
    visible, onClose, goal, balance, onEdit, onDelete, onTogglePause, onWithdraw, onAddFunds
}) => {
    const { ds } = useTheme();
    const confirmDelete = useConfirmDeleteSavingsGoal(onDelete, onClose);

    if (!goal) return null;

    const handleEditPress = () => { onEdit(goal); onClose(); };
    const handleDeletePress = () => confirmDelete(goal.id, balance);
    const handleTogglePausePress = () => { onTogglePause(goal); onClose(); };
    const handleWithdrawPress = () => { onWithdraw(goal); onClose(); };
    const handleAddFundsPress = () => { onAddFunds(goal); onClose(); };

    const hasRecurrence = goal.recurrenceId != null;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={goal.name}
            subtitle="Manage goal"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Group>
                    <Row icon="create-outline" title="Edit goal" onPress={handleEditPress} />
                    <Row
                        leading={
                            <View style={[styles.tile, { backgroundColor: ds.tileNeutral }]}>
                                <Ionicons name="trash-outline" size={18} color={ds.danger} />
                            </View>
                        }
                        title="Delete goal"
                        onPress={handleDeletePress}
                        last
                    />
                </Group>

                <SectionHeader grouped title="Money" />
                <Group>
                    <Row
                        domain="goals"
                        icon="add-circle-outline"
                        title="Add funds"
                        subtitle="Manually top up this goal right now, separate from its recurring schedule. Always available, even while paused."
                        onPress={handleAddFundsPress}
                    />
                    <Row
                        domain="goals"
                        icon="arrow-undo-outline"
                        title="Withdraw to cash"
                        subtitle="Need emergency cash? Move money out of this goal and back into your general funds."
                        onPress={handleWithdrawPress}
                        last={!hasRecurrence}
                    />
                    {hasRecurrence && (
                        <Row
                            icon={goal.isPaused ? 'play-circle-outline' : 'pause-circle-outline'}
                            title={goal.isPaused ? 'Resume auto-contribution' : 'Pause auto-contribution'}
                            subtitle={goal.isPaused
                                ? "Resumes the recurring contribution on its normal schedule."
                                : "Only stops the recurring auto-contribution - the goal keeps its balance, and you can still Add Funds manually."}
                            onPress={handleTogglePausePress}
                            last
                        />
                    )}
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    // Matches Row's neutral icon tile; only the icon carries the danger tone.
    tile: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SavingsGoalOptionsModal;
