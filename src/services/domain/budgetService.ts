import { Budget } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { encryptField, decryptField } from '@services/core/encryptionService';

/**
 * Bulk save budgets (for restore)
 */
export const bulkSaveBudgets = async (budgets: Budget[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const budget of budgets) {
                const encryptedAmount = await encryptField(budget.amount);
                await db.runAsync(
                    'INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)',
                    [budget.category, encryptedAmount]
                );
            }
        });
    } catch (error) {
        console.error('Error bulk saving budgets:', error);
        throw error;
    }
};


/**
 * Get all budgets
 */
export const getAllBudgets = async (): Promise<Budget[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT category, amount FROM budgets');

        const budgets = await Promise.all(rows.map(async (row) => ({
            category: row.category,
            amount: parseFloat((await decryptField(row.amount)) || '0')
        })));

        return budgets;
    } catch (error) {
        console.error('Error loading budgets:', error);
        return [];
    }
};

/**
 * Set or update a budget for a category
 */
export const setBudget = async (category: string, amount: number): Promise<void> => {
    try {
        const db = await getDatabase();
        const encryptedAmount = await encryptField(amount);

        await db.runAsync(
            'INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)',
            [category, encryptedAmount]
        );
    } catch (error) {
        console.error('Error setting budget:', error);
        throw error;
    }
};

/**
 * Delete a budget for a category
 */
export const deleteBudget = async (category: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM budgets WHERE category = ?', [category]);
    } catch (error) {
        console.error('Error deleting budget:', error);
        throw error;
    }
};

/**
 * Get budget for a specific category
 */
export const getBudgetForCategory = async (category: string): Promise<number | null> => {
    try {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ amount: string }>(
            'SELECT amount FROM budgets WHERE category = ?',
            [category]
        );

        if (result && result.amount) {
            const decrypted = await decryptField(result.amount);
            return decrypted ? parseFloat(decrypted) : null;
        }
        return null;
    } catch (error) {
        console.error('Error getting budget for category:', error);
        return null;
    }
};

/**
 * Check if spending exceeds budget for a category
 */
export const checkBudgetStatus = (spent: number, budget: number): {
    percentage: number;
    status: 'safe' | 'warning' | 'over'
} => {
    const percentage = (spent / budget) * 100;

    let status: 'safe' | 'warning' | 'over';
    if (percentage > 100) {
        status = 'over';
    } else if (percentage > 80) {
        status = 'warning';
    } else {
        status = 'safe';
    }

    return { percentage, status };
};