import { BigNumber } from 'bignumber.js';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

import { AIUsageLog, ReceiptAnalysisResult } from '@types';
import { getAIConfig } from '@services/core/storageService';
import { generateUUID } from '@utils/uuid';
import { saveAIUsageLog } from '@services/domain/logService';
import { EXPENSE_CATEGORIES } from '@constants/categories';

// Dynamic Configuration
let genAIInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

export const getGeminiClient = async () => {
    // 1. Try Storage
    const config = await getAIConfig();
    let apiKey = config?.apiKey;
    // Default to gemini-3.8-flash
    let modelId = config?.modelId || 'gemini-3.8-flash';

    if (!apiKey) {
        throw new Error("Gemini API Key is not configured. Please add it in Profile Settings.");
    }

    // Reuse instance if key hasn't changed
    if (!genAIInstance || currentApiKey !== apiKey) {
        genAIInstance = new GoogleGenAI({ apiKey });
        currentApiKey = apiKey;
    }

    return { genAI: genAIInstance, modelName: modelId };
};

export const isGeminiConfigured = async (): Promise<boolean> => {
    try {
        const { genAI } = await getGeminiClient();
        return !!genAI;
    } catch {
        return false;
    }
};

/**
 * Pricing per 1,000,000 tokens as of Sep 2026.
 * Note: gemini-3.1-pro-preview has tiered pricing above 200k-token prompts
 * ($4.00 in / $18.00 out); the rate below covers the common <=200k case.
 *
 * gemini-3.8-flash is on promotional pricing through Dec 31, 2026
 * (input $0.75 / output $3.75 / cached $0.075); it doubles to $1.50 / $7.50 / $0.15
 * on Jan 1, 2027 - bump the rate below when that date hits.
 *
 * cachedInput is the rate for tokens served from an explicit context cache
 * (genAI.caches.create) - Gemini has consistently priced these at ~25% of
 * the standard input rate across model generations, so it's derived rather
 * than independently sourced per model.
 */
const MODEL_PRICING: { [key: string]: { input: number; output: number; cachedInput: number } } = {
    // Latest Frontier Models
    'gemini-3.8-flash': { input: 0.75, output: 3.75, cachedInput: 0.075 },
    'gemini-3.5-flash': { input: 1.50, output: 9.00, cachedInput: 0.375 },
    'gemini-3.1-pro-preview': { input: 2.00, output: 12.00, cachedInput: 0.50 },
    'gemini-3-flash': { input: 0.50, output: 3.00, cachedInput: 0.125 },

    // Stable High-Efficiency Models
    'gemini-2.5-flash': { input: 0.30, output: 2.50, cachedInput: 0.075 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40, cachedInput: 0.025 },

    // Legacy support
    'gemini-1.5-flash': { input: 0.30, output: 2.50, cachedInput: 0.075 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00, cachedInput: 0.3125 },

    'default': { input: 1.50, output: 9.00, cachedInput: 0.375 } // Default to 3.5-flash pricing
};

// Base tokens for images <= 384px
const TOKENS_PER_IMAGE_BASE = 258;

const calculateImageTokens = (width: number, height: number): number => {
    if (width <= 384 && height <= 384) {
        return TOKENS_PER_IMAGE_BASE;
    }
    const tileWidth = 768;
    const wTiles = Math.ceil(width / tileWidth);
    const hTiles = Math.ceil(height / tileWidth);
    return wTiles * hTiles * TOKENS_PER_IMAGE_BASE;
};

export const estimateTokens = (text: string) => {
    const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    return isJson ? Math.ceil(text.length / 3.2) : Math.ceil(text.length / 4);
};

// Gemini 3.x only accepts thinkingConfig.thinkingLevel; sending it to 2.5/1.5 models is a hard 400 error.
const isGemini3Model = (modelName: string) => modelName.toLowerCase().includes('gemini-3');

export const withThinkingLevel = (modelName: string, level: ThinkingLevel) => {
    return isGemini3Model(modelName) ? { thinkingConfig: { thinkingLevel: level } } : {};
};

interface GeminiUsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
}

export interface LoggedUsage {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    costUSD: BigNumber;
}

export const logUsage = async (endpoint: string, promptText: string, responseText: string, imageTokens: number, imageCount: number, durationMs: number, modelName: string = 'unknown', status: 'success' | 'error' = 'success', usage?: GeminiUsageMetadata, runId?: string): Promise<LoggedUsage> => {
    try {
        // Prefer the API's own token counts (captures thinking tokens); fall back to estimation on error paths.
        const inputTokens = usage?.promptTokenCount ?? (estimateTokens(promptText) + imageTokens);
        const outputTokens = usage
            ? (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)
            : estimateTokens(responseText);

        let pricing = MODEL_PRICING['default'];

        if (status === 'success') {
            const lowerModel = modelName.toLowerCase();
            if (MODEL_PRICING[lowerModel]) {
                pricing = MODEL_PRICING[lowerModel];
            } else {
                if (lowerModel.includes('3.5')) {
                    pricing = MODEL_PRICING['gemini-3.5-flash'];
                }
                else if (lowerModel.includes('3.1')) {
                    pricing = MODEL_PRICING['gemini-3.1-pro-preview'];
                }
                else if (lowerModel.includes('3')) {
                    if (lowerModel.includes('pro')) pricing = MODEL_PRICING['gemini-3.1-pro-preview'];
                    else if (lowerModel.includes('flash')) pricing = MODEL_PRICING['gemini-3-flash'];
                }
                else if (lowerModel.includes('2.5')) {
                    if (lowerModel.includes('lite')) pricing = MODEL_PRICING['gemini-2.5-flash-lite'];
                    else pricing = MODEL_PRICING['gemini-2.5-flash'];
                }
                else if (lowerModel.includes('1.5')) {
                    if (lowerModel.includes('pro')) pricing = MODEL_PRICING['gemini-1.5-pro'];
                    else pricing = MODEL_PRICING['gemini-1.5-flash'];
                }
            }
        }

        // promptTokenCount already includes cached tokens - split it so the cached
        // portion is billed at the discounted rate instead of the full input rate.
        const cachedTokens = Math.min(usage?.cachedContentTokenCount ?? 0, inputTokens);
        const freshInputTokens = inputTokens - cachedTokens;
        const inputCost = (freshInputTokens / 1000000) * pricing.input + (cachedTokens / 1000000) * pricing.cachedInput;
        const outputCost = (outputTokens / 1000000) * pricing.output;
        const totalCost = status === 'error' ? 0 : (inputCost + outputCost);

        const log: AIUsageLog = {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            endpoint,
            provider: 'gemini',
            model: modelName,
            status,
            inputTokens,
            outputTokens,
            imageCount,
            durationMs,
            costUSD: new BigNumber(totalCost),
            runId: runId ?? null,
        };

        await saveAIUsageLog(log);
        return { inputTokens, outputTokens, cachedTokens, costUSD: new BigNumber(totalCost) };
    } catch (e) {
        console.error('Failed to log usage:', e);
        return { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUSD: new BigNumber(0) };
    }
};

const optimizeImage = async (uri: string): Promise<{ uri: string; width: number; height: number }> => {
    try {
        // Enforce 1024px limit as planned
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        return { uri: manipResult.uri, width: manipResult.width, height: manipResult.height };
    } catch (error) {
        console.warn('Image optimization failed, using original:', error);
        return { uri, width: 1024, height: 1024 };
    }
};

// Helper to get category list string
const getCategoryList = () => {
    return EXPENSE_CATEGORIES.map(c => c.value).join(', ');
};

const receiptSchema = {
    type: 'object',
    properties: {
        isValidReceipt: { type: 'boolean' },
        validationError: { type: 'string', nullable: true },
        receiptType: {
            type: 'string',
            enum: ['GROCERY', 'RETAIL', 'RESTAURANT', 'CAFE', 'INVOICE', 'UNKNOWN']
        },
        merchantName: { type: 'string', nullable: true },
        date: { type: 'string', description: 'YYYY-MM-DD', nullable: true },
        totalAmount: { type: 'number', nullable: true },
        totalDiscount: { type: 'number', default: 0 },
        currency: { type: 'string', description: 'ISO 3-letter code (e.g. PHP, USD)', nullable: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    quantity: { type: 'number' },
                    unitPrice: { type: 'number' },
                    amount: { type: 'number' },
                    category: { type: 'string' }
                },
                required: ['description', 'quantity', 'unitPrice', 'amount', 'category']
            }
        },
        confidence: { type: 'number' }
    },
    required: ['isValidReceipt', 'receiptType', 'totalAmount', 'items']
};

/**
 * Analyze a receipt image to extract transaction details.
 */
export const analyzeReceiptImage = async (imageUri: string): Promise<ReceiptAnalysisResult> => {
    const startTime = Date.now();
    let prompt = '';
    let imageTokens = 0;

    const failResult: ReceiptAnalysisResult = { isValidReceipt: false, validationError: "Analysis failed", confidence: 0 };

    const isConfigured = await isGeminiConfigured();
    if (!isConfigured) {
        return { ...failResult, validationError: "Gemini API Key is not configured" };
    }

    try {
        const { uri: optimizedUri, width, height } = await optimizeImage(imageUri);
        imageTokens = calculateImageTokens(width, height);

        const base64Image = await new File(optimizedUri).base64();

        const { genAI, modelName } = await getGeminiClient();

        const categories = getCategoryList();

        prompt = `
You are a receipt parsing assistant for a personal finance app.
Your goal is to extract expenses based on FINAL prices paid by the consumer.

Analyze the image and extract data into a clean, consumer-focused format.

--------------------------------------------------
STEP 1: VALIDATION & RECEIPT TYPE
--------------------------------------------------
- Determine if the image is a receipt, invoice, or bill.
- If it is NOT a receipt-like document, return:
  {
    "isValidReceipt": false,
    "validationError": "<short reason>"
  }
- Infer the receiptType based on merchant name and items:
  - GROCERY, RETAIL, RESTAURANT, CAFE, INVOICE, or UNKNOWN

--------------------------------------------------
STEP 2: EXTRACTION RULES
--------------------------------------------------
Extract:
- Merchant Name
- Date (YYYY-MM-DD if possible)
- Currency (ISO code if possible)
- Total Amount (the FINAL amount paid, not tendered)

ITEMS LIST:
- Capture only physical goods or services purchased.

TAX HANDLING:
- Assume item prices are tax-inclusive by default.
- Ignore VAT, GST, or Sales Tax line items.
- ONLY include tax if item prices clearly exclude it (mostly invoices).

SERVICE CHARGE HANDLING:
- If receiptType is RESTAURANT or CAFE:
  - If a service charge is listed:
    - Extract it as a separate item:
      - description: "Service Charge"
      - quantity: 1
      - unitPrice = amount
      - amount = amount
      - category: "Dining" or closest match
- If receiptType is GROCERY or RETAIL:
  - Ignore service charges unless explicitly mandatory and large.

DISCOUNTS:
- Item-level discounts:
  - Use FINAL discounted price.
  - Do NOT list discounts as separate items.
- Global discounts (Senior, PWD, Subtotal Discount):
  - Extract into "totalDiscount".
  - Do NOT add as an item.
  - If unsure, treat as global.

WEIGHTED ITEMS:
- Include weight in description.
- quantity = 1
- unitPrice = final line amount.

PAYMENT & CHANGE HANDLING (CRITICAL):
- Ignore payment-related lines such as:
  - Cash, Cash Tendered, Amount Tendered
  - Change, Change Due
  - Card Payment, Debit, Credit, GCash, Maya
- These are NOT expenses and must NOT be extracted as items or discounts.
- totalAmount must reflect the receipt TOTAL, not the tendered amount.

--------------------------------------------------
STEP 3: CATEGORIZATION
--------------------------------------------------
- Assign each item to ONE of the following categories:
[${categories}]
- If uncertain, use "Uncategorized" or "Others".

--------------------------------------------------
STEP 4: DATA INTEGRITY
--------------------------------------------------
- Item amounts reflect FINAL prices paid.
- totalDiscount includes ONLY global discounts.
- totalAmount must match the final payable amount.
- Small rounding differences are acceptable.
- Rounding/Adjustments: If there is a small "Round Off" or "Adjustment" line at the bottom, you may ignore it or fold it into the largest item's price to ensure the totalAmount is mathematically correct.
- DO NOT invent items to force a match.
`;

        const response = await genAI.models.generateContent({
            model: modelName,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseJsonSchema: receiptSchema,
                // Extraction task with well-defined rules - doesn't need deep reasoning.
                ...withThinkingLevel(modelName, ThinkingLevel.LOW),
            },
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Image,
                            }
                        }
                    ]
                }
            ]
        });

        const text = response.text ? response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() : '';

        await logUsage('analyzeReceiptImage', prompt, text, imageTokens, 1, Date.now() - startTime, modelName, 'success', response.usageMetadata);

        try {
            const parsedResult = JSON.parse(text);

            // Handle Total Discount as an Item
            if (parsedResult.totalDiscount && parsedResult.totalDiscount > 0) {
                if (!parsedResult.items) parsedResult.items = [];
                parsedResult.items.push({
                    description: "Total Discount",
                    quantity: 1,
                    unitPrice: -Math.abs(parsedResult.totalDiscount),
                    amount: -Math.abs(parsedResult.totalDiscount),
                    category: "Others"
                });
            }

            return parsedResult;
        } catch {
            console.error("Failed to parse JSON from Gemini:", text);
            return { ...failResult, validationError: "Failed to parse AI response" };
        }

    } catch (error) {
        console.error('Error analyzing receipt:', error);
        await logUsage('analyzeReceiptImage', prompt, '', imageTokens, 1, Date.now() - startTime, 'unknown', 'error');
        return { ...failResult, validationError: "Network or API error" };
    }
};

/**
 * Fetch historical prices for a list of symbols using Gemini.
 * NOTE: This relies on the AI's knowledge base and may not be 100% accurate for real-time or very specific historical data without external tools.
 */
export interface AssetRequest {
    symbol: string;
    exchange?: string;
}

export interface FetchedPrice {
    symbol: string;
    price: number;
    currency: string;
    date: string; // YYYY-MM-DD
    high?: number;
    low?: number;
    volume?: number;
}

const assetPriceSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            symbol: { type: 'string', description: 'The asset ticker (e.g. AREIT, BTC)' },
            price: { description: 'Daily closing price' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. PHP, USD)' },
            date: { type: 'string', description: 'ISO 8601 format (YYYY-MM-DD)' },
            high: { type: 'number', nullable: true },
            low: { type: 'number', nullable: true },
            volume: { type: 'number', nullable: true }
        },
        required: ['symbol', 'price', 'currency', 'date']
    }
};

const MARKET_FETCH_THINKING = ThinkingLevel.MEDIUM;
// Caps simultaneous per-symbol requests so a large portfolio doesn't trip the API's rate limit.
const MARKET_FETCH_CONCURRENCY = 6;

const assetLabel = (a: AssetRequest) => `${a.exchange ? a.exchange.toUpperCase() : 'PSE'}:${a.symbol.toUpperCase()}`;

// Search grounding can drop the start of a JSON reply; fall back to the outermost [...] in the text.
const parseJsonArray = <T>(text: string): T[] => {
    try {
        return JSON.parse(text);
    } catch {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start === -1 || end <= start) throw new Error('No JSON array in reply');
        return JSON.parse(text.slice(start, end + 1));
    }
};

// One request per symbol, run in parallel: each searches and returns JSON in a single call. Every call logs as it
// finishes under one runId, timed from the run's start, so the usage screen shows the whole fetch as one row.
const fetchPerSymbol = async <T extends { symbol: string }>(
    endpoint: string,
    assets: AssetRequest[],
    schema: object,
    buildPrompt: (asset: AssetRequest, label: string, today: string) => string,
): Promise<T[]> => {
    const isConfigured = await isGeminiConfigured();
    if (!isConfigured) throw new Error("Gemini API Key is not configured");

    const startTime = Date.now();
    const { genAI, modelName } = await getGeminiClient();
    // Before Gemini 3 a request can't combine search with a JSON schema, so those models get the format in the prompt.
    const jsonConfig = isGemini3Model(modelName) ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {};
    const today = new Date().toISOString().split('T')[0];
    const runId = generateUUID();
    const results: T[] = [];
    let failed = 0;

    const fetchOne = async (asset: AssetRequest) => {
        const label = assetLabel(asset);
        const prompt = buildPrompt(asset, label, today);
        try {
            const response = await genAI.models.generateContent({
                model: modelName,
                config: {
                    tools: [{ googleSearch: {} }],
                    ...jsonConfig,
                    ...withThinkingLevel(modelName, MARKET_FETCH_THINKING),
                },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            const text = response.text || '[]';
            await logUsage(endpoint, prompt, text, 0, 0, Date.now() - startTime, modelName, 'success', response.usageMetadata, runId);

            // Pin the symbol to what was asked, in case the model wrote e.g. "BTC-USD".
            const parsed = parseJsonArray<T>(text).map(item => ({ ...item, symbol: asset.symbol }));
            if (parsed.length === 0) console.warn(`[Gemini] ${endpoint}: nothing found for ${label}`);
            results.push(...parsed);
        } catch (error) {
            console.warn(`[Gemini] ${endpoint} failed for ${label}`, error);
            failed++;
            const message = error instanceof Error ? error.message : String(error);
            await logUsage(endpoint, message, '', 0, 0, Date.now() - startTime, modelName, 'error', undefined, runId);
        }
    };

    const queue = [...assets];
    await Promise.all(Array.from({ length: Math.min(MARKET_FETCH_CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await fetchOne(next);
    }));

    // Every call failing (bad key, quota, offline) is an error, not "nothing found".
    if (assets.length > 0 && failed === assets.length) throw new Error(`${endpoint}: every request failed`);
    return results;
};

export const fetchHistoricalPrices = (assets: AssetRequest[], duration: string): Promise<FetchedPrice[]> =>
    fetchPerSymbol<FetchedPrice>('fetchHistoricalPrices', assets, assetPriceSchema, (asset, label, today) => `
Retrieve historical daily closing prices for ${label}.

Duration: ${duration}
Today (UTC): ${today}

RULES:
- Use real historical market data only. Do NOT fabricate or estimate prices; leave a day out instead.
- Every price MUST include its currency (ISO 4217): PSE stocks → PHP, US stocks → USD, crypto → USD unless the exchange says otherwise.
- Stocks: only official exchange trading days. Crypto: every calendar day (24/7 markets).
- Prefer reputable sources (Yahoo Finance, exchange data, CoinMarketCap, CoinGecko).

OUTPUT:
- Only a JSON array of objects with: symbol, price, currency, date, high, low, volume. No other text.
- symbol must be "${asset.symbol.toUpperCase()}". Dates in YYYY-MM-DD. Prices numeric.
- If high, low or volume are unavailable, set them to null.
- Return an empty array if you can't find any real prices.
`);

export interface FetchedDividend {
    symbol: string;
    exDate: string;
    paymentDate?: string;
    recordDate?: string;
    amount: number;
    type: 'CASH' | 'STOCK' | 'SPECIAL' | 'PROPERTY';
}

const dividendHistorySchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            symbol: { type: 'string', description: 'The stock ticker symbol (e.g. DMC)' },
            exDate: { type: 'string', description: 'The Ex-Dividend Date (YYYY-MM-DD)', nullable: true },
            paymentDate: { type: 'string', description: 'The date the dividend is paid (YYYY-MM-DD)', nullable: true },
            recordDate: { type: 'string', description: 'The date of record (YYYY-MM-DD)', nullable: true },
            amount: { type: 'number', description: 'The dividend amount per share in local currency' },
            type: {
                type: 'string',
                enum: ['CASH', 'STOCK', 'SPECIAL'],
                description: 'The type of dividend declaration'
            }
        },
        required: ['symbol', 'exDate', 'amount', 'type']
    }
};

export const fetchDividendHistory = (assets: AssetRequest[], duration: string): Promise<FetchedDividend[]> =>
    fetchPerSymbol<FetchedDividend>('fetchDividendHistory', assets, dividendHistorySchema, (asset, label, today) => `
Retrieve the dividend history for ${label}.

Duration: ${duration}
Today (UTC): ${today}

RULES:
- Use real, officially declared dividends only. Do NOT fabricate or estimate; leave a dividend out instead.
- amount is per share, in the stock's local currency (e.g. PHP for PSE).
- type is CASH, STOCK or SPECIAL, as declared.
- Prefer reputable sources (exchange disclosures, company announcements, Yahoo Finance).

OUTPUT:
- Only a JSON array of objects with: symbol, exDate, recordDate, paymentDate, amount, type. No other text.
- symbol must be "${asset.symbol.toUpperCase()}". Dates in YYYY-MM-DD; set recordDate or paymentDate to null if unknown.
- Return an empty array if there were no dividends in that period.
`);