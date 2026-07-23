import { BigNumber } from 'bignumber.js';
import { Debt, DebtStatus, DebtType, DebtDirection } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { encryptField, bulkDecryptItems } from '@services/core/encryptionService';
import { chunkArray } from "@utils/index";
import { upsertTombstone } from '@services/domain/tombstoneService';

// --- Constants & Helpers ---

const UPSERT_DEBT_QUERY = `
  INSERT OR REPLACE INTO debts 
  (id, name, type, direction, initialAmount, currency, interestRate, interestType, minPayment, fees, startDate, termMonths, dueDate, status, notes, contactId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Encrypts fields and returns the array of values in the correct SQL order
 */
const prepareDebtValues = async (debt: Debt) => {
    const now = new Date().toISOString();

    // Encrypted Fields: name, initialAmount, interestRate, minPayment, fees, termMonths, notes, contactId
    const encryptedName = await encryptField(debt.name);
    const encryptedAmount = await encryptField(debt.initialAmount);
    const encryptedRate = await encryptField(debt.interestRate.toString());
    const encryptedMinPayment = await encryptField(debt.minPayment);
    const encryptedFees = debt.fees ? await encryptField(debt.fees) : null;
    const encryptedTerm = debt.termMonths ? await encryptField(debt.termMonths.toString()) : null;
    const encryptedNotes = debt.notes ? await encryptField(debt.notes) : null;
    const encryptedContact = debt.contactId ? await encryptField(debt.contactId) : null;

    return [
        debt.id,
        encryptedName,
        debt.type,
        debt.direction,
        encryptedAmount,
        debt.currency || 'PHP',
        encryptedRate,
        debt.interestType,
        encryptedMinPayment,
        encryptedFees,
        debt.startDate || null,
        encryptedTerm,
        debt.dueDate || null,
        debt.status,
        encryptedNotes,
        encryptedContact,
        // Every normal app-facing save already supplies these (Debt's type requires them,
        // and DebtForm stamps updatedAt itself before calling save) - the fallback matters
        // specifically for bulkSaveDebts's other caller, the merge engine, which ingests a
        // peer's JSON over the network where a malformed/corrupted record could omit them.
        debt.createdAt || now,
        debt.updatedAt || now
    ];
};

// --- Exported Functions ---

export const saveDebt = async (debt: Debt): Promise<void> => {
    try {
        const db = await getDatabase();
        const values = await prepareDebtValues(debt);
        await db.runAsync(UPSERT_DEBT_QUERY, values);

        // Invalidate cache if we implement one for debts later
        // DataCache.invalidateDebtCache(); 
    } catch (error) {
        console.error('Error saving debt:', error);
        throw new Error('Failed to save debt');
    }
};

export const getAllDebts = async (): Promise<Debt[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM debts');

        // Decrypt columns (name and interestRate are ciphertext, so sorting has to happen
        // after decryption below rather than via SQL ORDER BY)
        const encryptedColumns = ['name', 'initialAmount', 'interestRate', 'minPayment', 'fees', 'termMonths', 'notes', 'contactId'];
        const decryptedRows = await bulkDecryptItems<any>(rows, encryptedColumns);

        const debts = decryptedRows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type as DebtType,
            direction: row.direction as DebtDirection,
            initialAmount: new BigNumber(row.initialAmount || 0),
            currency: row.currency,
            interestRate: new BigNumber(row.interestRate || 0),
            interestType: row.interestType,
            minPayment: new BigNumber(row.minPayment || 0),
            fees: row.fees ? new BigNumber(row.fees) : undefined,
            startDate: row.startDate,
            termMonths: row.termMonths ? parseInt(row.termMonths, 10) : undefined,
            dueDate: row.dueDate,
            status: row.status as DebtStatus,
            notes: row.notes,
            contactId: row.contactId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

        // Order by status, then name - replicates the old `ORDER BY status ASC, name ASC`
        // SQL clause, which no longer works now that name is stored encrypted.
        return debts.sort((a, b) => {
            const statusCompare = a.status.localeCompare(b.status);
            if (statusCompare !== 0) return statusCompare;
            return (a.name || '').localeCompare(b.name || '');
        });

    } catch (error) {
        console.error('Error getting debts:', error);
        return [];
    }
};

export const deleteDebt = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
        await upsertTombstone('debts', id);
    } catch (error) {
        console.error('Error deleting debt:', error);
        throw new Error('Failed to delete debt');
    }
};

export const bulkSaveDebts = async (debts: Debt[]): Promise<void> => {
    try {
        const db = await getDatabase();
        const chunks = chunkArray(debts);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const preparedRows = await Promise.all(chunk.map(prepareDebtValues));

            await db.withTransactionAsync(async () => {
                for (const values of preparedRows) {
                    await db.runAsync(UPSERT_DEBT_QUERY, values);
                }
            });

            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    } catch (error) {
        console.error('Error bulk saving debts:', error);
        throw new Error('Failed to bulk save debts');
    }
};
