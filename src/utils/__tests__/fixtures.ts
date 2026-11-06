import { BigNumber } from 'bignumber.js';
import { Debt, Investment, SavingsGoal, Transaction } from '@types';

// Builders for metric tests. Dates are local wall-clock times, stored as UTC ISO like the app does,
// so a test means the same calendar day in every time zone the suite runs in.

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;
const STAMP = '2026-01-01T00:00:00.000Z';

export const at = (y: number, m: number, d: number, h = 12): Date => new Date(y, m - 1, d, h);
export const iso = (y: number, m: number, d: number, h = 12): string => at(y, m, d, h).toISOString();

type TxInput = Partial<Omit<Transaction, 'amount'>> & Pick<Transaction, 'type' | 'date'> & { amount: number };

export const tx = ({ amount, ...rest }: TxInput): Transaction => ({
    id: nextId('tx'),
    category: 'Other',
    isRecurring: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...rest,
    amount: new BigNumber(amount),
});

export const expense = (amount: number, date: string, extra: Partial<Omit<Transaction, 'amount'>> = {}) =>
    tx({ type: 'EXPENSE', amount, date, category: 'Groceries', ...extra });
export const income = (amount: number, date: string, extra: Partial<Omit<Transaction, 'amount'>> = {}) =>
    tx({ type: 'INCOME', amount, date, category: 'Salary', ...extra });

type DebtInput = Partial<Omit<Debt, 'initialAmount' | 'interestRate' | 'minPayment'>> & {
    initialAmount: number; interestRate?: number; minPayment?: number;
};

export const debt = ({ initialAmount, interestRate = 0, minPayment = 0, ...rest }: DebtInput): Debt => ({
    id: nextId('debt'),
    name: 'Debt',
    type: 'LOAN',
    direction: 'PAYABLE',
    currency: 'PHP',
    interestType: interestRate > 0 ? 'FIXED' : 'NONE',
    status: 'ACTIVE',
    startDate: STAMP,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...rest,
    initialAmount: new BigNumber(initialAmount),
    interestRate: new BigNumber(interestRate),
    minPayment: new BigNumber(minPayment),
});

type GoalInput = Partial<Omit<SavingsGoal, 'targetAmount' | 'recurringAmount'>> & {
    targetAmount: number; recurringAmount?: number;
};

export const goal = ({ targetAmount, recurringAmount, ...rest }: GoalInput): SavingsGoal => ({
    id: nextId('goal'),
    name: 'Goal',
    category: 'Travel',
    isPaused: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...(recurringAmount !== undefined && { frequency: 'MONTHLY' as const }),
    ...rest,
    targetAmount: new BigNumber(targetAmount),
    recurringAmount: recurringAmount === undefined ? undefined : new BigNumber(recurringAmount),
});

export const trade = (action: 'BUY' | 'SELL', quantity: number, price: number, date: string, symbol = 'ABC'): Investment => ({
    id: nextId('inv'),
    symbol,
    type: 'STOCKS',
    date,
    action,
    quantity: new BigNumber(quantity),
    price: new BigNumber(price),
    isRecurring: false,
    createdAt: date,
    updatedAt: date,
});

// No price history: Net Worth falls back to each symbol's latest trade price.
export const noPrices = () => undefined;
