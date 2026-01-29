import { BigNumber } from 'bignumber.js';

export interface UserProfile {
    id: string;
    name: string;
    currency: string;
    monthlySalary?: BigNumber;
    financialGoals?: string[]; // stored as JSON string or array
    isOnboardingComplete: boolean;
    createdAt: string;
    updatedAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type InvestmentType = 'STOCKS' | 'FUNDS' | 'BONDS' | 'CRYPTO' | 'COMMODITIES';
export type DebtType = 'LOAN' | 'CREDIT_CARD' | 'MORTGAGE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: BigNumber;
    category: string;
    subCategory?: string;
    date: string; // ISO string
    note?: string;
    isRecurring: boolean;
    recurrenceId?: string; // Link to recurrence rule
    creationMethod?: 'MANUAL' | 'RECURRENCE' | 'AI';
    transferDest?: 'OTHER_ACCOUNT' | 'INVESTMENTS' | 'DEBT';
    transferRelatedId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionReceipt {
    transactionId: string;
    receiptData: string;
    createdAt: string;
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
    name?: string; // Label/name for the recurring transaction
    frequency: RecurrenceFrequency;
    startDate?: string;
    endDate?: string;
    nextDueDate: string;
    transactionTemplate: Omit<Transaction, 'id' | 'date' | 'createdAt' | 'updatedAt' | 'isRecurring'>;
    isActive: boolean;
}

export interface Budget {
    category: string;
    amount: BigNumber;
}

export interface AIConfig {
    apiKey?: string;
    modelId?: string;
}

export interface AIUsageLog {
    id: string;
    timestamp: string;
    endpoint: string;
    provider: 'gemini' | 'openai' | 'other';
    model: string;
    status: 'success' | 'error';
    inputTokens: number;
    outputTokens: number;
    imageCount: number;
    durationMs: number;
    costUSD: BigNumber;
}

export interface ReceiptItem {
    description: string;
    quantity: number;
    unitPrice: BigNumber;
    amount: BigNumber;
    category?: string; // Suggested category
}

export interface ReceiptAnalysisResult {
    isValidReceipt: boolean;
    receiptType?: string;
    merchantName?: string;
    date?: string;
    totalAmount?: BigNumber;
    totalDiscount?: BigNumber;
    currency?: string;
    items?: ReceiptItem[];
    confidence: number; // 0-100
    validationError?: string; // Reason why it's not a receipt
}
export type ReminderFrequency = 'DAILY' | 'WEEKLY' | 'SEMI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type ReminderAction = 'SNOOZED' | 'COMPLETED' | 'DISMISSED';

export interface Reminder {
    id: string;
    title: string; // Encrypted in DB
    frequency: ReminderFrequency;
    startDate: string; // ISO string, determines anchor day
    times: string[]; // 24h format HH:mm
    isActive: boolean;
    lastTriggered?: string; // ISO string
    createdAt: string;
    updatedAt: string;
}

export interface ReminderLog {
    id: string;
    reminderId: string;
    action: ReminderAction;
    timestamp: string; // ISO string
}
