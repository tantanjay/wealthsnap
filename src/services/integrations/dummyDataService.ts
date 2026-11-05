import { BigNumber } from 'bignumber.js';
import {
    UserProfile, Transaction, TransactionType, Budget, Investment, Asset, DividendHistory, Debt,
    SavingsGoal, RecurrenceRule,
} from '@types';
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
import { bulkSaveSavingsGoals } from '@services/domain/savingsGoalService';
import { bulkSaveRecurrenceRules } from '@services/domain/recurrenceService';

// --- Random helpers ---

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p: number) => Math.random() < p;
const cents = (n: number) => new BigNumber(n.toFixed(2));
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

// Standard normal sample (Box-Muller).
const gaussian = () => {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const pickWeighted = <T extends { weight: number }>(items: T[]): T => {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const it of items) {
        r -= it.weight;
        if (r <= 0) return it;
    }
    return items[items.length - 1];
};

const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

// --- Stocks ---

// startPrice ≈ three years ago, endPrice ≈ today; the path between them is random.
const STOCKS = [
    { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSEARCA', sector: 'Index Fund', startPrice: 402, endPrice: 618, volatility: 0.04, annualDividend: 6.8, dividendGrowth: 0.05, payoutMonths: [2, 5, 8, 11], payDay: 27, weight: 4 },
    { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', startPrice: 189, endPrice: 268, volatility: 0.075, annualDividend: 1.04, dividendGrowth: 0.04, payoutMonths: [1, 4, 7, 10], payDay: 14, weight: 2 },
    { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', startPrice: 369, endPrice: 512, volatility: 0.065, annualDividend: 3.64, dividendGrowth: 0.10, payoutMonths: [2, 5, 8, 11], payDay: 12, weight: 2 },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financials', startPrice: 152, endPrice: 298, volatility: 0.065, annualDividend: 5.6, dividendGrowth: 0.12, payoutMonths: [0, 3, 6, 9], payDay: 28, weight: 1.5 },
    { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare', startPrice: 154, endPrice: 192, volatility: 0.045, annualDividend: 5.2, dividendGrowth: 0.05, payoutMonths: [2, 5, 8, 11], payDay: 9, weight: 1 },
    { ticker: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', sector: 'Consumer Staples', startPrice: 58, endPrice: 70, volatility: 0.04, annualDividend: 2.04, dividendGrowth: 0.05, payoutMonths: [3, 6, 9, 11], payDay: 1, weight: 1 },
];
type StockSpec = typeof STOCKS[number];

// Brownian bridge on log price: monthly wiggles that still land on endPrice.
const buildPricePath = (stock: StockSpec, months: number): number[] => {
    const walk = [0];
    for (let m = 1; m <= months; m++) walk.push(walk[m - 1] + gaussian() * stock.volatility);
    const a = Math.log(stock.startPrice);
    const b = Math.log(stock.endPrice);
    return walk.map((w, m) => Math.exp(a + (b - a) * (m / months) + w - walk[months] * (m / months)));
};

const dividendPerShare = (stock: StockSpec, date: Date, today: Date) => {
    const yearsBack = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return (stock.annualDividend * Math.pow(1 + stock.dividendGrowth, -yearsBack)) / 4;
};

// --- Savings goals ---

interface GoalSpec {
    id: string;
    recurrenceId?: string;
    name: string;
    target: number;
    category: string;
    notes?: string;
    startIdx: number; // month index (from simulation start) the goal was created
    initial: number;
    monthly?: number; // undefined = manual top-ups only
    day?: number;
    pausedIdx?: number; // auto-contribution stops from this month on
    createdAt?: string;
    reachedAt?: string;
    balance: number;
}

export const generateDummyData = async () => {
    if (!CONFIG.ENABLE_DUMMY_DATA) return;

    try {
        await clearAllData();

        const today = new Date();
        const startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 3);
        const totalMonths = monthsBetween(startDate, today);

        // Salary per paycheck, with a raise each year in a random month.
        const basePaycheck = 4450;
        const raises = [randInt(9, 14), randInt(21, 26)].map(idx => ({ idx, factor: rand(1.03, 1.08) }));
        const paycheckAt = (monthIdx: number) =>
            raises.reduce((p, r) => (monthIdx >= r.idx ? p * r.factor : p), basePaycheck);
        const finalPaycheck = Math.round(paycheckAt(totalMonths) / 10) * 10;

        // 1. Profile
        const profile: UserProfile = {
            id: generateUUID(),
            name: 'WealthSnap',
            currency: 'USD',
            monthlySalary: new BigNumber(finalPaycheck * 2),
            financialGoals: ['Save $100k', 'Early Retirement', 'Buy a House'],
            isOnboardingComplete: true,
            createdAt: startDate.toISOString(),
            updatedAt: today.toISOString(),
        };
        await saveUserProfile(profile);
        await setOnboardingComplete();

        // 2. Categories
        const allCategories = [
            ...EXPENSE_CATEGORY_GROUPS.flatMap(g => g.items.map(item => ({ ...item, type: 'EXPENSE' as TransactionType }))),
            ...INCOME_CATEGORY_GROUPS.flatMap(g => g.items.map(item => ({ ...item, type: 'INCOME' as TransactionType }))),
        ];
        for (const cat of allCategories) {
            await saveCategory({ id: generateUUID(), name: cat.value, type: cat.type, icon: cat.icon, isDefault: true });
        }

        // 3. Budgets
        const budgets: Budget[] = [
            { category: 'Rent', amount: new BigNumber(2550) },
            { category: 'Groceries', amount: new BigNumber(850) },
            { category: 'Food', amount: new BigNumber(900) },
            { category: 'Food Delivery', amount: new BigNumber(150) },
            { category: 'Transportation', amount: new BigNumber(250) },
            { category: 'Gas', amount: new BigNumber(220) },
            { category: 'Electricity', amount: new BigNumber(180) },
            { category: 'Water', amount: new BigNumber(80) },
            { category: 'Internet', amount: new BigNumber(70) },
            { category: 'Subscriptions', amount: new BigNumber(40) },
            { category: 'Home', amount: new BigNumber(250) },
            { category: 'Shopping', amount: new BigNumber(350) },
            { category: 'Online Shopping', amount: new BigNumber(200) },
            { category: 'Entertainment', amount: new BigNumber(180) },
            { category: 'Travel', amount: new BigNumber(500) },
        ];
        await bulkSaveBudgets(budgets);

        // 4. Assets, price paths, dividend history
        const stockAssets: Asset[] = STOCKS.map(s => ({
            symbol: s.ticker,
            name: s.name,
            exchange: s.exchange,
            sector: s.sector,
            type: 'STOCKS',
            currency: 'USD',
            description: undefined,
        }));
        await bulkSaveAssets(stockAssets);

        const pricePaths: Record<string, number[]> = {};
        for (const stock of STOCKS) {
            pricePaths[stock.ticker] = buildPricePath(stock, totalMonths);
            for (let m = 0; m <= totalMonths; m++) {
                const d = m === totalMonths ? today : new Date(startDate.getFullYear(), startDate.getMonth() + m, 1, 16);
                await addPriceHistory(stock.ticker, cents(pricePaths[stock.ticker][m]), {
                    timestamp: d.toISOString(),
                    source: 'MANUAL',
                    currency: 'USD',
                    exchangeRate: 1,
                });
            }
        }

        const dividends: DividendHistory[] = [];
        for (const stock of STOCKS) {
            for (let m = 0; m <= totalMonths; m++) {
                const pay = new Date(startDate.getFullYear(), startDate.getMonth() + m, stock.payDay, 9);
                if (pay < startDate || pay > today || !stock.payoutMonths.includes(pay.getMonth())) continue;
                const ex = new Date(pay);
                ex.setDate(ex.getDate() - randInt(12, 18));
                dividends.push({
                    id: generateUUID(),
                    symbol: stock.ticker,
                    exDate: ex.toISOString(),
                    recordDate: ex.toISOString(),
                    paymentDate: pay.toISOString(),
                    amount: new BigNumber(dividendPerShare(stock, pay, today).toFixed(4)),
                    type: 'CASH',
                    status: 'PAID',
                    source: 'MANUAL',
                    createdAt: ex.toISOString(),
                    updatedAt: ex.toISOString(),
                });
            }
        }
        await bulkSaveDividendHistories(dividends);

        // 5. Savings goals
        const goals: GoalSpec[] = [
            { id: generateUUID(), recurrenceId: generateUUID(), name: 'Emergency Fund', target: 30000, category: 'Others', notes: 'Six months of essential expenses', startIdx: 0, initial: 5000, monthly: 600, day: 2, balance: 0 },
            { id: generateUUID(), recurrenceId: generateUUID(), name: 'House Down Payment', target: 80000, category: 'Home', notes: '20% down on a ~$400k place', startIdx: totalMonths - 26, initial: 15000, monthly: 1200, day: 16, balance: 0 },
            { id: generateUUID(), recurrenceId: generateUUID(), name: 'Japan Trip', target: 8000, category: 'Travel', notes: 'Two weeks in spring', startIdx: totalMonths - 14, initial: 500, monthly: 350, day: 15, balance: 0 },
            { id: generateUUID(), recurrenceId: generateUUID(), name: 'Kitchen Renovation', target: 15000, category: 'Home', startIdx: totalMonths - 18, initial: 1000, monthly: 300, day: 20, pausedIdx: totalMonths - 6, balance: 0 },
            { id: generateUUID(), name: 'New MacBook Pro', target: 2800, category: 'Tech Gear', startIdx: totalMonths - 10, initial: 400, balance: 0 },
        ];
        const emergencyWithdrawalIdx = randInt(14, 22);
        let laptopTopUpDay = -1;

        // 6. Trips: one or two a year, never in the current month
        const tripMonths = new Set<number>();
        for (let y = 0; y < 3; y++) {
            tripMonths.add(randInt(y * 12 + 1, y * 12 + 11));
            if (chance(0.5)) tripMonths.add(randInt(y * 12 + 1, y * 12 + 11));
        }
        tripMonths.delete(totalMonths);

        // 7. Day-by-day simulation
        const allTransactions: Transaction[] = [];
        let cash = 0;
        let monthIncome = 0;
        let monthSpend = 0;
        let lastMonthSurplus = 0;
        const portfolio: Record<string, number> = {};

        const addTransaction = (t: Transaction) => {
            allTransactions.push(t);
            const amt = t.amount.toNumber();
            if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') cash += amt;
            else cash -= amt;
            if (t.type === 'INCOME') monthIncome += amt;
            if (t.type === 'EXPENSE') monthSpend += amt;
        };

        // Random time of day on `day`, never later than now.
        const at = (day: Date, fromHour = 7, toHour = 22) => {
            const d = new Date(day);
            d.setHours(randInt(fromHour, toHour), randInt(0, 59), randInt(0, 59), 0);
            return d > today ? new Date(today.getTime() - randInt(1, 30) * 60000) : d;
        };

        const tx = (date: Date, type: TransactionType, category: string, amount: number | BigNumber, note?: string, extra: Partial<Transaction> = {}) => {
            const iso = date.toISOString();
            addTransaction({
                id: generateUUID(),
                type,
                amount: BigNumber.isBigNumber(amount) ? amount : cents(amount),
                category,
                date: iso,
                isRecurring: false,
                note,
                creationMethod: 'MANUAL',
                createdAt: iso,
                updatedAt: iso,
                ...extra,
            });
        };
        const expense = (date: Date, category: string, amount: number, note?: string, extra?: Partial<Transaction>) =>
            tx(date, 'EXPENSE', category, amount, note, extra);

        tx(at(startDate, 9, 11), 'TRANSFER_IN', 'Fund Transfer', 100000, 'Initial Capital');

        // Car purchase & loan
        const carLoanDay = randInt(640, 760);
        let activeCarLoan: Debt | null = null;
        let carLoanBalance = new BigNumber(0);
        let carLoanPayment = new BigNumber(0);

        // Per-month plan
        let lastMonth = -1;
        let monthIdx = -1;
        let mood = 1;
        let rentDay = 1;
        let loanPayDay = 22;
        let investDay = -1;
        let investBudget = 0;
        let events = new Map<number, { category: string; amount: number; note: string }[]>();
        let freelance = new Map<number, number>();
        let tripStart = -1;
        let tripEnd = -1;
        let nextGroceryDay = randInt(1, 6);
        let nextGasDay = -1;

        const schedule = (day: number, category: string, amount: number, note: string) => {
            if (!events.has(day)) events.set(day, []);
            events.get(day)!.push({ category, amount, note });
        };

        for (let i = 0; ; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            day.setHours(0, 0, 0, 0);
            if (day > today) break;

            const dom = day.getDate();
            const dow = day.getDay();
            const month = day.getMonth();
            const dim = daysInMonth(day);
            const isWeekend = dow === 0 || dow === 6;
            const hasCar = activeCarLoan !== null || i > carLoanDay;

            // --- New month: roll a fresh, irregular plan ---
            if (month !== lastMonth) {
                if (lastMonth !== -1) lastMonthSurplus = monthIncome - monthSpend;
                monthIncome = 0;
                monthSpend = 0;
                lastMonth = month;
                monthIdx++;

                // Discretionary spending mood: some months frugal, some loose
                mood = Math.min(1.7, Math.max(0.6, Math.exp(gaussian() * 0.25)));
                rentDay = randInt(1, 4);
                loanPayDay = randInt(18, 25);
                events = new Map();
                freelance = new Map();
                tripStart = -1;
                tripEnd = -1;

                // Freelance is lumpy: many months nothing, some months several gigs
                const gigs = pick([0, 0, 0, 1, 1, 1, 2, 3]);
                for (let g = 0; g < gigs; g++) {
                    const d = randInt(3, dim);
                    freelance.set(d, (freelance.get(d) || 0) + Math.round(rand(250, 2400) / 25) * 25);
                }

                // Investing: skip some months, otherwise a share of last month's surplus
                investDay = -1;
                if (monthIdx > 0 && !chance(0.22)) {
                    const base = Math.max(lastMonthSurplus, 0) * rand(0.35, 0.95);
                    investBudget = Math.min(Math.max(base, rand(600, 1500)), 7000, Math.max(cash - 15000, 0));
                    if (investBudget >= 300) investDay = randInt(2, 9);
                }

                // Life events
                if (chance(0.10)) schedule(randInt(1, dim), 'Medical', rand(120, 1650), pick(['Dentist', 'Urgent care visit', 'Specialist consult', 'Lab tests']));
                if (chance(0.25)) schedule(randInt(1, dim), 'Pharmacy', rand(15, 90), 'Pharmacy');
                if (hasCar && chance(0.12)) schedule(randInt(1, dim), 'Car', rand(180, 1400), pick(['Car service', 'New tires', 'Brake repair', 'Car wash & detailing']));
                if (chance(0.07)) schedule(randInt(1, dim), 'Events', rand(180, 750), pick(['Wedding gift', 'Friend\'s birthday dinner', 'Baby shower']));
                if (chance(0.06)) schedule(randInt(1, dim), pick(['Electronics', 'Gadgets & Devices']), rand(220, 1600), pick(['Noise-cancelling headphones', 'Monitor', 'Smartwatch', 'Tablet']));
                if (chance(0.07)) schedule(randInt(1, dim), 'Home', rand(150, 1400), pick(['Sofa', 'Desk chair', 'Bed frame', 'Vacuum', 'Plants & pots']));
                if (chance(0.35 * mood)) schedule(randInt(1, dim), 'Shopping', rand(45, 340), pick(['Clothes', 'Shoes', 'Jacket', 'Uniqlo']));
                if (chance(0.3)) schedule(randInt(1, dim), 'Self-care', rand(35, 150), pick(['Haircut', 'Massage', 'Skincare']));
                if (chance(0.25)) schedule(randInt(1, dim), 'Hobbies', rand(25, 260), pick(['Climbing gym day pass', 'Books', 'Camera gear', 'Art supplies']));
                const nEntertainment = randInt(0, 3);
                for (let k = 0; k < nEntertainment; k++) schedule(randInt(1, dim), 'Entertainment', rand(14, 180), pick(['Movies', 'Concert tickets', 'Bowling', 'Museum']));
                const nOnline = Math.round(rand(0, 4) * mood);
                for (let k = 0; k < nOnline; k++) schedule(randInt(1, dim), 'Online Shopping', rand(12, 160), 'Amazon order');

                // Seasonal
                if (month === 1) schedule(14, 'Food', rand(110, 260), 'Valentine\'s dinner');
                if (month === 10) {
                    const bf = randInt(24, 29);
                    schedule(bf, 'Online Shopping', rand(220, 950), 'Black Friday deals');
                }
                if (month === 11) {
                    const nGifts = randInt(3, 7);
                    for (let k = 0; k < nGifts; k++) schedule(randInt(4, 23), 'Shopping', rand(35, 320), 'Christmas gift');
                    schedule(randInt(18, 30), 'Food', rand(140, 420), 'Holiday dinner');
                }
                if (month === 2) schedule(randInt(1, 20), 'Insurance', rand(1350, 1550), 'Annual health insurance');
                if (month === 3) schedule(randInt(10, 15), 'Tax', rand(600, 3300), 'Tax payment');
                if (month === 7 && chance(0.6)) schedule(randInt(10, 25), 'Educational', rand(150, 700), 'Online course');

                // Trip month
                if (tripMonths.has(monthIdx)) {
                    tripStart = randInt(5, dim - 10);
                    tripEnd = tripStart + randInt(4, 9);
                    schedule(Math.max(1, tripStart - randInt(4, 12)), 'Travel', rand(380, 1350), 'Flights');
                    schedule(tripStart, 'Travel', rand(120, 260) * (tripEnd - tripStart), 'Hotel');
                }
            }

            // --- Income ---
            if (dom === 1 || dom === 15) {
                tx(at(day, 6, 9), 'INCOME', 'Salary', Math.round(paycheckAt(monthIdx)), 'Salary', { isRecurring: true });
            }
            if (freelance.has(dom)) tx(at(day, 10, 20), 'INCOME', 'Freelance', freelance.get(dom)!, pick(['Website build', 'Logo design', 'Consulting', 'App bug fixes', 'Landing page']));
            if (month === 11 && dom === 19) tx(at(day, 9, 12), 'INCOME', 'Bonus', Math.round(paycheckAt(monthIdx) * rand(1.2, 2.6)), 'Year-end bonus');
            if (month === 5 && dom === 28 && chance(0.5)) tx(at(day, 9, 12), 'INCOME', 'Bonus', Math.round(paycheckAt(monthIdx) * rand(0.3, 0.7)), 'Mid-year performance bonus');
            if (month === 4 && dom === 8 && chance(0.6)) tx(at(day, 9, 18), 'INCOME', 'Refund', rand(180, 1400), 'Tax refund');
            if (chance(0.015)) tx(at(day), 'INCOME', 'Extra Income', rand(40, 400), pick(['Sold old bike', 'Marketplace sale', 'Survey payout']));

            // --- Dividends ---
            for (const stock of STOCKS) {
                const shares = portfolio[stock.ticker] || 0;
                if (shares > 0 && dom === Math.min(stock.payDay, dim) && stock.payoutMonths.includes(month)) {
                    const amount = shares * dividendPerShare(stock, day, today);
                    if (amount >= 0.5) tx(at(day, 6, 10), 'INCOME', 'Dividends', amount, `${stock.ticker} dividend (${shares} shares)`);
                }
            }

            // --- Investing ---
            if (dom === investDay) {
                const stock = pickWeighted(STOCKS);
                const price = pricePaths[stock.ticker][monthIdx] * (1 + gaussian() * 0.015);
                const shares = Math.floor(investBudget / price);
                if (shares > 0) {
                    const when = at(day, 9, 15);
                    const cost = new BigNumber((shares * price).toFixed(2));
                    const fee = new BigNumber(chance(0.5) ? 0 : 1.5);
                    const inv: Investment = {
                        id: generateUUID(),
                        symbol: stock.ticker,
                        type: 'STOCKS',
                        action: 'BUY',
                        quantity: new BigNumber(shares),
                        price: cents(price),
                        currency: 'USD',
                        exchangeRate: new BigNumber(1),
                        fees: fee,
                        date: when.toISOString(),
                        isRecurring: false,
                        creationMethod: 'MANUAL',
                        createdAt: when.toISOString(),
                        updatedAt: when.toISOString(),
                    };
                    await saveInvestment(inv);
                    await addPriceHistory(inv.symbol, inv.price, { timestamp: inv.date, source: 'MANUAL', currency: 'USD', exchangeRate: 1 });
                    tx(when, 'TRANSFER_OUT', 'Investments', cost.plus(fee), `Buy ${shares} ${stock.ticker} @ $${price.toFixed(2)}`, {
                        transferAccount: 'INVESTMENTS',
                        investmentId: inv.id,
                    });
                    portfolio[stock.ticker] = (portfolio[stock.ticker] || 0) + shares;
                }
            }

            // --- Car purchase & loan ---
            if (i === carLoanDay) {
                const principal = new BigNumber(36000);
                const rate = 6.4;
                const termMonths = 60;
                const r = rate / 100 / 12;
                const factor = Math.pow(1 + r, termMonths);
                carLoanPayment = new BigNumber(principal.times(r).times(factor).div(factor - 1).toFixed(2));
                const when = at(day, 10, 16);
                const debt: Debt = {
                    id: generateUUID(),
                    name: 'Car Loan',
                    type: 'LOAN',
                    direction: 'PAYABLE',
                    initialAmount: principal,
                    currency: 'USD',
                    interestRate: new BigNumber(rate),
                    interestType: 'FIXED',
                    minPayment: carLoanPayment,
                    startDate: when.toISOString(),
                    termMonths,
                    status: 'ACTIVE',
                    createdAt: when.toISOString(),
                    updatedAt: when.toISOString(),
                };
                await saveDebt(debt);
                activeCarLoan = debt;
                carLoanBalance = principal;
                expense(when, 'Car', 6500, 'Car down payment');
                expense(when, 'Fees', 425, 'Car loan processing fee', { subCategory: 'INITIAL_TRANSACTION', transferAccount: 'LOAN', debtId: debt.id });
                expense(when, 'Car', rand(900, 1300), 'Registration & first insurance');
                nextGasDay = i + randInt(3, 7);
            }

            if (activeCarLoan && dom === loanPayDay && i > carLoanDay + 20) {
                const interest = new BigNumber(carLoanBalance.times(activeCarLoan.interestRate.toNumber() / 100 / 12).toFixed(2));
                let principalPart = carLoanPayment.minus(interest);
                if (carLoanBalance.lte(principalPart)) principalPart = carLoanBalance;
                const when = at(day, 8, 12);
                const principalId = generateUUID();
                tx(when, 'TRANSFER_OUT', 'Loans', principalPart, 'Debt Payment: Car Loan', {
                    id: principalId, subCategory: 'PRINCIPAL', transferAccount: 'LOAN', debtId: activeCarLoan.id,
                });
                expense(when, 'Interest', interest.toNumber(), 'Interest Payment: Car Loan', {
                    subCategory: 'INTEREST', transferAccount: 'LOAN', debtId: activeCarLoan.id, linkedTransactionId: principalId,
                });
                carLoanBalance = carLoanBalance.minus(principalPart);
                if (carLoanBalance.lte(0)) activeCarLoan = null;
            }

            // --- Savings goals ---
            for (const g of goals) {
                if (monthIdx < g.startIdx) continue;
                if (monthIdx === g.startIdx && !g.createdAt && dom >= 3) {
                    const when = at(day, 19, 22);
                    g.createdAt = when.toISOString();
                    g.balance += g.initial;
                    tx(when, 'TRANSFER_OUT', g.category, g.initial, undefined, {
                        subCategory: 'INITIAL_FUNDING', transferAccount: 'SAVINGS_GOAL', savingsGoalId: g.id,
                    });
                    continue;
                }
                if (!g.createdAt) continue;

                const paused = g.pausedIdx !== undefined && monthIdx >= g.pausedIdx;
                if (g.monthly && g.day === dom && !paused) {
                    const when = at(day, 6, 8);
                    g.balance += g.monthly;
                    tx(when, 'TRANSFER_OUT', g.category, g.monthly, undefined, {
                        subCategory: 'CONTRIBUTION', transferAccount: 'SAVINGS_GOAL', savingsGoalId: g.id,
                        recurrenceId: g.recurrenceId, isRecurring: true, creationMethod: 'RECURRENCE',
                    });
                }

                // Manual goal: irregular top-ups until it's funded
                if (!g.monthly && g.balance < g.target) {
                    if (dom === 1) laptopTopUpDay = chance(0.7) ? randInt(2, dim) : -1;
                    if (dom === laptopTopUpDay) {
                        const amount = Math.min(Math.round(rand(150, 550) / 10) * 10, g.target - g.balance);
                        g.balance += amount;
                        tx(at(day, 18, 22), 'TRANSFER_OUT', g.category, amount, undefined, {
                            subCategory: 'CONTRIBUTION', transferAccount: 'SAVINGS_GOAL', savingsGoalId: g.id,
                        });
                    }
                }

                if (!g.reachedAt && g.balance >= g.target) g.reachedAt = at(day, 21, 22).toISOString();
            }

            if (monthIdx === emergencyWithdrawalIdx && dom === 11) {
                const g = goals[0];
                const when = at(day, 12, 18);
                expense(when, 'Medical', 1480, 'Emergency dental work');
                g.balance -= 1480;
                tx(when, 'TRANSFER_IN', g.category, 1480, 'Covered dental work', {
                    subCategory: 'WITHDRAWAL', transferAccount: 'SAVINGS_GOAL', savingsGoalId: g.id,
                });
            }

            // --- Fixed bills ---
            if (dom === rentDay) expense(at(day, 8, 11), 'Rent', monthIdx < 17 ? 2400 : 2550, 'Monthly rent', { isRecurring: true });
            if (dom === 1) expense(at(day, 5, 7), 'Gym & Fitness', 49, 'Gym membership', { isRecurring: true });
            if (dom === 3) expense(at(day, 3, 5), 'Subscriptions', 15.49, 'Netflix', { isRecurring: true });
            if (dom === 18) expense(at(day, 3, 5), 'Subscriptions', 11.99, 'Spotify', { isRecurring: true });
            if (dom === 22) expense(at(day, 3, 5), 'Subscriptions', 2.99, 'iCloud+', { isRecurring: true });
            if (dom === 12) expense(at(day, 9, 12), 'Internet', 69.99, 'Fiber internet', { isRecurring: true });
            if (dom === 17) expense(at(day, 9, 12), 'Mobile Postpaid', 45 + (chance(0.15) ? rand(8, 40) : 0), 'Phone plan', { isRecurring: true });
            if (dom === 14) {
                const summer = month >= 5 && month <= 8;
                const winter = month === 11 || month <= 1;
                expense(at(day, 9, 17), 'Electricity', rand(70, 105) + (summer ? rand(45, 120) : 0) + (winter ? rand(20, 70) : 0), 'Electric bill', { isRecurring: true });
                expense(at(day, 9, 17), 'Water', rand(28, 46) + (summer ? rand(10, 30) : 0), 'Water bill', { isRecurring: true });
            }

            // --- Scheduled one-offs ---
            for (const e of events.get(dom) || []) expense(at(day, 9, 21), e.category, e.amount, e.note);

            // --- Day-to-day ---
            const onTrip = dom >= tripStart && dom < tripEnd && tripStart > 0;
            if (onTrip) {
                expense(at(day, 8, 10), 'Food', rand(18, 45), 'Breakfast');
                expense(at(day, 18, 22), 'Food', rand(40, 140), 'Dinner');
                if (chance(0.6)) expense(at(day, 11, 17), 'Travel', rand(20, 190), pick(['Museum tickets', 'Day tour', 'Train pass', 'Souvenirs']));
                continue;
            }

            if (i >= nextGroceryDay) {
                expense(at(day, 10, 19), 'Groceries', rand(70, 240) * (isWeekend ? 1.15 : 1), pick(['Trader Joe\'s', 'Whole Foods', 'Costco', 'Groceries']));
                nextGroceryDay = i + randInt(4, 9);
            }

            const quietDay = chance(0.2);
            if (!quietDay) {
                if (chance(isWeekend ? 0.3 : 0.55)) expense(at(day, 7, 10), 'Food', rand(3.75, 7.25), 'Coffee');
                if (!isWeekend && chance(0.6)) expense(at(day, 11, 14), 'Food', rand(11, 24), 'Lunch');
                if (chance(0.25)) expense(at(day, 14, 21), 'Food', rand(2, 9), 'Snack');
                if (chance((isWeekend ? 0.35 : 0.08) * mood)) expense(at(day, 18, 22), 'Food', rand(35, 165), 'Dinner out');
                if (chance(0.1 * mood)) expense(at(day, 18, 22), 'Food Delivery', rand(18, 58), pick(['DoorDash', 'Uber Eats']));
            }

            if (hasCar) {
                if (nextGasDay > 0 && i >= nextGasDay) {
                    expense(at(day, 7, 20), 'Gas', rand(38, 74), 'Gas');
                    nextGasDay = i + randInt(7, 14);
                }
                if (chance(0.08)) expense(at(day, 9, 20), 'Parking', rand(6, 24), 'Parking');
                if (chance(0.04)) expense(at(day, 18, 23), 'Transportation', rand(12, 35), 'Uber');
            } else if (chance(isWeekend ? 0.2 : 0.3)) {
                expense(at(day, 7, 23), 'Transportation', rand(9, 34), pick(['Uber', 'Lyft', 'Metro card reload']));
            }
        }

        await bulkSaveTransactions(allTransactions);

        // 8. Persist goals and their auto-contribution rules
        const nextDue = (dayOfMonth: number) => {
            const d = new Date(today.getFullYear(), today.getMonth(), dayOfMonth, 9);
            if (d <= today) d.setMonth(d.getMonth() + 1);
            return d.toISOString();
        };

        const savingsGoals: SavingsGoal[] = [];
        const rules: RecurrenceRule[] = [];
        for (const g of goals) {
            if (!g.createdAt) continue;
            const isPaused = g.pausedIdx !== undefined;
            savingsGoals.push({
                id: g.id,
                name: g.name,
                targetAmount: new BigNumber(g.target),
                recurringAmount: g.monthly ? new BigNumber(g.monthly) : undefined,
                frequency: g.monthly ? 'MONTHLY' : undefined,
                category: g.category,
                isPaused,
                recurrenceId: g.recurrenceId,
                currency: 'USD',
                notes: g.notes,
                goalReachedNotifiedAt: g.reachedAt,
                createdAt: g.createdAt,
                updatedAt: g.createdAt,
            });
            if (g.monthly && g.recurrenceId && g.day) {
                rules.push({
                    id: g.recurrenceId,
                    name: `Savings Goal: ${g.name}`,
                    frequency: 'MONTHLY',
                    startDate: g.createdAt,
                    nextDueDate: nextDue(g.day),
                    transactionTemplate: {
                        type: 'TRANSFER_OUT',
                        amount: new BigNumber(g.monthly),
                        category: g.category,
                        subCategory: 'CONTRIBUTION',
                        transferAccount: 'SAVINGS_GOAL',
                        savingsGoalId: g.id,
                    },
                    isActive: !isPaused,
                    createdAt: g.createdAt,
                    updatedAt: g.createdAt,
                });
            }
        }
        await bulkSaveRecurrenceRules(rules);
        await bulkSaveSavingsGoals(savingsGoals);

        console.log('Dummy data generation complete');
    } catch (error) {
        console.error('Error generating dummy data:', error);
    }
};
