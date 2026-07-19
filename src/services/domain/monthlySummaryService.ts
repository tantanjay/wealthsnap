import { getDatabase } from '@services/database/databaseService';
import { getAllTransactions } from '@services/domain/transactionService';
import { getAllInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllBudgets } from '@services/domain/budgetService';
import {
    buildMonthlySummaryData,
    renderMonthlySummaryText,
    getEarliestYearMonth,
    getMonthsBetween,
    MonthlySummaryData
} from '@utils/monthlySummaryBuilder';

export interface MonthlySummaryRow {
    yearMonth: string;
    isFinal: boolean;
    summaryText: string;
    summaryJson: MonthlySummaryData;
    createdAt: string;
    updatedAt: string;
}

const UPSERT_MONTHLY_SUMMARY_QUERY = `
  INSERT OR REPLACE INTO monthly_summary (yearMonth, isFinal, summaryText, summaryJson)
  VALUES (?, ?, ?, ?)
`;

const getCurrentYearMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const mapRow = (row: any): MonthlySummaryRow => ({
    yearMonth: row.yearMonth,
    isFinal: row.isFinal === 1,
    summaryText: row.summaryText,
    summaryJson: JSON.parse(row.summaryJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
});

export const getMonthlySummary = async (yearMonth: string): Promise<MonthlySummaryRow | null> => {
    try {
        const db = await getDatabase();
        const row = await db.getFirstAsync<any>('SELECT * FROM monthly_summary WHERE yearMonth = ?', [yearMonth]);
        return row ? mapRow(row) : null;
    } catch (error) {
        console.error('[MonthlySummary] Error getting summary:', error);
        return null;
    }
};

export const getAllMonthlySummaries = async (): Promise<MonthlySummaryRow[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM monthly_summary ORDER BY yearMonth ASC');
        return rows.map(mapRow);
    } catch (error) {
        console.error('[MonthlySummary] Error getting summaries:', error);
        return [];
    }
};

/**
 * Generates/refreshes monthly_summary rows for every month that has transaction or
 * investment data, from the earliest recorded month up to the current one.
 *
 * Already-finalized past months are skipped, so calling this on every app launch is cheap
 * after the first run - only the current (and any not-yet-finalized) month is recomputed.
 * Pass `force: true` to regenerate every month regardless of its finalized state (used by
 * the manual "Reprocess" action, e.g. after editing old transactions).
 */
export const syncMonthlySummaries = async (options?: { force?: boolean }): Promise<void> => {
    const force = options?.force ?? false;

    try {
        const [transactions, investments, debts, budgets] = await Promise.all([
            getAllTransactions(),
            getAllInvestments(),
            getAllDebts(),
            getAllBudgets()
        ]);

        if (transactions.length === 0 && investments.length === 0) return;

        const earliest = getEarliestYearMonth(transactions, investments);
        if (!earliest) return;

        const currentYearMonth = getCurrentYearMonth();
        const allMonths = getMonthsBetween(earliest, currentYearMonth);

        const db = await getDatabase();
        const existingRows = await db.getAllAsync<{ yearMonth: string; isFinal: number }>(
            'SELECT yearMonth, isFinal FROM monthly_summary'
        );
        const finalizedMonths = force
            ? new Set<string>()
            : new Set(existingRows.filter(r => r.isFinal === 1).map(r => r.yearMonth));

        const monthsToGenerate = allMonths.filter(ym => !finalizedMonths.has(ym));

        for (let i = 0; i < monthsToGenerate.length; i++) {
            const yearMonth = monthsToGenerate[i];
            const data = buildMonthlySummaryData(yearMonth, transactions, investments, debts, budgets);
            const text = renderMonthlySummaryText(data);
            const isFinal = yearMonth < currentYearMonth;

            await db.runAsync(UPSERT_MONTHLY_SUMMARY_QUERY, [yearMonth, isFinal ? 1 : 0, text, JSON.stringify(data)]);

            // Yield to the event loop periodically so a large backfill doesn't block the UI thread
            if (i % 3 === 2) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    } catch (error) {
        console.error('[MonthlySummary] Sync failed:', error);
    }
};
