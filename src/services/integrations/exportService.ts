import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';

import { getAllTransactions } from '@services/domain/transactionService';
import { getAllInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';

const CURRENCY_FORMAT = '#,##0.00';

/**
 * Builds a worksheet with a fixed header row (present even when `rows` is empty) and
 * applies a number format to the given currency-like columns.
 */
function buildSheet(headers: string[], rows: Record<string, unknown>[], currencyColumns: string[] = []): XLSX.WorkSheet {
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (const column of currencyColumns) {
        const c = headers.indexOf(column);
        if (c === -1) continue;
        for (let r = 1; r <= range.e.r; r++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.t === 'n') cell.z = CURRENCY_FORMAT;
        }
    }

    return ws;
}

const isoDate = (iso?: string) => (iso ? iso.split('T')[0] : '');

/**
 * Exports transactions, investments, debts, and debt payments to a single multi-sheet
 * .xlsx file. Debt-linked transactions are included in both the Transactions sheet
 * (full ledger, for cashflow totals) and the Debt Payments sheet (filtered, joined to
 * debt name) rather than being split out of the main ledger.
 * @returns URI of the created .xlsx file
 */
export const exportToExcel = async (): Promise<string> => {
    const [transactions, investments, debts] = await Promise.all([
        getAllTransactions(),
        getAllInvestments(),
        getAllDebts(),
    ]);

    const debtNameById = new Map(debts.map((d) => [d.id, d.name]));

    const transactionHeaders = ['Date', 'Type', 'Category', 'Sub-Category', 'Amount', 'Note', 'Recurring', 'Created At'];
    const transactionRows = transactions.map((t) => ({
        'Date': isoDate(t.date),
        'Type': t.type,
        'Category': t.category,
        'Sub-Category': t.subCategory || '',
        'Amount': t.amount.toNumber(),
        'Note': t.note || '',
        'Recurring': t.isRecurring ? 'Yes' : 'No',
        'Created At': isoDate(t.createdAt),
    }));

    const investmentHeaders = ['Date', 'Symbol', 'Type', 'Action', 'Quantity', 'Price', 'Currency', 'Exchange Rate', 'Fees', 'Notes'];
    const investmentRows = investments.map((i) => ({
        'Date': isoDate(i.date),
        'Symbol': i.symbol,
        'Type': i.type,
        'Action': i.action,
        'Quantity': i.quantity.toNumber(),
        'Price': i.price.toNumber(),
        'Currency': i.currency || '',
        'Exchange Rate': i.exchangeRate ? i.exchangeRate.toNumber() : '',
        'Fees': i.fees ? i.fees.toNumber() : '',
        'Notes': i.notes || '',
    }));

    const debtHeaders = ['Name', 'Type', 'Direction', 'Initial Amount', 'Currency', 'Interest Rate', 'Interest Type', 'Min Payment', 'Fees', 'Start Date', 'Term (mo)', 'Due Date', 'Status', 'Notes'];
    const debtRows = debts.map((d) => ({
        'Name': d.name,
        'Type': d.type,
        'Direction': d.direction,
        'Initial Amount': d.initialAmount.toNumber(),
        'Currency': d.currency,
        'Interest Rate': d.interestRate.toNumber(),
        'Interest Type': d.interestType,
        'Min Payment': d.minPayment.toNumber(),
        'Fees': d.fees ? d.fees.toNumber() : '',
        'Start Date': isoDate(d.startDate),
        'Term (mo)': d.termMonths ?? '',
        'Due Date': isoDate(d.dueDate),
        'Status': d.status,
        'Notes': d.notes || '',
    }));

    const debtPaymentHeaders = ['Debt Name', 'Date', 'Type', 'Amount', 'Note'];
    const debtPaymentRows = transactions
        .filter((t) => !!t.debtId)
        .map((t) => ({
            'Debt Name': debtNameById.get(t.debtId as string) ?? 'Unknown Debt',
            'Date': isoDate(t.date),
            'Type': t.subCategory === 'INITIAL_TRANSACTION' ? `${t.type} (Initial)` : t.type,
            'Amount': t.amount.toNumber(),
            'Note': t.note || '',
        }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, buildSheet(transactionHeaders, transactionRows, ['Amount']), 'Transactions');
    XLSX.utils.book_append_sheet(workbook, buildSheet(investmentHeaders, investmentRows, ['Price', 'Fees']), 'Investments');
    XLSX.utils.book_append_sheet(workbook, buildSheet(debtHeaders, debtRows, ['Initial Amount', 'Min Payment', 'Fees']), 'Debts');
    XLSX.utils.book_append_sheet(workbook, buildSheet(debtPaymentHeaders, debtPaymentRows, ['Amount']), 'Debt Payments');

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;

    const dateStr = new Date().toISOString().split('T')[0];
    const file = new File(Paths.document, `wealthsnap_export_${dateStr}.xlsx`);
    file.write(base64, { encoding: 'base64' });
    return file.uri;
};
