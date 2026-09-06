import { useAlert } from '@context/AlertContext';
import { Transaction } from '@types';

/**
 * Shared "Delete Debt" confirmation, used by every place that offers a Delete action on a
 * debt (DebtOptionsModal, DebtStatusModal) - previously each hardcoded its own copy of the
 * same title/body/buttons, which could silently drift out of sync with each other.
 */
export const useConfirmDeleteDebt = (
    onDelete: (id: string, deleteLinked: boolean) => void,
    onClose: () => void
) => {
    const { showAlert } = useAlert();

    return (debtId: string, linkedTransaction: Transaction | null) => {
        showAlert(
            "Delete Debt",
            linkedTransaction
                ? "This debt has a linked transaction. Deleting this will also delete the associated transaction record."
                : "Are you sure you want to delete this debt record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        onDelete(debtId, !!linkedTransaction);
                        onClose();
                    }
                }
            ]
        );
    };
};
