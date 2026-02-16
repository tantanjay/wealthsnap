import { BigNumber } from 'bignumber.js';
import { Debt, DebtStatus, DebtType, DebtDirection } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { encryptField, bulkDecryptItems } from '@services/core/encryptionService';

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
    // Encrypted Fields: initialAmount, minPayment, fees, termMonths, notes, contactId
    const encryptedAmount = await encryptField(debt.initialAmount);
    const encryptedMinPayment = await encryptField(debt.minPayment);
    const encryptedFees = debt.fees ? await encryptField(debt.fees) : null;
    const encryptedTerm = debt.termMonths ? await encryptField(debt.termMonths.toString()) : null;
    const encryptedNotes = debt.notes ? await encryptField(debt.notes) : null;
    const encryptedContact = debt.contactId ? await encryptField(debt.contactId) : null;

    return [
        debt.id,
        debt.name,
        debt.type,
        debt.direction,
        encryptedAmount,
        debt.currency || 'PHP',
        debt.interestRate.toString(),
        debt.interestType,
        encryptedMinPayment,
        encryptedFees,
        debt.startDate || null,
        encryptedTerm,
        debt.dueDate || null,
        debt.status,
        encryptedNotes,
        encryptedContact,
        debt.createdAt,
        debt.updatedAt
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
        // Order by status (Active first), then closest due date or name
        const rows = await db.getAllAsync<any>('SELECT * FROM debts ORDER BY status ASC, name ASC');

        // Decrypt columns
        const encryptedColumns = ['initialAmount', 'minPayment', 'fees', 'termMonths', 'notes', 'contactId'];
        const decryptedRows = await bulkDecryptItems<any>(rows, encryptedColumns);

        return decryptedRows.map(row => ({
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

    } catch (error) {
        console.error('Error getting debts:', error);
        return [];
    }
};

export const deleteDebt = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting debt:', error);
        throw new Error('Failed to delete debt');
    }
};
