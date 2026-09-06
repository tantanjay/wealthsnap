import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
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

// Same consolidated-gear-menu shape as DebtStatusModal: quick actions (Edit/Delete) on top,
// then mutually-exclusive/state-changing actions below with inline explanatory text instead
// of a second confirm step.
const SavingsGoalOptionsModal: React.FC<SavingsGoalOptionsModalProps> = ({
    visible, onClose, goal, balance, onEdit, onDelete, onTogglePause, onWithdraw, onAddFunds
}) => {
    const { colors } = useTheme();
    const confirmDelete = useConfirmDeleteSavingsGoal(onDelete, onClose);

    if (!goal) return null;

    const handleEditPress = () => { onEdit(goal); onClose(); };
    const handleDeletePress = () => confirmDelete(goal.id, balance);
    const handleTogglePausePress = () => { onTogglePause(goal); onClose(); };
    const handleWithdrawPress = () => { onWithdraw(goal); onClose(); };
    const handleAddFundsPress = () => { onAddFunds(goal); onClose(); };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={goal.name}
            subtitle="Manage Goal"
            maxHeight="85%"
        >
            <View style={styles.container}>
                <View style={styles.quickActions}>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={handleEditPress}>
                        <Ionicons name="create-outline" size={22} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit Goal</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={handleDeletePress}>
                        <Ionicons name="trash-outline" size={22} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete Goal</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleAddFundsPress}>
                    <View style={styles.optionHeader}>
                        <Ionicons name="add-circle-outline" size={22} color={colors.success} />
                        <Text style={[styles.optionTitle, { color: colors.text }]}>Add Funds</Text>
                    </View>
                    <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                        Manually top up this goal right now, separate from its recurring schedule. Always available, even while paused.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleWithdrawPress}>
                    <View style={styles.optionHeader}>
                        <Ionicons name="arrow-undo-outline" size={22} color={colors.text} />
                        <Text style={[styles.optionTitle, { color: colors.text }]}>Withdraw to Cash</Text>
                    </View>
                    <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                        Need emergency cash? Move money out of this goal and back into your general funds.
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleTogglePausePress}>
                    <View style={styles.optionHeader}>
                        <Ionicons name={goal.isPaused ? 'play-circle-outline' : 'pause-circle-outline'} size={22} color={colors.primary} />
                        <Text style={[styles.optionTitle, { color: colors.text }]}>
                            {goal.isPaused ? 'Resume Auto-Contribution' : 'Pause Auto-Contribution'}
                        </Text>
                    </View>
                    <Text style={[styles.optionBody, { color: colors.textSecondary }]}>
                        {goal.isPaused
                            ? "Resumes the recurring contribution on its normal schedule."
                            : "Only stops the recurring auto-contribution - the goal keeps its balance, and you can still Add Funds manually."}
                    </Text>
                </TouchableOpacity>
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: { paddingBottom: 20, gap: 12 },
    quickActions: { borderRadius: 14, overflow: 'hidden' },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 14, justifyContent: 'space-between' },
    actionText: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 12 },
    separator: { height: 1, width: '100%' },
    optionCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
    optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    optionTitle: { fontSize: 16, fontWeight: '700' },
    optionBody: { fontSize: 13, lineHeight: 19 },
});

export default SavingsGoalOptionsModal;
