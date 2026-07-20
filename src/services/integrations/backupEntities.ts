import { bulkSaveTransactionReceipts, bulkSaveTransactions, getAllTransactionReceipts, getAllTransactions } from '@services/domain/transactionService';
import { bulkSaveInvestments, getAllInvestments } from '@services/domain/investmentService';
import { bulkSaveCategories, getAllCategories } from '@services/domain/categoryService';
import { bulkSaveRecurrenceRules, getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { bulkSaveBudgets, getAllBudgets } from '@services/domain/budgetService';
import { bulkSaveReminders, getAllReminders } from '@services/domain/reminderService';
import { bulkSaveAssets, getAllAssets } from '@services/domain/assetService';
import { bulkSavePriceHistories, getAllPriceHistories } from '@services/domain/priceHistoryService';
import { bulkSaveDividendHistories, getAllDividendHistories } from '@services/domain/dividendHistoryService';
import { bulkSaveDebts, getAllDebts } from '@services/domain/debtService';

export interface EntityFkField<T> {
    field: keyof T & string;   // top-level field on this entity holding a foreign id
    refEntity: string;         // registry key of the entity that owns that id
}

export interface EntityDescriptor<T = any> {
    key: string;                              // manifest key + entities/<key>.enc filename
    label: string;                            // progress-UI label
    getAll: () => Promise<T[]>;
    bulkSave: (items: T[]) => Promise<void>;
    hasId: boolean;                           // run sanitizeIds? (false for Budget/Asset — no id field; also false for PriceHistory/DividendHistory — id exists but nothing joins on it, everything joins by symbol)
    fkFields?: EntityFkField<T>[];             // top-level FK fields to remap after all sanitize passes complete
}

export const ENTITY_REGISTRY: EntityDescriptor[] = [
    { key: 'categories', label: 'Categories', getAll: getAllCategories, bulkSave: bulkSaveCategories, hasId: true },
    { key: 'debts', label: 'Debts', getAll: getAllDebts, bulkSave: bulkSaveDebts, hasId: true },
    { key: 'recurrenceRules', label: 'Recurring Rules', getAll: getAllRecurrenceRules, bulkSave: bulkSaveRecurrenceRules, hasId: true },
    {
        key: 'investments', label: 'Investments', getAll: getAllInvestments, bulkSave: bulkSaveInvestments, hasId: true,
        fkFields: [{ field: 'recurrenceId', refEntity: 'recurrenceRules' }],
    },
    {
        key: 'transactions', label: 'Transactions', getAll: getAllTransactions, bulkSave: bulkSaveTransactions, hasId: true,
        fkFields: [
            { field: 'recurrenceId', refEntity: 'recurrenceRules' },
            { field: 'investmentId', refEntity: 'investments' },
            { field: 'debtId', refEntity: 'debts' },
        ],
    },
    {
        key: 'transactionReceipts', label: 'Receipts', getAll: getAllTransactionReceipts, bulkSave: bulkSaveTransactionReceipts, hasId: false,
        fkFields: [{ field: 'transactionId', refEntity: 'transactions' }],
    },
    { key: 'reminders', label: 'Reminders', getAll: getAllReminders, bulkSave: bulkSaveReminders, hasId: true },
    { key: 'budgets', label: 'Budgets', getAll: getAllBudgets, bulkSave: bulkSaveBudgets, hasId: false },
    { key: 'assets', label: 'Assets', getAll: getAllAssets, bulkSave: bulkSaveAssets, hasId: false },
    { key: 'priceHistories', label: 'Price History', getAll: getAllPriceHistories, bulkSave: bulkSavePriceHistories, hasId: false },
    { key: 'dividendHistories', label: 'Dividend History', getAll: getAllDividendHistories, bulkSave: bulkSaveDividendHistories, hasId: false },
];
