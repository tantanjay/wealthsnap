import { BigNumber } from 'bignumber.js';
import { ThinkingLevel } from '@google/genai';
import { fetch as expoFetch } from 'expo/fetch';

import { getGeminiClient, logUsage, estimateTokens, withThinkingLevel } from '@services/integrations/geminiService';

// React Native's built-in fetch doesn't expose a streaming ReadableStream body
// (response.body is null), which breaks @google/genai's generateContentStream
// with "Response body is empty" - it calls the global fetch directly with no
// way to inject a different one. expo/fetch's implementation does support
// streaming bodies. Swapped in only for the duration of the streaming call
// (not globally) so a problem with it can't take down every other network
// call in the app (receipt scanning, price fetching, exchange rates, backups).
const withStreamingFetch = async <T>(fn: () => Promise<T>): Promise<T> => {
    const originalFetch = global.fetch;
    global.fetch = expoFetch as typeof fetch;
    try {
        return await fn();
    } finally {
        global.fetch = originalFetch;
    }
};

// Prepended to every request's systemInstruction. Gemini tends to reach for
// LaTeX/math notation ($$...$$, \text{}, \frac{}{}, etc.) when discussing
// formulas, but this renders in a plain chat bubble (no math typesetting
// available), so it needs to be told explicitly to stay in plain text.
const FORMATTING_GUIDANCE = `You are a helpful financial assistant inside a personal finance app, answering questions using the financial data provided below as context.

Formatting rules for your replies - this renders in a mobile chat bubble, not a document or notebook:
- Never use LaTeX or math notation (no $$, \\text{}, \\frac{}{}, \\quad, \\times, etc.). Write formulas and calculations in plain text, e.g. "Savings Rate = (Income - Expenses) / Income".
- Never use markdown tables.
- Keep formatting simple: short paragraphs, occasional **bold** for emphasis, and plain bullet or numbered lists when listing multiple items. Avoid deeply nested lists and headings deeper than necessary.
- Be concise and conversational.`;

export interface ChatTurn {
    role: 'user' | 'model';
    text: string;
}

export interface ChatReplyResult {
    fullText: string;
    inputTokens: number;
    outputTokens: number;
    costUSD: BigNumber;
    // Set when the supplied cache had expired/been evicted server-side and the
    // call had to fall back to sending the context inline - caller should
    // discard its cache reference and create a fresh one.
    cacheInvalid?: boolean;
}

export interface ChatCache {
    name: string;
    modelName: string;
}

/**
 * Creates an explicit Gemini context cache for the (large, session-static)
 * financial context block, so it isn't re-sent and re-billed at full price
 * on every message - only the growing conversation history is sent fresh.
 * Returns null on any failure (context too small for the model's caching
 * floor, model doesn't support caching, network error, etc) - callers should
 * treat that as "just send the context inline like before".
 */
export const createChatCache = async (contextText: string): Promise<ChatCache | null> => {
    try {
        const { genAI, modelName } = await getGeminiClient();
        const fullSystemInstruction = `${FORMATTING_GUIDANCE}\n\n${contextText}`;

        const cache = await genAI.caches.create({
            model: modelName,
            config: {
                systemInstruction: fullSystemInstruction,
                displayName: 'wealthsnap-chat-context',
                ttl: '3600s'
            }
        });

        if (!cache.name) return null;
        return { name: cache.name, modelName };
    } catch (error) {
        console.warn('[geminiChatService] Cache creation skipped:', error);
        return null;
    }
};

export const deleteChatCache = async (name: string): Promise<void> => {
    try {
        const { genAI } = await getGeminiClient();
        await genAI.caches.delete({ name });
    } catch (error) {
        console.warn('[geminiChatService] Cache delete failed:', error);
    }
};

// How much of the replayed conversation to keep, in estimated tokens - oldest
// turns are dropped first once the budget is exceeded. No summarization for v1;
// a single ungated chat sitting is unlikely to need it (see plan notes).
const HISTORY_TOKEN_BUDGET = 8000;

const trimHistory = (history: ChatTurn[]): ChatTurn[] => {
    let budget = HISTORY_TOKEN_BUDGET;
    const kept: ChatTurn[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const cost = estimateTokens(turn.text);
        if (kept.length > 0 && budget - cost < 0) break;
        kept.unshift(turn);
        budget -= cost;
    }

    return kept;
};

/**
 * Streams a chat reply grounded in `systemInstruction` (the financial snapshot +
 * monthly summaries context block). `history` should include the latest user
 * turn as its last entry - there's no separate "current message" parameter.
 */
export const sendChatMessage = async (
    systemInstruction: string,
    history: ChatTurn[],
    onChunk: (textDelta: string) => void,
    cache?: ChatCache
): Promise<ChatReplyResult> => {
    const startTime = Date.now();
    let modelName = 'unknown';

    const trimmed = trimHistory(history);
    const fullSystemInstruction = `${FORMATTING_GUIDANCE}\n\n${systemInstruction}`;
    const promptText = fullSystemInstruction + '\n' + trimmed.map(t => t.text).join('\n');

    try {
        const { genAI, modelName: mn } = await getGeminiClient();
        modelName = mn;

        const contents = trimmed.map(turn => ({
            role: turn.role,
            parts: [{ text: turn.text }]
        }));

        // A cache built under a different model is unusable - just skip it.
        const useCache = !!cache && cache.modelName === modelName;

        let fullText = '';
        let usage;
        let cacheInvalid = false;

        const runStream = async (withCache: boolean) => {
            fullText = '';
            await withStreamingFetch(async () => {
                const stream = await genAI.models.generateContentStream({
                    model: modelName,
                    config: {
                        // The cache already carries the system instruction - sending
                        // both is redundant/rejected, so they're mutually exclusive.
                        ...(withCache ? { cachedContent: cache!.name } : { systemInstruction: fullSystemInstruction }),
                        // Conversational synthesis over already-provided context - doesn't need deep reasoning.
                        ...withThinkingLevel(modelName, ThinkingLevel.LOW)
                    },
                    contents
                });

                for await (const chunk of stream) {
                    const delta = chunk.text || '';
                    if (delta) {
                        fullText += delta;
                        onChunk(delta);
                    }
                    // usageMetadata only arrives on the final chunk of the stream.
                    if (chunk.usageMetadata) {
                        usage = chunk.usageMetadata;
                    }
                }
            });
        };

        try {
            await runStream(useCache);
        } catch (streamError) {
            // The cache references are checked server-side before any content is
            // generated, so a stale/evicted cache fails before streaming any text -
            // safe to silently retry uncached rather than surface the error.
            const message = streamError instanceof Error ? streamError.message : String(streamError);
            if (useCache && /cach/i.test(message) && /(not found|expired|invalid)/i.test(message)) {
                cacheInvalid = true;
                await runStream(false);
            } else {
                throw streamError;
            }
        }

        const { inputTokens, outputTokens, costUSD } = await logUsage(
            'chatMessage', promptText, fullText, 0, 0, Date.now() - startTime, modelName, 'success', usage
        );

        return { fullText, inputTokens, outputTokens, costUSD, cacheInvalid };
    } catch (error) {
        await logUsage('chatMessage', promptText, '', 0, 0, Date.now() - startTime, modelName, 'error');
        throw error;
    }
};
