import { saveUserProfile, saveTransaction, saveCategory, setOnboardingComplete, clearAllData } from './storageService';
import { UserProfile, Transaction, TransactionType, Category } from '../types';
import { CONFIG } from '../constants/config';

const EXPENSE_CATEGORIES = [
    { name: 'Food', type: 'EXPENSE' as TransactionType, icon: 'fast-food' },
    { name: 'Transportation', type: 'EXPENSE' as TransactionType, icon: 'car' }, // Changed from 'Transport'
    { name: 'Electricity', type: 'EXPENSE' as TransactionType, icon: 'flash' }, // Changed from 'Utilities'
    { name: 'Entertainment', type: 'EXPENSE' as TransactionType, icon: 'film' },
    { name: 'Shopping', type: 'EXPENSE' as TransactionType, icon: 'cart' },
    { name: 'Medical', type: 'EXPENSE' as TransactionType, icon: 'medkit' }, // Changed from 'Health'
    { name: 'Groceries', type: 'EXPENSE' as TransactionType, icon: 'cart' },
    { name: 'Water', type: 'EXPENSE' as TransactionType, icon: 'water' },
];

const INCOME_CATEGORIES = [
    { name: 'Salary', type: 'INCOME' as TransactionType, icon: 'cash' },
];

const generateRandomId = () => Math.random().toString(36).substr(2, 9);

const getRandomAmount = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateDummyData = async () => {
    if (!CONFIG.ENABLE_DUMMY_DATA) return;

    try {
        console.log('Generating Dummy Data...');
        await clearAllData();

        // 1. Create Profile
        const profile: UserProfile = {
            id: generateRandomId(),
            name: 'Alex Doe',
            currency: 'USD',
            monthlySalary: 5000,
            financialGoals: ['Save $10k', 'Buy a Car'],
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveUserProfile(profile);
        await setOnboardingComplete();

        // 2. Create Categories
        const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
        for (const cat of allCategories) {
            await saveCategory({
                id: generateRandomId(),
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                isDefault: true,
            });
        }

        // 3. Generate Transactions for last 6 months
        const today = new Date();
        const transactions: Transaction[] = [];

        for (let i = 0; i < 6; i++) {
            const currentMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();

            // Income on 15th
            const incomeDate15 = new Date(year, month, 15);
            if (incomeDate15 <= today) {
                transactions.push({
                    id: generateRandomId(),
                    type: 'INCOME',
                    amount: 2500,
                    category: 'Salary',
                    date: incomeDate15.toISOString(),
                    isRecurring: true,
                    note: 'Salary payment 1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            // Income on End of Month
            const incomeDateEOM = new Date(year, month + 1, 0); // Last day of month
            if (incomeDateEOM <= today) {
                transactions.push({
                    id: generateRandomId(),
                    type: 'INCOME',
                    amount: 2500,
                    category: 'Salary',
                    date: incomeDateEOM.toISOString(),
                    isRecurring: true,
                    note: 'Salary payment 2',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            // Expenses (50-95% of 5k = 2.5k - 4.75k) to ensure more variance
            let targetExpense = getRandomAmount(2500, 4750);

            // Scale target expense for partial current month
            if (month === today.getMonth() && year === today.getFullYear()) {
                const dayOfMonth = today.getDate();
                const totalDaysInMonth = incomeDateEOM.getDate();
                const progress = dayOfMonth / totalDaysInMonth;
                targetExpense = Math.floor(targetExpense * progress);
            }
            let currentExpense = 0;

            while (currentExpense < targetExpense) {
                const remaining = targetExpense - currentExpense;

                if (remaining <= 20) {
                    currentExpense = targetExpense;
                    break;
                }

                // Ensure max isn't less than min (20)
                const maxExpense = Math.max(20, Math.min(remaining, 1500));
                const expenseAmount = getRandomAmount(20, maxExpense);

                if (currentExpense + expenseAmount > targetExpense) break;

                const randomDay = getRandomAmount(1, incomeDateEOM.getDate());
                const expenseDate = new Date(year, month, randomDay);

                if (expenseDate > today) continue;

                const randomCategory = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];

                transactions.push({
                    id: generateRandomId(),
                    type: 'EXPENSE',
                    amount: expenseAmount,
                    category: randomCategory.name,
                    date: expenseDate.toISOString(),
                    isRecurring: false,
                    note: `Dummy ${randomCategory.name} expense`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                currentExpense += expenseAmount;
            }
        }

        // Save all transactions
        for (const t of transactions) {
            await saveTransaction(t);
        }

        console.log(`Generated ${transactions.length} dummy transactions.`);

    } catch (error) {
        console.error('Error generating dummy data:', error);
    }
};
