import { getCachedTransactions } from '@services/domain/transactionService';
import { getPortfolioStats } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllMonthlySummaries, MonthlySummaryRow } from '@services/domain/monthlySummaryService';
import { getUserProfile } from '@services/core/storageService';
import { buildFinancialSnapshotData, renderFinancialSnapshotText } from '@utils/financialSnapshotBuilder';
import { estimateTokens } from '@services/integrations/geminiService';

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
}

const yearMonthCutoff = (years: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Fetches everything needed to assemble chat context, once. The financial
 * snapshot is range-independent, so it's rendered here a single time; callers
 * then cheaply assemble per-range contexts via `assembleContextForRange`
 * without re-querying the database for every range option.
 */
export const fetchChatContextInputs = async (): Promise<ChatContextInputs> => {
    const [transactions, debts, profile, summaries, portfolioStats] = await Promise.all([
        getCachedTransactions(),
        getAllDebts(),
        getUserProfile(),
        getAllMonthlySummaries(),
        getPortfolioStats()
    ]);

    const currency = profile?.currency || 'PHP';
    const snapshot = buildFinancialSnapshotData(transactions, debts, portfolioStats);
    const snapshotText = renderFinancialSnapshotText(snapshot, currency);

    return { snapshotText, summaries };
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

export const buildChatContext = async (range: ChatHistoryRange): Promise<ChatContext> => {
    const inputs = await fetchChatContextInputs();
    return assembleContextForRange(inputs, range);
};
