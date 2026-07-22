import { getAllCategories, bulkUpsertCategoriesForMerge } from '@services/domain/categoryService';
import { getAllDebts, bulkSaveDebts, deleteDebt } from '@services/domain/debtService';
import { getAllRecurrenceRules, bulkUpsertRecurrenceRulesForMerge, deleteRecurrenceRule } from '@services/domain/recurrenceService';
import { getAllInvestments, bulkUpsertInvestmentsForMerge, deleteInvestment } from '@services/domain/investmentService';
import { getAllTransactions, bulkUpsertTransactionsForMerge, deleteTransaction } from '@services/domain/transactionService';
import { getAllReminders, bulkUpsertRemindersForMerge, deleteReminder } from '@services/domain/reminderService';
import { getAllBudgets, bulkUpsertBudgetsForMerge, deleteBudget } from '@services/domain/budgetService';

/**
 * Descriptor for one entity type in the two-way merge sync feature. Deliberately kept
 * separate from ENTITY_REGISTRY (backupEntities.ts) - that registry points at the
 * "always stamp now" save functions used by destructive backup/restore, and also
 * covers market-data caches (assets/priceHistories/dividendHistories) that are out of
 * scope for sync. This one points at the merge-safe bulkUpsertForMerge functions that
 * preserve each record's real createdAt/updatedAt, which last-write-wins depends on.
 */
export interface SyncEntityDescriptor<T = any> {
    key: string;                                   // matches deleted_records.entityType and entities/<key>.enc in the sync package
    label: string;
    getAll: () => Promise<T[]>;
    bulkUpsertForMerge: (items: T[]) => Promise<void>;
    deleteOne: ((id: string) => Promise<void>) | null; // null when there's no delete path for this entity yet (categories)
    idField: string;                               // property on T holding its primary key (usually 'id'; 'category' for budgets)
}

export const SYNC_ENTITY_REGISTRY: SyncEntityDescriptor[] = [
    { key: 'categories', label: 'Categories', getAll: getAllCategories, bulkUpsertForMerge: bulkUpsertCategoriesForMerge, deleteOne: null, idField: 'id' },
    { key: 'debts', label: 'Debts', getAll: getAllDebts, bulkUpsertForMerge: bulkSaveDebts, deleteOne: deleteDebt, idField: 'id' },
    { key: 'recurrenceRules', label: 'Recurring Rules', getAll: getAllRecurrenceRules, bulkUpsertForMerge: bulkUpsertRecurrenceRulesForMerge, deleteOne: deleteRecurrenceRule, idField: 'id' },
    { key: 'investments', label: 'Investments', getAll: getAllInvestments, bulkUpsertForMerge: bulkUpsertInvestmentsForMerge, deleteOne: deleteInvestment, idField: 'id' },
    { key: 'transactions', label: 'Transactions', getAll: getAllTransactions, bulkUpsertForMerge: bulkUpsertTransactionsForMerge, deleteOne: deleteTransaction, idField: 'id' },
    { key: 'reminders', label: 'Reminders', getAll: getAllReminders, bulkUpsertForMerge: bulkUpsertRemindersForMerge, deleteOne: deleteReminder, idField: 'id' },
    { key: 'budgets', label: 'Budgets', getAll: getAllBudgets, bulkUpsertForMerge: bulkUpsertBudgetsForMerge, deleteOne: deleteBudget, idField: 'category' },
];
