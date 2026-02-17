import { BigNumber } from 'bignumber.js';
import { UserProfile, Transaction, TransactionType, Budget, Investment, Asset, DividendHistory, Debt } from '@types';
import { saveCategory } from '@services/domain/categoryService';
import { bulkSaveTransactions } from '@services/domain/transactionService';
import { bulkSaveBudgets } from '@services/domain/budgetService';
import { saveUserProfile, setOnboardingComplete, clearAllData } from '@services/core/storageService';
import { CONFIG } from '@constants/config';
import { EXPENSE_CATEGORY_GROUPS, INCOME_CATEGORY_GROUPS } from '@constants/categories';
import { generateUUID } from '@utils/uuid';
import { saveInvestment } from '@services/domain/investmentService';
import { addPriceHistory } from '@services/domain/priceHistoryService';
import { bulkSaveAssets } from '@services/domain/assetService';
import { bulkSaveDividendHistories } from '@services/domain/dividendHistoryService';
import { saveDebt } from '@services/domain/debtService';

const getRandomAmount = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Stock Data for Realistic Simulation
const STOCKS = [
    { ticker: 'STC1', name: 'Stocks1', basePrice: 150, yield: 0.005, sector: 'Technology', annualDividend: 9.6, dividendGrowth: 0.06, payoutMonths: [1, 4, 7, 10] }, // ~0.5% quarterly
    { ticker: 'STC2', name: 'Stocks2', basePrice: 280, yield: 0.008, sector: 'Technology', annualDividend: 28.8, dividendGrowth: 0.10, payoutMonths: [2, 5, 8, 11] },
    { ticker: 'STC3', name: 'Stocks3', basePrice: 140, yield: 0.025, sector: 'Finance', annualDividend: 7.3, dividendGrowth: 0.05, payoutMonths: [0, 3, 6, 9] },
    { ticker: 'STC4', name: 'Stocks4', basePrice: 160, yield: 0.028, sector: 'Healthcare', annualDividend: 9.4, dividendGrowth: 0.06, payoutMonths: [2, 5, 8, 11] },
    { ticker: 'STC5', name: 'Stocks5', basePrice: 380, yield: 0.015, sector: 'Finance', annualDividend: 15.2, dividendGrowth: 0.04, payoutMonths: [2, 5, 8, 11] },
];

export const generateDummyData = async () => {
    if (!CONFIG.ENABLE_DUMMY_DATA) return;

    try {
        await clearAllData();

        // 1. Create Profile
        const profile: UserProfile = {
            id: generateUUID(),
            name: 'WealthSnap',
            currency: 'USD',
            monthlySalary: new BigNumber(10000), // Updated to 10k
            financialGoals: ['Save $100k', 'Early Retirement', 'Buy a House'],
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveUserProfile(profile);
        await setOnboardingComplete();

        // 2. Create Categories
        const allExpenseCategories = EXPENSE_CATEGORY_GROUPS.flatMap(group =>
            group.items.map(item => ({ ...item, type: 'EXPENSE' as TransactionType }))
        );
        const allIncomeCategories = INCOME_CATEGORY_GROUPS.flatMap(group =>
            group.items.map(item => ({ ...item, type: 'INCOME' as TransactionType }))
        );

        const allCategories = [...allExpenseCategories, ...allIncomeCategories];

        for (const cat of allCategories) {
            await saveCategory({
                id: generateUUID(),
                name: cat.value,
                type: cat.type,
                icon: cat.icon,
                isDefault: true,
            });
        }

        // 2.5 Create Budgets
        const budgets: Budget[] = [
            { category: 'Rent', amount: new BigNumber(2500) },
            { category: 'Groceries', amount: new BigNumber(1000) },
            { category: 'Food', amount: new BigNumber(1200) },
            { category: 'Transportation', amount: new BigNumber(400) },
            { category: 'Electricity', amount: new BigNumber(250) },
            { category: 'Water', amount: new BigNumber(100) },
            { category: 'Internet', amount: new BigNumber(70) },
            { category: 'Home', amount: new BigNumber(200) },
            { category: 'Shopping', amount: new BigNumber(500) },
            { category: 'Tech Gear', amount: new BigNumber(300) },
            { category: 'Entertainment', amount: new BigNumber(200) },
        ];

        await bulkSaveBudgets(budgets);

        // 2.6 Create Assets
        const stockAssets: Asset[] = STOCKS.map(stock => ({
            symbol: stock.ticker,
            name: stock.name || undefined,
            exchange: undefined,
            sector: stock.sector || undefined,
            type: 'STOCKS',
            currency: 'USD',
            description: undefined
        }));

        await bulkSaveAssets(stockAssets);

        // 2.7 Create dividend history
        const dividends: DividendHistory[] = [];

        for (const stock of STOCKS) {
            const today = new Date();
            const start = new Date();
            start.setFullYear(today.getFullYear() - 3);

            let date = new Date(start);

            while (date < today) {
                const month = date.getMonth();

                if (stock.payoutMonths.includes(month)) {
                    const yearsBack =
                        (today.getTime() - date.getTime()) /
                        (1000 * 60 * 60 * 24 * 365);

                    // Dividend per share grows forward in time
                    const adjustedAnnualDividend =
                        stock.annualDividend * Math.pow(1 + stock.dividendGrowth, -yearsBack);

                    let quarterlyDividend = adjustedAnnualDividend / 4;

                    const noise = 1 + (Math.random() * 0.1 - 0.05); // ±5%
                    quarterlyDividend *= noise;

                    // Clamp minimums (no absurd payouts)
                    quarterlyDividend = Math.max(quarterlyDividend, 0.01);

                    dividends.push({
                        id: generateUUID(),
                        symbol: stock.ticker,
                        exDate: date.toISOString(),
                        recordDate: date.toISOString(),
                        paymentDate: date.toISOString(),
                        amount: new BigNumber(quarterlyDividend),
                        type: 'CASH',
                        status: 'PAID',
                        source: 'MANUAL',
                        createdAt: date.toISOString(),
                        updatedAt: date.toISOString()
                    });
                }

                date.setMonth(date.getMonth() + 1);
            }
        }


        await bulkSaveDividendHistories(dividends);

        // 3. Chronological Simulation (3 years)
        const today = new Date();
        const yearsOfData = 3;
        const totalDays = yearsOfData * 365;

        // Initial Transfer In (3 years ago)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - totalDays);

        let allTransactions: Transaction[] = [];

        // State Tracking for Investments
        let currentBankBalance = new BigNumber(0);
        let portfolio: Record<string, number> = {}; // Ticker -> Shares

        // Month tracking
        let monthlyIncome = new BigNumber(0);
        let monthlyExpense = new BigNumber(0);
        let lastMonth = -1;

        // Investment Counters
        let stockIndex = 0;
        let pendingInvestmentAmount = new BigNumber(0); // If valid month, set this
        let investmentDate = -1; // 1-5 determined at start of month
        let hasInvestedThisMonth = false;

        // Loan Tracking
        let activeCarLoan: Debt | null = null;
        let carLoanBalance = new BigNumber(0);
        let carLoanMonthlyPayment = new BigNumber(0);
        let loanPaymentDate = -1;
        let hasPaidLoanThisMonth = false;

        const addTransaction = (txn: Transaction) => {
            allTransactions.push(txn);

            // Track Savings variables
            if (txn.type === 'INCOME' || txn.type === 'TRANSFER_IN' || txn.type === 'DIVIDEND' as TransactionType || txn.type === 'CAPITAL_GAIN' as TransactionType) {
                if (txn.type === 'INCOME' || txn.type === 'DIVIDEND' as TransactionType) {
                    monthlyIncome = monthlyIncome.plus(txn.amount);
                }
                currentBankBalance = currentBankBalance.plus(txn.amount);
            } else if (txn.type === 'EXPENSE' || txn.type === 'TRANSFER_OUT' || txn.type === 'CAPITAL_LOSS' as TransactionType) {
                monthlyExpense = monthlyExpense.plus(txn.amount);
                currentBankBalance = currentBankBalance.minus(txn.amount);
            }
        };

        // Initial Capital
        addTransaction({
            id: generateUUID(),
            type: 'TRANSFER_IN',
            amount: new BigNumber(100000),
            category: 'Fund Transfer',
            date: startDate.toISOString(),
            isRecurring: false,
            note: 'Initial Capital',
            createdAt: startDate.toISOString(),
            updatedAt: startDate.toISOString(),
        });

        for (let i = 0; i <= totalDays; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);

            // Stop if future
            if (currentDate > today) break;

            const dayOfMonth = currentDate.getDate();
            const dayOfWeek = currentDate.getDay();
            const month = currentDate.getMonth();
            const isSummer = month >= 5 && month <= 7;
            const isWinter = month === 11 || month <= 1;

            // Month Change Logic (Start of new month)
            if (month !== lastMonth) {
                // Determine Investment for THIS new month based on LAST month performance
                if (lastMonth !== -1) { // Year 1+ (Month 2+)
                    const savings = monthlyIncome.minus(monthlyExpense);
                    const targetInvestment = savings.times(0.8);

                    if (targetInvestment.isGreaterThan(3500)) {
                        pendingInvestmentAmount = targetInvestment;
                    } else {
                        pendingInvestmentAmount = new BigNumber(3500);
                    }
                    investmentDate = Math.floor(Math.random() * 5) + 1; // 1st to 5th
                    hasInvestedThisMonth = false;
                } else {
                    pendingInvestmentAmount = new BigNumber(0);
                    hasInvestedThisMonth = false;
                }

                // Reset Loan Payment Tracking
                loanPaymentDate = Math.floor(Math.random() * (25 - 20 + 1)) + 20; // 20th to 25th
                hasPaidLoanThisMonth = false;

                // Reset Monthly stats for new month accumulation
                monthlyIncome = new BigNumber(0);
                monthlyExpense = new BigNumber(0);
                lastMonth = month;
            }

            // --- INVESTMENT EXECUTION (Day 1-5) ---
            if (pendingInvestmentAmount.isGreaterThan(0) && !hasInvestedThisMonth && dayOfMonth === investmentDate) {
                const stock = STOCKS[stockIndex % STOCKS.length];
                stockIndex++; // Rotate

                // Price Logic: Base + Growth Trend + Noise + Monthly Sentiment
                const priceNoise = 1 + (Math.random() * 0.4 - 0.2); // +/- 20%
                const annualGrowthRate = 1.05; // 5% per year
                const yearspassed = i / 365;
                const growthFactor = Math.pow(annualGrowthRate, yearspassed);

                // Sentiment: Alternate positive and negative months to reduce "overboard" green
                const isPositiveMonth = month % 2 === 0;
                const monthlySentiment = isPositiveMonth ? 1.05 : 0.85; // +5% or -15% swing

                const currentPrice = stock.basePrice * growthFactor * priceNoise * monthlySentiment;

                const shares = Math.floor(pendingInvestmentAmount.toNumber() / currentPrice);

                if (shares > 0) {
                    const totalCost = new BigNumber(shares * currentPrice);
                    const fee = totalCost.times(0.001);

                    const newInvestment: Investment = {
                        id: generateUUID(),
                        symbol: stock.ticker.toUpperCase(),
                        type: 'STOCKS',
                        action: 'BUY',
                        quantity: new BigNumber(shares),
                        price: new BigNumber(currentPrice),
                        currency: 'USD',
                        exchangeRate: new BigNumber(1),
                        fees: new BigNumber(fee),
                        date: currentDate.toISOString(),
                        isRecurring: false,
                        creationMethod: 'MANUAL',
                        createdAt: currentDate.toISOString(),
                        updatedAt: currentDate.toISOString(),
                    };

                    await saveInvestment(newInvestment);

                    await addPriceHistory(
                        newInvestment.symbol,
                        newInvestment.price,
                        {
                            timestamp: newInvestment.date,
                            source: 'MANUAL',
                            currency: newInvestment.currency,
                            exchangeRate: newInvestment.exchangeRate,
                        }
                    );

                    addTransaction({
                        id: generateUUID(),
                        type: 'TRANSFER_OUT',
                        amount: totalCost.plus(fee),
                        category: 'Investments',
                        date: currentDate.toISOString(),
                        transferAccount: 'INVESTMENTS',
                        isRecurring: false,
                        note: `Buy ${shares} shares of ${stock.ticker} @ $${currentPrice.toFixed(2)}`,
                        createdAt: currentDate.toISOString(),
                        updatedAt: currentDate.toISOString(),
                        investmentId: newInvestment.id,
                    });

                    // Update Portfolio
                    portfolio[stock.ticker] = (portfolio[stock.ticker] || 0) + shares;
                    hasInvestedThisMonth = true;
                }
            }

            // --- CAR LOAN CREATION (Start of Year 3 - approx day 730) ---
            if (i === 730) {
                // Create Debt
                const principal = new BigNumber(70000);
                const rate = 0.05; // 5%
                const termMonths = 60; // 5 years

                // PMT Formula: P * r * (1+r)^n / ((1+r)^n - 1)
                // Monthly Rate
                const monthlyRate = rate / 12;
                const factor = Math.pow(1 + monthlyRate, termMonths);
                const pmt = principal.times(monthlyRate).times(factor).div(factor - 1);

                const newDebt: Debt = {
                    id: generateUUID(),
                    name: 'Car Loan',
                    type: 'LOAN',
                    direction: 'PAYABLE',
                    initialAmount: principal,
                    currency: 'USD',
                    interestRate: new BigNumber(5),
                    interestType: 'FIXED',
                    minPayment: pmt,
                    startDate: currentDate.toISOString(),
                    termMonths: termMonths,
                    status: 'ACTIVE',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString()
                };
                await saveDebt(newDebt);

                activeCarLoan = newDebt;
                carLoanBalance = principal;
                carLoanMonthlyPayment = pmt;

                // Pay Fees
                addTransaction({
                    id: generateUUID(),
                    date: currentDate.toISOString(),
                    amount: new BigNumber(350),
                    type: 'EXPENSE',
                    category: 'Fees',
                    subCategory: 'INITIAL_TRANSACTION',
                    transferAccount: 'LOAN',
                    note: 'Processing fees for Car Loan',
                    creationMethod: 'MANUAL',
                    isRecurring: false,
                    debtId: newDebt.id,
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            // --- LOAN PAYMENT EXECUTION (20-25th) ---
            if (activeCarLoan && !hasPaidLoanThisMonth && dayOfMonth === loanPaymentDate) {
                // Calculate Interest: Balance * (Rate / 12)
                const annualRate = activeCarLoan.interestRate.toNumber() / 100;
                const monthlyRate = annualRate / 12;
                const interestPayment = carLoanBalance.times(monthlyRate);
                let principalPayment = carLoanMonthlyPayment.minus(interestPayment);

                // Helper for last payment
                if (carLoanBalance.lte(carLoanMonthlyPayment)) {
                    principalPayment = carLoanBalance;
                }

                // 1. Principal (Transfer Out)
                const principalTx: Transaction = {
                    id: generateUUID(),
                    type: 'TRANSFER_OUT',
                    amount: principalPayment,
                    category: 'Loans',
                    subCategory: 'PRINCIPAL',
                    date: currentDate.toISOString(),
                    note: `Debt Payment: Car Loan`,
                    transferAccount: 'LOAN',
                    isRecurring: false,
                    debtId: activeCarLoan.id,
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString()
                };
                addTransaction(principalTx);

                // 2. Interest (Expense)
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: interestPayment,
                    category: 'Interest',
                    subCategory: 'INTEREST',
                    date: currentDate.toISOString(),
                    transferAccount: 'LOAN',
                    note: `Interest Payment: Car Loan`,
                    isRecurring: false,
                    debtId: activeCarLoan.id,
                    linkedTransactionId: principalTx.id,
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString()
                });

                // Update Balance
                carLoanBalance = carLoanBalance.minus(principalPayment);
                if (carLoanBalance.lte(0)) {
                    activeCarLoan = null; // Paid off
                }

                hasPaidLoanThisMonth = true;
            }

            // --- DIVIDEND EXECUTION (Day 15 of Quarterly Months) ---
            if (dayOfMonth === 15 && (month === 2 || month === 5 || month === 8 || month === 11)) {
                Object.keys(portfolio).forEach(ticker => {
                    const shares = portfolio[ticker];
                    const stock = STOCKS.find(s => s.ticker === ticker);
                    if (stock && shares > 0) {
                        const yearspassed = i / 365;
                        const growthFactor = Math.pow(1.05, yearspassed); // Dividend growth simpler (5%)

                        const dividendPerShare = (stock.basePrice * growthFactor * stock.yield) / 4;
                        const totalDividend = new BigNumber(shares * dividendPerShare);

                        if (totalDividend.isGreaterThan(1)) {
                            addTransaction({
                                id: generateUUID(),
                                type: 'INCOME',
                                amount: totalDividend,
                                category: 'Dividends',
                                date: currentDate.toISOString(),
                                isRecurring: false,
                                note: `${ticker} Dividend (${shares} shares)`,
                                createdAt: currentDate.toISOString(),
                                updatedAt: currentDate.toISOString(),
                            });
                        }
                    }
                });
            }


            // --- STANDARD TRANSACTIONS ---

            // 1. Salary: 1st and 15th (5k each)
            if (dayOfMonth === 1 || dayOfMonth === 15) {
                addTransaction({
                    id: generateUUID(),
                    type: 'INCOME',
                    amount: new BigNumber(5000),
                    category: 'Salary',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Salary Payment',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            // 2. Fixed Monthly Bills
            if (dayOfMonth === 6) { // Rent
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(2500),
                    category: 'Rent',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Monthly Rent',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            if (dayOfMonth === 12) { // Internet & Utilities
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(70),
                    category: 'Internet',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Monthly Internet',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });

                // Electricity (Seasonal)
                let electricityBill = getRandomAmount(80, 120);
                if (isSummer) electricityBill += getRandomAmount(50, 100);
                if (isWinter) electricityBill += getRandomAmount(30, 60);
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(electricityBill),
                    category: 'Electricity',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Electricity Bill',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });

                // Water (Seasonal)
                let waterBill = getRandomAmount(30, 50);
                if (isSummer) waterBill += getRandomAmount(15, 30);
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(waterBill),
                    category: 'Water',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Water Bill',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });

                // Gas
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(getRandomAmount(30, 60)),
                    category: 'Home',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Household Gas',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            // Side Hustle on 20th
            if (dayOfMonth === 20) {
                addTransaction({
                    id: generateUUID(),
                    type: 'INCOME',
                    amount: new BigNumber(getRandomAmount(300, 2000)),
                    category: 'Freelance',
                    date: currentDate.toISOString(),
                    isRecurring: false,
                    note: 'Freelance Work',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            // Weekly Logic
            if (dayOfWeek === 6) { // Groceries
                addTransaction({
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: new BigNumber(getRandomAmount(150, 300)),
                    category: 'Groceries',
                    date: currentDate.toISOString(),
                    isRecurring: true,
                    note: 'Weekly Groceries',
                    createdAt: currentDate.toISOString(),
                    updatedAt: currentDate.toISOString(),
                });
            }

            // Uber (1-3x week)
            if (Math.random() < 0.25) {
                const cost = new BigNumber(getRandomAmount(15, 25));
                addTransaction({
                    id: generateUUID(), type: 'EXPENSE', amount: cost, category: 'Transportation', date: currentDate.toISOString(), isRecurring: false, note: 'Uber', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString(),
                });
                addTransaction({
                    id: generateUUID(), type: 'EXPENSE', amount: cost, category: 'Transportation', date: currentDate.toISOString(), isRecurring: false, note: 'Uber (Return)', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString(),
                });
            }

            // Dining Out (1x week)
            if (Math.random() < 0.14) {
                addTransaction({
                    id: generateUUID(), type: 'EXPENSE', amount: new BigNumber(getRandomAmount(100, 200)), category: 'Food', date: currentDate.toISOString(), isRecurring: false, note: 'Dining Out', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString(),
                });
            }

            // Daily (Coffee, Lunch, Snacks)
            for (let k = 1; k <= 3; k++) {
                if (Math.random() > 0.5) {
                    addTransaction({ id: generateUUID(), type: 'EXPENSE', amount: new BigNumber(getRandomAmount(4, 9)), category: 'Food', date: currentDate.toISOString(), isRecurring: false, note: 'Morning Coffee', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString() });
                }
                if (Math.random() > 0.5) { // Lunch
                    addTransaction({ id: generateUUID(), type: 'EXPENSE', amount: new BigNumber(getRandomAmount(15, 30)), category: 'Food', date: currentDate.toISOString(), isRecurring: false, note: 'Lunch', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString() });
                }
                if (Math.random() > 0.5) { // Snack
                    addTransaction({ id: generateUUID(), type: 'EXPENSE', amount: new BigNumber(getRandomAmount(2, 10)), category: 'Food', date: currentDate.toISOString(), isRecurring: false, note: 'Snack', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString() });
                }
            }

            // Quarterly Big Purchase (Mar, Jun, Sep, Dec on 10th)
            if ((month === 2 || month === 5 || month === 8 || month === 11) && dayOfMonth === 10) {
                const cost = new BigNumber(getRandomAmount(1500, 2500));
                const isTech = Math.random() > 0.5;
                addTransaction({
                    id: generateUUID(), type: 'EXPENSE', amount: cost, category: isTech ? 'Tech Gear' : 'Home', date: currentDate.toISOString(), isRecurring: false, note: isTech ? 'New Phone' : 'Appliance Upgrade', createdAt: currentDate.toISOString(), updatedAt: currentDate.toISOString(),
                });
            }
        }

        // Use Bulk Save
        await bulkSaveTransactions(allTransactions);

        console.log('Dummy data generation complete');

    } catch (error) {
        console.error('Error generating dummy data:', error);
    }
};
