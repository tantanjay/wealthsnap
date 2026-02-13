import { TransactionType } from "@types";

// Expense Category Groups with Subcategories
export const EXPENSE_CATEGORY_GROUPS = [
    {
        group: 'Family & Home',
        icon: 'home',
        items: [
            { label: 'Baby Stuff', value: 'Baby Stuff', icon: 'happy' },
            { label: 'Home', value: 'Home', icon: 'home' },
            { label: 'Supplies', value: 'Supplies', icon: 'cube' },
            { label: 'Groceries', value: 'Groceries', icon: 'cart' },
            { label: 'Laundry', value: 'Laundry', icon: 'shirt' },
            { label: 'Water', value: 'Water', icon: 'water' },
            { label: 'Electricity', value: 'Electricity', icon: 'flash' },
        ]
    },
    {
        group: 'Food & Lifestyle',
        icon: 'restaurant',
        items: [
            { label: 'Food', value: 'Food', icon: 'fast-food' },
            { label: 'Food Delivery', value: 'Food Delivery', icon: 'bicycle' },
            { label: 'Self-care', value: 'Self-care', icon: 'sparkles' },
            { label: 'Shopping', value: 'Shopping', icon: 'bag' },
            { label: 'Online Shopping', value: 'Online Shopping', icon: 'logo-amazon' },
            { label: 'Entertainment', value: 'Entertainment', icon: 'film' },
            { label: 'Hobbies', value: 'Hobbies', icon: 'color-palette' },
            { label: 'Events', value: 'Events', icon: 'calendar' },
            { label: 'Travel', value: 'Travel', icon: 'airplane' },
        ]
    },
    {
        group: 'Transport',
        icon: 'car',
        items: [
            { label: 'Car', value: 'Car', icon: 'car-sport' },
            { label: 'Gas', value: 'Gas', icon: 'speedometer' },
            { label: 'Transportation', value: 'Transportation', icon: 'bus' },
            { label: 'Parking', value: 'Parking', icon: 'location' },
        ]
    },
    {
        group: 'Financial & Bills',
        icon: 'card',
        items: [
            { label: 'Rent', value: 'Rent', icon: 'key' },
            { label: 'Bills', value: 'Bills', icon: 'receipt' },
            { label: 'Credit Card', value: 'Credit Card', icon: 'card' },
            { label: 'Insurance', value: 'Insurance', icon: 'shield-checkmark' },
            { label: 'Tax', value: 'Tax', icon: 'briefcase' },
            { label: 'Remittance', value: 'Remittance', icon: 'send' },
            { label: 'Subscriptions', value: 'Subscriptions', icon: 'repeat' },
            { label: 'Debt Principal', value: 'Principal', icon: 'trending-down' },
            { label: 'Interest Expense', value: 'Interest', icon: 'trending-down' },
            { label: 'Bank Fees', value: 'Bank Fees', icon: 'business' },
        ]
    },
    {
        group: 'Communication & Tech',
        icon: 'phone-portrait',
        items: [
            { label: 'Cable', value: 'Cable', icon: 'tv' },
            { label: 'Internet', value: 'Internet', icon: 'wifi' },
            { label: 'Mobile Postpaid', value: 'Mobile Postpaid', icon: 'phone-portrait' },
            { label: 'Mobile Prepaid', value: 'Mobile Prepaid', icon: 'call' },
            { label: 'Tech Gear', value: 'Tech Gear', icon: 'hardware-chip' },
            { label: 'Gaming & Top-ups', value: 'Gaming & Top-ups', icon: 'game-controller' },
        ]
    },
    {
        group: 'Professional & Education',
        icon: 'school',
        items: [
            { label: 'Business Expense', value: 'Business Expense', icon: 'business' },
            { label: 'Courier & Delivery', value: 'Courier & Delivery', icon: 'cube' },
            { label: 'Educational', value: 'Educational', icon: 'school' },
            { label: 'Staff Salary', value: 'Staff Salary', icon: 'people' },
        ]
    },
    {
        group: 'Health',
        icon: 'medkit',
        items: [
            { label: 'Medical', value: 'Medical', icon: 'medkit' },
            { label: 'Pharmacy', value: 'Pharmacy', icon: 'fitness' },
            { label: 'Gym & Fitness', value: 'Gym & Fitness', icon: 'barbell' },
        ]
    },
    {
        group: 'Miscellaneous',
        icon: 'ellipsis-horizontal',
        items: [
            { label: 'Others', value: 'Others', icon: 'ellipsis-horizontal' },
            { label: 'Uncategorized', value: 'Uncategorized', icon: 'help-circle' },
        ]
    },
];

// Income Category Groups with Subcategories
export const INCOME_CATEGORY_GROUPS = [
    {
        group: 'Earnings',
        icon: 'cash',
        items: [
            { label: 'Salary', value: 'Salary', icon: 'cash' },
            { label: 'Extra Income', value: 'Extra Income', icon: 'add-circle' },
            { label: 'Allowance', value: 'Allowance', icon: 'wallet' },
            { label: 'Freelance', value: 'Freelance', icon: 'briefcase' },
            { label: 'Bonus', value: 'Bonus', icon: 'gift' },
        ]
    },
    {
        group: 'Investments & Savings',
        icon: 'trending-up',
        items: [
            { label: 'Stocks/Crypto', value: 'Stocks/Crypto', icon: 'trending-up' },
            { label: 'Cash Savings', value: 'Cash Savings', icon: 'save' },
            { label: 'Dividends', value: 'Dividends', icon: 'analytics' },
            { label: 'Interest', value: 'Interest', icon: 'calculator' },
        ]
    },
    {
        group: 'Support & Benefits',
        icon: 'heart',
        items: [
            { label: 'Government Aid', value: 'Government Aid', icon: 'flag' },
            { label: 'Pension', value: 'Pension', icon: 'time' },
            { label: 'Insurance', value: 'Insurance', icon: 'shield' },
            { label: 'Remittances', value: 'Remittances', icon: 'send' },
        ]
    },
    {
        group: 'Transfers',
        icon: 'swap-horizontal',
        items: [
            { label: 'Fund Transfer', value: 'Fund Transfer', icon: 'swap-horizontal' },
            { label: 'Refund', value: 'Refund', icon: 'return-down-back' },
        ]
    },
    {
        group: 'General',
        icon: 'ellipsis-horizontal',
        items: [
            { label: 'Others', value: 'Others', icon: 'ellipsis-horizontal' },
            { label: 'Uncategorized', value: 'Uncategorized', icon: 'help-circle' },
            { label: 'Gift', value: 'Gift', icon: 'gift' },
        ]
    },
];

// Flat arrays for backward compatibility
export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_GROUPS.flatMap(g => g.items);
export const INCOME_CATEGORIES = INCOME_CATEGORY_GROUPS.flatMap(g => g.items);

// Helper to get category group from value
export const getCategoryGroup = (value: string, type: TransactionType): string => {
    const groups = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;
    for (const group of groups) {
        if (group.items.some(item => item.value === value)) {
            return group.group;
        }
    }
    return 'Uncategorized';
};

export const RECURRENCE_OPTIONS = [
    { label: 'None', value: 'NONE' },
    { label: 'Daily', value: 'DAILY' },
    { label: 'Weekly', value: 'WEEKLY' },
    { label: 'Semi-Monthly', value: 'SEMI_MONTHLY' },
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Quarterly', value: 'QUARTERLY' },
    { label: 'Yearly', value: 'YEARLY' },
];
