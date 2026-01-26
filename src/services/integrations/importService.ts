import { Transaction, TransactionType } from '@types';
import { EXPENSE_CATEGORY_GROUPS, INCOME_CATEGORY_GROUPS } from '@constants/categories';

// Expected headers in exact order (case-insensitive)
const EXPECTED_HEADERS = ['date', 'category', 'income', 'expense', 'notes'];

export interface ParsedRow {
    rowNumber: number;
    date: string;
    category: string;
    income: string;
    expense: string;
    notes: string;
}

export interface ValidationError {
    rowNumber: number;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    validRows: ParsedRow[];
}

export interface ImportSummary {
    totalTransactions: number;
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
}

/**
 * Get all valid category values from both expense and income groups
 */
const getAllCategoryValues = (): { expense: Set<string>; income: Set<string> } => {
    const expenseCategories = new Set<string>();
    const incomeCategories = new Set<string>();

    EXPENSE_CATEGORY_GROUPS.forEach(group => {
        group.items.forEach(item => {
            expenseCategories.add(item.value.toLowerCase());
        });
    });

    INCOME_CATEGORY_GROUPS.forEach(group => {
        group.items.forEach(item => {
            incomeCategories.add(item.value.toLowerCase());
        });
    });

    return { expense: expenseCategories, income: incomeCategories };
};

/**
 * Parse CSV/TSV content into rows
 */
export const parseCSV = (content: string): { headers: string[]; rows: ParsedRow[] } => {
    // Normalize line endings and split into lines
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    if (lines.length < 2) {
        return { headers: [], rows: [] };
    }

    // Detect delimiter (comma or tab)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    // Parse headers
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());

    // Parse data rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(delimiter).map(v => v.trim());

        rows.push({
            rowNumber: i + 1, // 1-indexed, +1 for header
            date: values[0] || '',
            category: values[1] || '',
            income: values[2] || '',
            expense: values[3] || '',
            notes: values[4] || '',
        });
    }

    return { headers, rows };
};

/**
 * Validate headers match expected format
 */
export const validateHeaders = (headers: string[]): string | null => {
    if (headers.length < 5) {
        return `Invalid headers. Expected: Date, Category, Income, Expense, Notes (in exact order). Found: ${headers.join(', ')}`;
    }

    for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
        if (headers[i] !== EXPECTED_HEADERS[i]) {
            return `Invalid column at position ${i + 1}. Expected "${EXPECTED_HEADERS[i]}", found "${headers[i]}". Columns must be in exact order: Date, Category, Income, Expense, Notes`;
        }
    }

    return null;
};

/**
 * Check if a date is in yyyy-MM-dd format
 */
const isValidDateFormat = (dateStr: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
};

/**
 * Check if a date is in the future
 */
const isFutureDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
};

/**
 * Check if a value is a valid decimal or dash (empty indicator)
 * Supports numbers with thousand separators (commas)
 */
const isValidAmount = (value: string): boolean => {
    if (value === '-' || value === '') return true;
    // Remove thousand separators (commas) before parsing
    const cleanValue = value.replace(/,/g, '');
    const num = parseFloat(cleanValue);
    return !isNaN(num) && num >= 0;
};

/**
 * Parse amount value (dash means 0/empty)
 * Supports numbers with thousand separators (commas)
 */
const parseAmount = (value: string): number => {
    if (value === '-' || value === '') return 0;
    // Remove thousand separators (commas) before parsing
    const cleanValue = value.replace(/,/g, '');
    return parseFloat(cleanValue) || 0;
};

/**
 * Create a unique key for duplicate detection
 */
const createTransactionKey = (date: string, amount: number, category: string, notes: string): string => {
    return `${date}|${amount.toFixed(2)}|${category.toLowerCase()}|${(notes || '').toLowerCase()}`;
};

/**
 * Validate import data rows
 */
export const validateImportData = (
    rows: ParsedRow[],
    existingTransactions: Transaction[]
): ValidationResult => {
    const errors: ValidationError[] = [];
    const validRows: ParsedRow[] = [];
    const categories = getAllCategoryValues();

    // Build set of existing transaction keys for duplicate detection
    const existingKeys = new Set<string>();
    existingTransactions.forEach(txn => {
        const key = createTransactionKey(
            txn.date.split('T')[0], // Just the date part
            txn.amount,
            txn.category,
            txn.note || ''
        );
        existingKeys.add(key);
    });

    // Track keys within this import batch for intra-file duplicates
    const batchKeys = new Set<string>();

    for (const row of rows) {
        const rowErrors: string[] = [];

        // Validate date format
        if (!isValidDateFormat(row.date)) {
            rowErrors.push(`Invalid date format "${row.date}". Use yyyy-MM-dd`);
        } else if (isFutureDate(row.date)) {
            rowErrors.push('Date cannot be in the future');
        }

        // Validate income and expense amounts
        const hasIncome = row.income !== '-' && row.income !== '';
        const hasExpense = row.expense !== '-' && row.expense !== '';

        if (!hasIncome && !hasExpense) {
            rowErrors.push('Each row must have either Income or Expense');
        } else if (hasIncome && hasExpense) {
            rowErrors.push('Each row must have only one of Income or Expense, not both');
        }

        if (hasIncome && !isValidAmount(row.income)) {
            rowErrors.push(`Invalid income amount "${row.income}"`);
        }
        if (hasExpense && !isValidAmount(row.expense)) {
            rowErrors.push(`Invalid expense amount "${row.expense}"`);
        }

        // Validate category
        const categoryLower = row.category.toLowerCase();
        const isExpense = hasExpense;
        const validCategorySet = isExpense ? categories.expense : categories.income;

        if (!validCategorySet.has(categoryLower)) {
            const expectedType = isExpense ? 'expense' : 'income';
            rowErrors.push(`Invalid ${expectedType} category "${row.category}"`);
        }

        // Validate notes length
        if (row.notes && row.notes.length > 50) {
            rowErrors.push(`Notes must be 50 characters or less (found ${row.notes.length})`);
        }

        // Check for duplicates (only if other validations pass)
        if (rowErrors.length === 0) {
            const amount = hasIncome ? parseAmount(row.income) : parseAmount(row.expense);
            const key = createTransactionKey(row.date, amount, row.category, row.notes);

            if (existingKeys.has(key)) {
                rowErrors.push('Duplicate transaction already exists in database');
            } else if (batchKeys.has(key)) {
                rowErrors.push('Duplicate transaction found in this file');
            } else {
                batchKeys.add(key);
            }
        }

        if (rowErrors.length > 0) {
            errors.push({
                rowNumber: row.rowNumber,
                message: rowErrors.join('; ')
            });
        } else {
            validRows.push(row);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        validRows
    };
};

/**
 * Prepare Transaction objects from validated rows
 */
export const prepareTransactions = (rows: ParsedRow[]): Transaction[] => {
    const now = new Date().toISOString();


    return rows.map((row, index) => {
        const hasIncome = row.income !== '-' && row.income !== '';
        const amount = hasIncome ? parseAmount(row.income) : parseAmount(row.expense);
        const type: TransactionType = hasIncome ? 'INCOME' : 'EXPENSE';

        // Find the correct casing for the category
        const categoryLower = row.category.toLowerCase();
        let category = row.category; // Default to as-is

        const categorySet = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;
        for (const group of categorySet) {
            const found = group.items.find(item => item.value.toLowerCase() === categoryLower);
            if (found) {
                category = found.value;
                break;
            }
        }

        return {
            id: `import_${Date.now()}_${index}`,
            type,
            amount,
            category,
            date: new Date(row.date).toISOString(),
            note: row.notes || undefined,
            isRecurring: false,
            creationMethod: 'MANUAL' as const,
            createdAt: now,
            updatedAt: now,
        };
    });
};

/**
 * Calculate import summary from prepared transactions
 */
export const calculateImportSummary = (transactions: Transaction[]): ImportSummary => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(txn => {
        if (txn.type === 'INCOME') {
            totalIncome += txn.amount;
        } else {
            totalExpense += txn.amount;
        }
    });

    return {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense
    };
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string => {
    return errors.map(err => `Row ${err.rowNumber}: ${err.message}`).join('\n');
};
