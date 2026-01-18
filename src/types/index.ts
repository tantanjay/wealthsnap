export interface UserProfile {
    id: string;
    name: string;
    currency: string;
    monthlySalary?: number;
    financialGoals?: string[]; // stored as JSON string or array
    isOnboardingComplete: boolean;
    createdAt: string;
    updatedAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    subCategory?: string;
    date: string; // ISO string
    note?: string;
    isRecurring: boolean;
    recurrenceId?: string; // Link to recurrence rule
    createdAt: string;
    updatedAt: string;
}

export interface Investment {
    id: string;
    symbol: string; // e.g., AAPL, BTC
    name: string;
    type: 'STOCK' | 'CRYPTO' | 'ETF' | 'OTHER';
    quantity: number;
    averageBuyPrice: number;
    currentPrice?: number;
    lastUpdated?: string;
    notes?: string;
}

export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    icon?: string;
    color?: string;
    isDefault?: boolean;
}

export interface RecurrenceRule {
    id: string;
    frequency: RecurrenceFrequency;
    nextDueDate: string;
    transactionTemplate: Omit<Transaction, 'id' | 'date' | 'createdAt' | 'updatedAt' | 'isRecurring'>;
    isActive: boolean;
}

export interface GeminiConfig {
    apiKey?: string;
    modelId?: string;
}
