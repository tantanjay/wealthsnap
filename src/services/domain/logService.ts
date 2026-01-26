import { AIUsageLog } from "@types";
import { getDatabase } from "@services/database/databaseService";

export const saveAIUsageLog = async (log: AIUsageLog): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO ai_usage_logs 
             (id, timestamp, endpoint, provider, model, status, inputTokens, outputTokens, imageCount, durationMs, costUSD)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.timestamp,
                log.endpoint,
                log.provider,
                log.model,
                log.status,
                log.inputTokens,
                log.outputTokens,
                log.imageCount,
                log.durationMs,
                log.costUSD
            ]
        );
    } catch (error) {
        console.error('Failed to save AI log:', error);
    }
};

export const getAIUsageLogs = async (limit: number = 50): Promise<AIUsageLog[]> => {
    try {
        const db = await getDatabase();
        const rows = await db.getAllAsync<any>(
            'SELECT * FROM ai_usage_logs ORDER BY timestamp DESC LIMIT ?',
            [limit]
        );
        return rows as AIUsageLog[];
    } catch (error) {
        console.error('Failed to get AI logs:', error);
        return [];
    }
};