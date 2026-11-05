import { BigNumber } from "bignumber.js";
import { AIUsageLog } from "@types";
import { getDatabase } from "@services/database/databaseService";

export const saveAIUsageLog = async (log: AIUsageLog): Promise<void> => {
    try {
        const db = await getDatabase();
        await db.runAsync(
            `INSERT INTO ai_usage_logs 
             (id, timestamp, endpoint, provider, model, status, inputTokens, outputTokens, imageCount, durationMs, costUSD, runId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                log.costUSD.toFixed(),
                log.runId ?? null
            ]
        );
    } catch (error) {
        console.error('Failed to save AI log:', error);
    }
};

// High enough that a per-symbol price fetch (one row per holding) doesn't push older entries out.
export const getAIUsageLogs = async (limit: number = 300): Promise<AIUsageLog[]> => {
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

export interface AIUsageRow extends AIUsageLog {
    calls: number;
    failedCalls: number;
}

// One row per run: calls sharing a runId are summed; the slowest call's duration is the run's, since all count from its start.
export const mergeUsageRuns = (logs: AIUsageLog[]): AIUsageRow[] => {
    const runs = new Map<string, AIUsageRow>();
    const rows: AIUsageRow[] = [];
    for (const log of logs) {
        const failed = log.status === 'error' ? 1 : 0;
        const existing = log.runId ? runs.get(log.runId) : undefined;
        if (!existing) {
            const row: AIUsageRow = { ...log, costUSD: new BigNumber(log.costUSD || 0), calls: 1, failedCalls: failed };
            if (log.runId) runs.set(log.runId, row);
            rows.push(row);
            continue;
        }
        existing.calls += 1;
        existing.failedCalls += failed;
        existing.inputTokens += log.inputTokens;
        existing.outputTokens += log.outputTokens;
        existing.imageCount += log.imageCount;
        existing.costUSD = existing.costUSD.plus(new BigNumber(log.costUSD || 0));
        existing.durationMs = Math.max(existing.durationMs, log.durationMs);
        if (log.timestamp > existing.timestamp) existing.timestamp = log.timestamp;
        // The run only reads as failed when every call failed.
        existing.status = existing.failedCalls === existing.calls ? 'error' : 'success';
    }
    return rows;
};
