import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useDataStatus } from '@context/DataStatusContext';
import { Debt, Investment, RecurrenceRule, SavingsGoal, Transaction, UserProfile } from '@types';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllSavingsGoals } from '@services/domain/savingsGoalService';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { getUserProfile } from '@services/core/storageService';
import { HistoryLookups, buildHistoryLookups } from '@utils/historyFeed';

export interface HistoryData extends HistoryLookups {
    transactions: Transaction[];
    investments: Investment[];
    debts: Debt[];
    goals: SavingsGoal[];
    recurrenceRules: RecurrenceRule[];
    profile: UserProfile | null;
    // True only until the first load finishes; a refresh keeps the rendered list.
    isLoading: boolean;
    reload: () => Promise<void>;
}

// History's and the Ledger tab's data: everything a transaction feed shows, reloaded on focus.
export const useHistoryData = (): HistoryData => {
    const { refresh: refreshDataStatus } = useDataStatus();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasLoaded = useRef(false);

    const reload = useCallback(async () => {
        try {
            if (!hasLoaded.current) setIsLoading(true);
            const [t, inv, d, g, rules, p] = await Promise.all([
                getCachedTransactions(),
                getCachedInvestments(),
                getAllDebts(),
                getAllSavingsGoals(),
                getAllRecurrenceRules(),
                getUserProfile(),
            ]);
            setTransactions(t);
            setInvestments(inv);
            setDebts(d);
            setGoals(g);
            setRecurrenceRules(rules);
            setProfile(p);
        } catch (error) {
            console.error('Error loading history data:', error);
        } finally {
            setIsLoading(false);
            hasLoaded.current = true;
            refreshDataStatus();
        }
    }, [refreshDataStatus]);

    useFocusEffect(useCallback(() => { reload(); }, [reload]));

    const lookups = useMemo(() => buildHistoryLookups(transactions, investments, goals), [transactions, investments, goals]);

    return { transactions, investments, debts, goals, recurrenceRules, profile, isLoading, reload, ...lookups };
};
