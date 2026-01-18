import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGETS_KEY = '@budgets';

export interface Budget {
    category: string;
    amount: number;
}

/**
 * Get all budgets
 */
export const getBudgets = async (): Promise<Budget[]> => {
    try {
        const data = await AsyncStorage.getItem(BUDGETS_KEY);
        return data ? JSON.parse(data) : [];
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
        const budgets = await getBudgets();
        const existingIndex = budgets.findIndex(b => b.category === category);

        if (existingIndex >= 0) {
            budgets[existingIndex].amount = amount;
        } else {
            budgets.push({ category, amount });
        }

        await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
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
        const budgets = await getBudgets();
        const filtered = budgets.filter(b => b.category !== category);
        await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(filtered));
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
        const budgets = await getBudgets();
        const budget = budgets.find(b => b.category === category);
        return budget ? budget.amount : null;
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
