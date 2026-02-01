import { getDatabase } from "@services/database/databaseService";

export interface Asset {
    symbol: string;
    name?: string;
    exchange?: string;
    sector?: string;
    type?: string;
    currency?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

// --- Queries ---
const INSERT_ASSET_QUERY = `
    INSERT OR REPLACE INTO assets (symbol, name, exchange, sector, type, currency, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

const GET_ALL_ASSETS_QUERY = `
    SELECT * FROM assets ORDER BY symbol ASC
`;

const GET_ASSET_QUERY = `
    SELECT * FROM assets WHERE symbol = ?
`;

const DELETE_ASSET_QUERY = `
    DELETE FROM assets WHERE symbol = ?
`;

/**
 * Create or update an asset
 */
export const createAsset = async (asset: Asset): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(INSERT_ASSET_QUERY, [
            asset.symbol,
            asset.name || null,
            asset.exchange || null,
            asset.sector || null,
            asset.type || null,
            asset.currency || null,
            asset.description || null
        ]);
    } catch (error) {
        console.error('Error creating asset:', error);
        throw new Error('Failed to create asset');
    }
};

/**
 * Update an asset
 */
export const updateAsset = async (symbol: string, asset: Partial<Asset>): Promise<void> => {
    try {
        const db = await getDatabase();
        // Construct dynamic update query
        const fields: string[] = [];
        const values: any[] = [];

        if (asset.name !== undefined) { fields.push('name = ?'); values.push(asset.name); }
        if (asset.exchange !== undefined) { fields.push('exchange = ?'); values.push(asset.exchange); }
        if (asset.sector !== undefined) { fields.push('sector = ?'); values.push(asset.sector); }
        if (asset.type !== undefined) { fields.push('type = ?'); values.push(asset.type); }
        if (asset.currency !== undefined) { fields.push('currency = ?'); values.push(asset.currency); }
        if (asset.description !== undefined) { fields.push('description = ?'); values.push(asset.description); }

        fields.push('updatedAt = CURRENT_TIMESTAMP');

        if (fields.length === 1) return; // Only updatedAt, no real changes

        values.push(symbol);

        await db.runAsync(
            `UPDATE assets SET ${fields.join(', ')} WHERE symbol = ?`,
            values
        );
    } catch (error) {
        console.error('Error updating asset:', error);
        throw new Error('Failed to update asset');
    }
};

/**
 * Get all assets
 */
export const getAllAssets = async (): Promise<Asset[]> => {
    try {
        const db = await getDatabase();
        return await db.getAllAsync<Asset>(GET_ALL_ASSETS_QUERY);
    } catch (error) {
        console.error('Error fetching assets:', error);
        return [];
    }
};

/**
 * Get an asset by symbol
 */
export const getAsset = async (symbol: string): Promise<Asset | null> => {
    try {
        const db = await getDatabase();
        return await db.getFirstAsync<Asset>(GET_ASSET_QUERY, [symbol]);
    } catch (error) {
        console.error('Error fetching asset:', error);
        return null;
    }
};

/**
 * Delete an asset by symbol
 */
export const deleteAsset = async (symbol: string): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(DELETE_ASSET_QUERY, [symbol]);
    } catch (error) {
        console.error('Error deleting asset:', error);
        throw new Error('Failed to delete asset');
    }
};
