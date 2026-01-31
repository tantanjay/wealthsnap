import { BigNumber } from 'bignumber.js';
import { UserProfile, Transaction, TransactionType, Investment } from '@types';
import { saveCategory, saveTransaction } from '@services/domain';
import { bulkSaveInvestments } from '@services/domain/investmentService';
import { saveUserProfile, setOnboardingComplete, clearAllData } from '@services/core/storageService';
import { calculatePortfolioMetrics } from '@utils/investmentMetrics';
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
            monthlySalary: new BigNumber(8500),
            financialGoals: ['Save $100k', 'Early Retirement', 'Buy a House'],
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

        // 3. Simulation Constants
        const today = new Date();
        const monthlySalary = 8500;
        const semiMonthlySalary = monthlySalary / 2;
        const STOCKS = [
            { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 150, trend: 0.005 }, // +0.5% bias
            { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 280, trend: 0.003 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 2500, trend: 0.002 },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 3300, trend: 0.004 },
            { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 700, trend: -0.01 }, // -1% bias (Loss scenario)
            { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 200, trend: 0.008 }
        ];

        // State for simulation
        const transactions: Transaction[] = [];
        const investments: Investment[] = [];
        const symbolHoldings: Record<string, Investment[]> = {};
        const stockPrices: Record<string, number> = {};

        // Initialize stock prices
        STOCKS.forEach(s => stockPrices[s.symbol] = s.basePrice);

        // 4. Chronological Simulation (36 months)
        for (let i = 35; i >= 0; i--) {
            const currentMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const eomDate = new Date(year, month + 1, 0).getDate();

            // Stock price volatility for this month
            STOCKS.forEach(stock => {
                // Volatility: Random shift (-4% to +6%) + stock's inherent trend
                const volatility = (Math.random() * 0.1) - 0.04 + (stock.trend || 0);
                stockPrices[stock.symbol] *= (1 + volatility);
            });

            // --- INCOME AND INVESTMENT EVENTS ---
            // Income dates: 15th and Last Day
            const payDates = [15, eomDate];

            for (const day of payDates) {
                const payDate = new Date(year, month, day);
                if (payDate > today) continue;

                // 1. Receive Salary
                const incomeId = generateRandomId();
                transactions.push({
                    id: incomeId,
                    type: 'INCOME',
                    amount: new BigNumber(semiMonthlySalary),
                    category: 'Salary',
                    date: payDate.toISOString(),
                    isRecurring: true,
                    note: `Salary Payment (${day === 15 ? 'Mid' : 'End'} Month)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                // 2. Decide to Invest (80% chance for each paycheck)
                if (Math.random() < 0.8) {
                    let investAmount = semiMonthlySalary * (0.1 + Math.random() * 0.2); // 10-30% of paycheck
                    const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
                    const currentPrice = stockPrices[stock.symbol];

                    // Ensure whole number allocation
                    let quantity = Math.floor(investAmount / currentPrice);
                    if (quantity < 1) quantity = 1; // Ensure at least 1 share if possible, or skip?

                    // Recalculate exact investment amount based on whole shares
                    investAmount = quantity * currentPrice;

                    const fees = 5.00;

                    const invId = generateRandomId();
                    const investment: Investment = {
                        id: invId,
                        symbol: stock.symbol,
                        type: 'STOCKS',
                        date: payDate.toISOString(),
                        action: 'BUY',
                        quantity: new BigNumber(quantity),
                        price: new BigNumber(currentPrice),
                        fees: new BigNumber(fees),
                        notes: `Automated investment from salary deduction`,
                        isRecurring: false,
                        creationMethod: 'MANUAL',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    investments.push(investment);
                    if (!symbolHoldings[stock.symbol]) symbolHoldings[stock.symbol] = [];
                    symbolHoldings[stock.symbol].push(investment);

                    // Add linked transaction for the "Deduction" (Transfer to Broker)
                    transactions.push({
                        id: generateRandomId(),
                        type: 'TRANSFER_OUT',
                        amount: new BigNumber(investAmount + fees),
                        category: 'Investment',
                        date: payDate.toISOString(),
                        note: `Invested in ${stock.symbol}`,
                        isRecurring: false,
                        transferAccount: 'INVESTMENTS',
                        investmentId: invId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            }

            // --- RANDOM SELL EVENTS ---
            // 20% chance per month to sell some stocks
            if (Math.random() < 0.2) {
                const ownedSymbols = Object.keys(symbolHoldings).filter(s => {
                    const metrics = calculatePortfolioMetrics(symbolHoldings[s]);
                    return metrics.currentQuantity.isGreaterThan(0);
                });

                if (ownedSymbols.length > 0) {
                    const symbolToSell = ownedSymbols[Math.floor(Math.random() * ownedSymbols.length)];
                    const currentPrice = stockPrices[symbolToSell];
                    const holdings = symbolHoldings[symbolToSell];
                    const metricsBefore = calculatePortfolioMetrics(holdings);

                    // Sell a whole number of shares
                    let qtyToSell = Math.floor(metricsBefore.currentQuantity.toNumber() * (0.3 + Math.random() * 0.7)); // Sell 30-100%
                    if (qtyToSell < 1) qtyToSell = 1;
                    if (qtyToSell > metricsBefore.currentQuantity.toNumber()) qtyToSell = metricsBefore.currentQuantity.toNumber();

                    const fees = 5.00;
                    const sellDate = new Date(year, month, getRandomAmount(1, eomDate));

                    if (sellDate <= today) {
                        const invId = generateRandomId();
                        const sellInvestment: Investment = {
                            id: invId,
                            symbol: symbolToSell,
                            type: 'STOCKS',
                            date: sellDate.toISOString(),
                            action: 'SELL',
                            quantity: new BigNumber(qtyToSell),
                            price: new BigNumber(currentPrice),
                            fees: new BigNumber(fees),
                            notes: `Profit taking / Rebalancing`,
                            isRecurring: false,
                            creationMethod: 'MANUAL',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        };

                        investments.push(sellInvestment);
                        holdings.push(sellInvestment);

                        // Calculate realized P/L for this specific sell
                        // P/L = (SellPrice * Qty) - Fees - (AvgPrice * Qty)
                        const proceeds = sellInvestment.price.times(sellInvestment.quantity).minus(sellInvestment.fees || 0);
                        const costBasisOfSoldShares = metricsBefore.averagePrice.times(sellInvestment.quantity);
                        const realizedPL = proceeds.minus(costBasisOfSoldShares);

                        // 1. Transaction: Cash inflow from sale
                        transactions.push({
                            id: generateRandomId(),
                            type: 'TRANSFER_IN',
                            amount: proceeds,
                            category: 'Investment',
                            date: sellDate.toISOString(),
                            note: `Sold ${symbolToSell} - Proceeds`,
                            isRecurring: false,
                            transferAccount: 'INVESTMENTS',
                            investmentId: invId,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        });

                        // 2. Transaction: Capital Gain/Loss
                        transactions.push({
                            id: generateRandomId(),
                            type: realizedPL.isGreaterThanOrEqualTo(0) ? 'CAPITAL_GAIN' : 'CAPITAL_LOSS',
                            amount: realizedPL.abs(),
                            category: 'Investment',
                            date: sellDate.toISOString(),
                            note: `Realized ${realizedPL.isGreaterThanOrEqualTo(0) ? 'Gain' : 'Loss'} from ${symbolToSell}`,
                            isRecurring: false,
                            investmentId: invId,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        });
                    }
                }
            }

            // --- EXPENSES ---
            // Target monthly savings rate (after investments): 20-40%
            // So monthly expenses = (Salary - monthlyInvestments) * (1 - savingsRate)
            const targetExpense = monthlySalary * (0.4 + Math.random() * 0.3);
            let currentExpense = 0;

            while (currentExpense < targetExpense) {
                const remaining = targetExpense - currentExpense;
                if (remaining <= 20) break;

                const maxExpense = Math.max(20, Math.min(remaining, 1200));
                const expenseAmount = getRandomAmount(20, maxExpense);
                const randomDay = getRandomAmount(1, eomDate);
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
                    note: `Monthly ${randomCategory.name} payment`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                currentExpense += expenseAmount;
            }
        }

        // 5. Save everything
        for (const t of transactions) {
            await saveTransaction(t);
        }

        if (investments.length > 0) {
            await bulkSaveInvestments(investments);
        }

    } catch (error) {
        console.error('Error generating dummy data:', error);
    }
};


