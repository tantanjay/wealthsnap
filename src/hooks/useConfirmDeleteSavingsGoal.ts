import { useAlert } from '@context/AlertContext';
import { BigNumber } from 'bignumber.js';

/**
 * Shared "Delete Goal" confirmation - mirrors useConfirmDeleteDebt. Warns about the balance
 * sweep (remaining funds return to general cash) instead of debt's linked-transaction
 * warning, since a goal can never have a negative balance to worry about the other way.
 */
export const useConfirmDeleteSavingsGoal = (
    onDelete: (id: string) => void,
    onClose: () => void
) => {
    const { showAlert } = useAlert();

    return (goalId: string, currentBalance: BigNumber) => {
        showAlert(
            "Delete Savings Goal",
            currentBalance.isGreaterThan(0)
                ? "This goal still has money in it. Deleting it will sweep the remaining balance back to your general cash as a transfer."
                : "Are you sure you want to delete this savings goal?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onDelete(goalId);
                        onClose();
                    }
                }
            ]
        );
    };
};
