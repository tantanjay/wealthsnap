import { getCachedTransactions } from '@services/domain/transactionService';
import { getPortfolioStats, getPortfolioHoldings, getAllInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllBudgets } from '@services/domain/budgetService';
import { getAllMonthlySummaries, syncMonthlySummaries, MonthlySummaryRow } from '@services/domain/monthlySummaryService';
import { getUserProfile } from '@services/core/storageService';
import { buildFinancialSnapshotData, renderFinancialSnapshotText } from '@utils/financialSnapshotBuilder';
import {
    buildMonthlySummaryData,
    renderMonthlySummaryText,
    getEarliestYearMonth,
    getMonthsBetween
} from '@utils/monthlySummaryBuilder';
import { estimateTokens } from '@services/integrations/geminiService';
import { Transaction, Investment, Debt, Budget } from '@types';

export type ChatHistoryRange = '1Y' | '2Y' | '3Y' | '5Y' | 'ALL';

export const RANGE_OPTIONS: { value: ChatHistoryRange; label: string }[] = [
    { value: '1Y', label: '1 Year' },
    { value: '2Y', label: '2 Years' },
    { value: '3Y', label: '3 Years' },
    { value: '5Y', label: '5 Years' },
    { value: 'ALL', label: 'ALL' }
];

const RANGE_YEARS: Record<ChatHistoryRange, number | null> = {
    '1Y': 1,
    '2Y': 2,
    '3Y': 3,
    '5Y': 5,
    'ALL': null
};

export interface ChatContext {
    contextText: string;
    estimatedTokens: number;
}

export interface ChatContextInputs {
    snapshotText: string;
    summaries: MonthlySummaryRow[];
    // Whether the user has any debt records at all (any status) - used to conditionally
    // surface a debt-behavior suggested prompt, since the snapshot's debt list is empty
    // for the majority of users who don't use this feature.
    hasDebts: boolean;
}

const yearMonthCutoff = (years: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Distinct transaction categories present in the user's data, for the
 * "exclude sensitive categories" step shown before assembling chat context.
 */
export const getAvailableCategories = async (): Promise<string[]> => {
    const transactions = await getCachedTransactions();
    const categories = new Set(transactions.map(t => t.category).filter(Boolean));
    return Array.from(categories).sort();
};

/**
 * Re-derives monthly summaries with excluded categories stripped from
 * category-level detail only. Bypasses the DB-cached `monthly_summary` table
 * (which has no notion of exclusions) - but critically, still runs on the
 * FULL, unfiltered transaction set, so income/expense/cash-flow totals stay
 * accurate. Only `buildMonthlySummaryData`'s own `excludeCategories` param
 * hides the category breakdown, never the underlying data.
 */
const buildFilteredMonthlySummaries = (
    transactions: Transaction[],
    investments: Investment[],
    debts: Debt[],
    budgets: Budget[],
    excludeCategories: string[],
    currency: string,
    discloseDebtNames: boolean = true
): MonthlySummaryRow[] => {
    const earliest = getEarliestYearMonth(transactions, investments);
    if (!earliest) return [];

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = getMonthsBetween(earliest, currentYearMonth);

    return months.map(yearMonth => {
        const data = buildMonthlySummaryData(yearMonth, transactions, investments, debts, budgets, excludeCategories, discloseDebtNames);
        return {
            yearMonth,
            isFinal: yearMonth < currentYearMonth,
            summaryText: renderMonthlySummaryText(data, currency),
            summaryJson: data,
            createdAt: '',
            updatedAt: ''
        };
    });
};

/**
 * Fetches everything needed to assemble chat context, once. The financial
 * snapshot is range-independent, so it's rendered here a single time; callers
 * then cheaply assemble per-range contexts via `assembleContextForRange`
 * without re-querying the database for every range option.
 *
 * `excludeCategories` hides those categories from category-level detail
 * (breakdowns, top expenses, budget alerts) in both the snapshot and monthly
 * summaries, and rolls them into a single lifetime "Private Categories" line
 * in the snapshot instead. It never removes those transactions from the
 * underlying totals - Total Cash, burn rate, and every income/expense figure
 * are always computed from the complete data, so excluding a category can't
 * throw off the real numbers. `discloseDebtNames: false` behaves the same way
 * for debts specifically - each one is renamed "Debt N" (stable per debt, see
 * buildDebtNameMap) but its amounts/status/type are always included in full.
 * When neither applies, monthly summaries are read from the DB cache (fast,
 * and always has real debt names - that cache is shared with in-app display
 * like MonthlySummaryModal, so it can't itself be built with names hidden);
 * otherwise they're recomputed on the fly so the exclusion/anonymization can
 * be honored.
 */
export const fetchChatContextInputs = async (excludeCategories: string[] = [], discloseDebtNames: boolean = true): Promise<ChatContextInputs> => {
    // The DB-cached monthly_summary table is normally kept fresh by a fire-and-forget
    // sync on app launch, but that can still be mid-flight if chat is opened shortly
    // after a cold start - reading it before that finishes would silently truncate
    // the context (only the snapshot, no monthly history). Awaiting here guarantees
    // freshness; it's cheap on repeat calls since already-finalized months are skipped.
    const needsFreshSummaries = excludeCategories.length > 0 || !discloseDebtNames;
    if (!needsFreshSummaries) {
        await syncMonthlySummaries();
    }

    const [transactions, allInvestments, debts, profile, cachedSummaries, portfolioStats, holdings, budgets] = await Promise.all([
        getCachedTransactions(),
        getAllInvestments(),
        getAllDebts(),
        getUserProfile(),
        needsFreshSummaries ? Promise.resolve<MonthlySummaryRow[]>([]) : getAllMonthlySummaries(),
        getPortfolioStats(),
        getPortfolioHoldings(),
        getAllBudgets()
    ]);

    const currency = profile?.currency || 'PHP';

    const snapshot = buildFinancialSnapshotData(transactions, debts, portfolioStats, holdings, budgets, excludeCategories, discloseDebtNames);
    const snapshotText = renderFinancialSnapshotText(snapshot, currency);

    const summaries = needsFreshSummaries
        ? buildFilteredMonthlySummaries(transactions, allInvestments, debts, budgets, excludeCategories, currency, discloseDebtNames)
        : cachedSummaries;

    return { snapshotText, summaries, hasDebts: debts.length > 0 };
};

export const assembleContextForRange = (inputs: ChatContextInputs, range: ChatHistoryRange): ChatContext => {
    const years = RANGE_YEARS[range];
    const filteredSummaries = years === null
        ? inputs.summaries
        : inputs.summaries.filter(s => s.yearMonth >= yearMonthCutoff(years));

    const summariesText = filteredSummaries.map(s => s.summaryText).join('\n\n');
    const contextText = [inputs.snapshotText, summariesText].filter(Boolean).join('\n\n');

    return { contextText, estimatedTokens: estimateTokens(contextText) };
};

export const buildChatContext = async (range: ChatHistoryRange, excludeCategories: string[] = [], discloseDebtNames: boolean = true): Promise<ChatContext> => {
    const inputs = await fetchChatContextInputs(excludeCategories, discloseDebtNames);
    return assembleContextForRange(inputs, range);
};
