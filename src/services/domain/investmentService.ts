import { Investment } from "../../types";
import { getDatabase } from "../database/databaseService";
import { decryptField, encryptField } from '../core/encryptionService';
import { invalidateInvestmentCache } from "../core/dataCache";
import { chunkArray } from "./helper";

interface PreparedInvestment extends Investment {
    encryptedQty: string | null;
    encryptedPrice: string | null;
    encryptedNotes: string | null;
}

export const bulkSaveInvestments = async (investments: Investment[]): Promise<void> => {
    try {
        const db = await getDatabase();

        const chunks = chunkArray(investments, 100);
        const preparedData: PreparedInvestment[] = [];

        for (const chunk of chunks) {
            const processedChunk = await Promise.all(chunk.map(async (inv) => {
                const [encryptedQty, encryptedPrice, encryptedNotes] = await Promise.all([
                    encryptField(inv.quantity),
                    encryptField(inv.averageBuyPrice),
                    inv.notes ? encryptField(inv.notes) : Promise.resolve(null)
                ]);

                return {
                    ...inv,
                    encryptedQty,
                    encryptedPrice,
                    encryptedNotes
                };
            }));
            preparedData.push(...processedChunk);
        }

        await db.withTransactionAsync(async () => {
            const query = `
                INSERT OR REPLACE INTO investments 
                (id, symbol, name, type, quantity, averageBuyPrice, currentPrice, lastUpdated, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (const inv of preparedData) {
                await db.runAsync(query, [
                    inv.id,
                    inv.symbol,
                    inv.name,
                    inv.type,
                    inv.encryptedQty,
                    inv.encryptedPrice,
                    inv.currentPrice || null,
                    inv.lastUpdated || null,
                    inv.encryptedNotes
                ]);
            }
        });

        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error bulk saving investments:', error);
        throw error;
    }
};

export const saveInvestment = async (investment: Investment): Promise<void> => {
    try {
        const db = await getDatabase();

        // Encrypt sensitive fields
        const encryptedQuantity = await encryptField(investment.quantity);
        const encryptedAvgPrice = await encryptField(investment.averageBuyPrice);
        const encryptedNotes = investment.notes ? await encryptField(investment.notes) : null;

        await db.runAsync(
            `INSERT OR REPLACE INTO investments 
             (id, symbol, name, type, quantity, averageBuyPrice, currentPrice, lastUpdated, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                investment.id,
                investment.symbol,
                investment.name,
                investment.type,
                encryptedQuantity,
                encryptedAvgPrice,
                investment.currentPrice || null,
                investment.lastUpdated || null,
                encryptedNotes
            ]
        );
        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error saving investment:', error);
        throw new Error('Failed to save investment');
    }
};

export const getAllInvestments = async (): Promise<Investment[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM investments ORDER BY symbol');

        // Decrypt sensitive fields
        const decrypted = await Promise.all(rows.map(async (row) => {
            const decryptedNotes = await decryptField(row.notes);
            return {
                id: row.id,
                symbol: row.symbol,
                name: row.name,
                type: row.type,
                quantity: parseFloat((await decryptField(row.quantity)) || '0'),
                averageBuyPrice: parseFloat((await decryptField(row.averageBuyPrice)) || '0'),
                currentPrice: row.currentPrice,
                lastUpdated: row.lastUpdated,
                notes: decryptedNotes || undefined
            };
        }));

        return decrypted;
    } catch (error) {
        console.error('Error getting investments:', error);
        return [];
    }
};

export const deleteInvestment = async (id: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM investments WHERE id = ?', [id]);
        invalidateInvestmentCache();
    } catch (error) {
        console.error('Error deleting investment:', error);
        throw new Error('Failed to delete investment');
    }
};