import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllSavingsGoals } from '@services/domain/savingsGoalService';

interface DataStatus {
    // True only until the very first check (fired on app load) resolves.
    isChecking: boolean;
    hasTransactions: boolean;
    hasInvestments: boolean;
    hasDebts: boolean;
    hasGoals: boolean;
    // True when every domain below is empty - the "brand new user" case.
    isNewUser: boolean;
    refresh: () => Promise<void>;
}

const DataStatusContext = createContext<DataStatus | undefined>(undefined);

// Computed once here instead of separately inside HomeScreen/HistoryScreen/
// InvestmentScreen - each of those was re-deriving its own "is there any data
// yet" flag from a fresh fetch, so screens visited later than the first still
// had to wait on their own copy of the same check before they could decide
// between their loading skeletons and their empty state. Reading it from here
// instead means only the very first screen ever waits on it.
export const DataStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [hasTransactions, setHasTransactions] = useState(false);
    const [hasInvestments, setHasInvestments] = useState(false);
    const [hasDebts, setHasDebts] = useState(false);
    const [hasGoals, setHasGoals] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const [transactions, investments, debts, goals] = await Promise.all([
                getCachedTransactions(),
                getCachedInvestments(),
                getAllDebts(),
                getAllSavingsGoals(),
            ]);
            setHasTransactions(transactions.length > 0);
            setHasInvestments(investments.length > 0);
            setHasDebts(debts.length > 0);
            setHasGoals(goals.length > 0);
        } catch (error) {
            console.error('Failed to check data status:', error);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const isNewUser = !hasTransactions && !hasInvestments && !hasDebts && !hasGoals;

    return (
        <DataStatusContext.Provider value={{ isChecking, hasTransactions, hasInvestments, hasDebts, hasGoals, isNewUser, refresh }}>
            {children}
        </DataStatusContext.Provider>
    );
};

export const useDataStatus = (): DataStatus => {
    const ctx = useContext(DataStatusContext);
    if (!ctx) {
        throw new Error('useDataStatus must be used within a DataStatusProvider');
    }
    return ctx;
};
