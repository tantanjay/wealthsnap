import { Category } from "../../types";
import { getDatabase } from "../database/databaseService";

export const bulkSaveCategories = async (categories: Category[]): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.withTransactionAsync(async () => {
            for (const cat of categories) {
                await db.runAsync(
                    `INSERT OR REPLACE INTO categories 
                     (id, name, type, icon)
                     VALUES (?, ?, ?, ?)`,
                    [
                        cat.id,
                        cat.name,
                        cat.type,
                        cat.icon || null
                    ]
                );
            }
        });
    } catch (error) {
        console.error('Error bulk saving categories:', error);
        throw new Error('Failed to bulk save categories');
    }
};

export const saveCategory = async (category: Category): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT OR REPLACE INTO categories 
             (id, name, type, icon)
             VALUES (?, ?, ?, ?)`,
            [
                category.id,
                category.name,
                category.type,
                category.icon || null
            ]
        );
    } catch (error) {
        console.error('Error saving category:', error);
        throw new Error('Failed to save category');
    }
};

export const getAllCategories = async (): Promise<Category[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM categories');
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            icon: row.icon
        }));
    } catch (error) {
        console.error('Error getting categories:', error);
        return [];
    }
};