import { getDatabase } from './database/databaseService';

export interface Budget {
    category: string;
    amount: number;
}

/**
 * Get all budgets
 */
export const getBudgets = async (): Promise<Budget[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT category, amount FROM budgets');
        return rows.map(row => ({
            category: row.category,
            amount: row.amount
        }));
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
        await db.runAsync(
            'INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)',
            [category, amount]
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
        const result = await db.getFirstAsync<{ amount: number }>(
            'SELECT amount FROM budgets WHERE category = ?',
            [category]
        );
        return result ? result.amount : null;
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

/**
 * Clear all budgets
 */
export const clearBudgets = async (): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM budgets');
    } catch (error) {
        console.error('Error clearing budgets:', error);
    }
};

/**
 * Bulk save budgets (for restore)
 */
export const bulkSaveBudgets = async (budgets: Budget[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const budget of budgets) {
                await db.runAsync(
                    'INSERT OR REPLACE INTO budgets (category, amount) VALUES (?, ?)',
                    [budget.category, budget.amount]
                );
            }
        });
    } catch (error) {
        console.error('Error bulk saving budgets:', error);
        throw error;
    }
};
