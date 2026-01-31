import { BigNumber } from 'bignumber.js';
import { UserProfile, Transaction, TransactionType, Investment } from '@types';
import { saveCategory, saveTransaction } from '@services/domain';
import { bulkSaveInvestments } from '@services/domain/investmentService';
import { saveUserProfile, setOnboardingComplete, clearAllData } from '@services/core/storageService';
import { CONFIG } from '@constants/config';

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
        await clearAllData();

        // 1. Create Profile
        const profile: UserProfile = {
            id: generateRandomId(),
            name: 'Alex Doe',
            currency: 'USD',
            monthlySalary: new BigNumber(5000),
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

        // 3. Generate Transactions for last 24 months
        const today = new Date();
        const transactions: Transaction[] = [];

        // Pre-calculate savings rates for each month to ensure constraints
        const monthlyIncome = 5000;
        const minAverageSavingsRate = 0.2; // 20% minimum average
        const savingsRates: number[] = [];

        // First pass: Generate random savings rates
        for (let i = 0; i < 24; i++) {
            const rand = Math.random();

            // 60% chance of positive savings, 40% chance of negative
            if (rand < 0.60) {
                // Positive savings - range from 5% to 60%
                // Add some months with high savings (50%+) to balance negatives
                if (Math.random() < 0.3) {
                    // 30% of positive months have high savings (50-60%)
                    savingsRates.push(0.50 + Math.random() * 0.10);
                } else {
                    // Regular positive savings (5-45%)
                    savingsRates.push(0.05 + Math.random() * 0.40);
                }
            } else {
                // Negative savings - range from -5% to -40%
                savingsRates.push(-0.05 - Math.random() * 0.35);
            }
        }

        // Second pass: Adjust to ensure average >= 10%
        let currentAverage = savingsRates.reduce((sum, rate) => sum + rate, 0) / savingsRates.length;

        if (currentAverage < minAverageSavingsRate) {
            const deficit = minAverageSavingsRate - currentAverage;
            // Boost some months to meet the minimum
            for (let i = 0; i < savingsRates.length; i++) {
                if (savingsRates[i] > 0 && deficit > 0) {
                    const boost = Math.min(deficit * 2, 0.30); // Adjust up to 30%
                    savingsRates[i] += boost;
                }
            }
        }

        for (let i = 0; i < 24; i++) {
            const currentMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();

            // Income on 15th
            const incomeDate15 = new Date(year, month, 15);
            if (incomeDate15 <= today) {
                transactions.push({
                    id: generateRandomId(),
                    type: 'INCOME',
                    amount: new BigNumber(2500),
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
                    amount: new BigNumber(2500),
                    category: 'Salary',
                    date: incomeDateEOM.toISOString(),
                    isRecurring: true,
                    note: 'Salary payment 2',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            // Calculate target expense based on savings rate
            // Savings = Income - Expenses, so Expenses = Income * (1 - savingsRate)
            const savingsRate = savingsRates[i];
            let targetExpense = Math.floor(monthlyIncome * (1 - savingsRate));

            // Ensure expenses are at least 0
            targetExpense = Math.max(0, targetExpense);

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
                    amount: new BigNumber(expenseAmount),
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

        // 4. Generate Investment Data
        await generateDummyInvestments();

    } catch (error) {
        console.error('Error generating dummy data:', error);
    }
};

const generateDummyInvestments = async () => {
    try {
        const investments: Investment[] = []; // Changed type from any[] to Investment[]

        const STOCKS = [
            { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 150 },
            { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 280 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 2500 },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 3300 },
            { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 700 },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 200 }
        ];

        const today = new Date();
        const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());

        for (const stock of STOCKS) {
            let currentQuantity = 0;
            let currentPrice = stock.basePrice;

            // Generate trades over 3 years
            for (let i = 0; i < 30; i++) { // ~10 trades per year per stock
                const randomDays = Math.floor(Math.random() * (365 * 3));
                const tradeDate = new Date(threeYearsAgo.getTime() + randomDays * 24 * 60 * 60 * 1000);

                if (tradeDate > today) continue;

                // Randomize price movement (-10% to +15%)
                const priceChange = (Math.random() * 0.25) - 0.10;
                currentPrice = currentPrice * (1 + priceChange);

                const isBuy = currentQuantity === 0 || Math.random() > 0.5;

                if (isBuy) {
                    const quantity = Math.floor(Math.random() * 10) + 1;
                    investments.push({
                        id: generateRandomId(),
                        symbol: stock.symbol,
                        type: 'STOCKS',
                        date: tradeDate.toISOString(),
                        action: 'BUY',
                        quantity: new BigNumber(quantity),
                        price: new BigNumber(currentPrice),
                        fees: new BigNumber(5), // Flat fee
                        notes: `Bought ${stock.symbol}`,
                        isRecurring: false,
                        creationMethod: 'MANUAL',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                    currentQuantity += quantity;
                } else if (currentQuantity > 0) {
                    // Sell
                    const quantityToSell = Math.max(1, Math.floor(Math.random() * currentQuantity));
                    investments.push({
                        id: generateRandomId(),
                        symbol: stock.symbol,
                        type: 'STOCKS',
                        date: tradeDate.toISOString(),
                        action: 'SELL',
                        quantity: new BigNumber(quantityToSell),
                        price: new BigNumber(currentPrice),
                        fees: new BigNumber(5),
                        notes: `Sold ${stock.symbol}`,
                        isRecurring: false,
                        creationMethod: 'MANUAL',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                    currentQuantity -= quantityToSell;
                }
            }
        }

        if (investments.length > 0) {
            await bulkSaveInvestments(investments);
        }

    } catch (error) {
        console.error('Error in generateDummyInvestments:', error);
    }
};
