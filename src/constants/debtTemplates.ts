import { DebtType, DebtInterestType } from '@types';

export interface DebtTemplate {
    label: string;
    type: DebtType;
    interestType: DebtInterestType;
    interestRate: string; // String to pre-fill TextInput
    termMonths?: string;
    notes?: string;
}

export const GLOBAL_TEMPLATES: DebtTemplate[] = [
    { label: 'Credit Card', type: 'CREDIT_CARD', interestType: 'FIXED', interestRate: '36', notes: 'Standard ~3% monthly' },
    { label: 'Personal Loan', type: 'LOAN', interestType: 'FIXED', interestRate: '12' },
];

export const CURRENCY_TEMPLATES: Record<string, DebtTemplate[]> = {
    'PHP': [
        // SSS Salary Loan: 10% p.a. diminishing (Effective is roughly nearly flat 10% for estimation or 10% diminishing)
        { label: 'SSS Salary Loan', type: 'LOAN', interestType: 'FIXED', interestRate: '10', termMonths: '24', notes: 'Based on 2026 rates (10% p.a.)' },
        // Pag-IBIG MPL: ~10.5% p.a.
        { label: 'Pag-IBIG MPL', type: 'LOAN', interestType: 'FIXED', interestRate: '10.5', termMonths: '24', notes: 'Multi-Purpose Loan (2026 est.)' },
        // Pag-IBIG Housing: Variable, 3-year fixing usually ~6.25-6.5%
        { label: 'Pag-IBIG Housing', type: 'MORTGAGE', interestType: 'VARIABLE', interestRate: '6.5', termMonths: '360', notes: '3-Year Fixing Rate (2026 est.)' },
        // Car Loan: Standard bank rates ~9-11% p.a.
        { label: 'Car Loan', type: 'LOAN', interestType: 'FIXED', interestRate: '9.5', termMonths: '60', notes: 'Standard Auto Loan rate' },
        // Home Loan (Bank): ~7-8%
        { label: 'Bank Home Loan', type: 'MORTGAGE', interestType: 'VARIABLE', interestRate: '7.5', termMonths: '240' },
    ],
    'USD': [
        { label: 'Mortgage (30yr Fixed)', type: 'MORTGAGE', interestType: 'FIXED', interestRate: '6.8', termMonths: '360', notes: '2026 Forecast' },
        { label: 'Auto Loan', type: 'LOAN', interestType: 'FIXED', interestRate: '7.5', termMonths: '60' },
        { label: 'Student Loan', type: 'LOAN', interestType: 'FIXED', interestRate: '5.5', termMonths: '120' },
    ]
};

export const getTemplatesForCurrency = (currency: string): DebtTemplate[] => {
    const specific = CURRENCY_TEMPLATES[currency] || [];
    return [...specific, ...GLOBAL_TEMPLATES];
};
