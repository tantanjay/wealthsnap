import { BigNumber } from 'bignumber.js';
import { GoogleGenAI } from '@google/genai';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import { AIUsageLog, ReceiptAnalysisResult } from '@types';
import { getAIConfig } from '@services/core/storageService';
import { generateUUID } from '@utils/uuid';
import { saveAIUsageLog } from '@services/domain/logService';
import { EXPENSE_CATEGORIES } from '@constants/categories';

// Dynamic Configuration
let genAIInstance: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

const getGeminiClient = async () => {
    // 1. Try Storage
    const config = await getAIConfig();
    let apiKey = config?.apiKey;
    // Default to gemini-2.5-flash
    let modelId = config?.modelId || 'gemini-2.5-flash';

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
 * Pricing per 1,000,000 tokens as of Jan 2026.
 */
const MODEL_PRICING: { [key: string]: { input: number; output: number } } = {
    // Latest Frontier Models
    'gemini-3-pro-preview': { input: 2.00, output: 12.00 },
    'gemini-3-flash': { input: 0.50, output: 3.00 },

    // Stable High-Efficiency Models
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },

    // Legacy support
    'gemini-1.5-flash': { input: 0.30, output: 2.50 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },

    'default': { input: 0.30, output: 2.50 } // Default to 2.5-flash pricing
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

const estimateTokens = (text: string) => {
    const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    return isJson ? Math.ceil(text.length / 3.2) : Math.ceil(text.length / 4);
};

const logUsage = async (endpoint: string, promptText: string, responseText: string, imageTokens: number, imageCount: number, durationMs: number, modelName: string = 'unknown', status: 'success' | 'error' = 'success') => {
    try {
        const inputTokens = estimateTokens(promptText) + imageTokens;
        const outputTokens = estimateTokens(responseText);

        let pricing = MODEL_PRICING['default'];

        if (status === 'success') {
            const lowerModel = modelName.toLowerCase();
            if (MODEL_PRICING[lowerModel]) {
                pricing = MODEL_PRICING[lowerModel];
            } else {
                if (lowerModel.includes('3')) {
                    if (lowerModel.includes('pro')) pricing = MODEL_PRICING['gemini-3-pro-preview'];
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

        const inputCost = (inputTokens / 1000000) * pricing.input;
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
            costUSD: new BigNumber(totalCost)
        };

        await saveAIUsageLog(log);
    } catch (e) {
        console.error('Failed to log usage:', e);
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

        const base64Image = await FileSystem.readAsStringAsync(optimizedUri, {
            encoding: 'base64',
        });

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

        await logUsage('analyzeReceiptImage', prompt, text, imageTokens, 1, Date.now() - startTime, modelName, 'success');

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

export const fetchHistoricalPrices = async (assets: AssetRequest[], duration: string): Promise<FetchedPrice[]> => {
    const startTime = Date.now();
    let currentModelName = 'unknown';

    const isConfigured = await isGeminiConfigured();
    if (!isConfigured) throw new Error("Gemini API Key is not configured");

    try {
        const { genAI, modelName } = await getGeminiClient();
        currentModelName = modelName;

        const assetList = assets.map(a => {
            const symbol = a.symbol.toUpperCase();
            const exchange = a.exchange ? a.exchange.toUpperCase() : 'PSE';
            return `${exchange}:${symbol}`;
        }).join(', ');

        // --- PASS 1: THE RESEARCHER (Search Enabled, No Schema) ---
        const researchPrompt = `
Retrieve historical daily prices for the following assets:

Assets:
${assetList}

Duration: ${duration}
Today (UTC): ${new Date().toISOString().split('T')[0]}

RULES:
- Every price MUST include its currency (ISO 4217).
- Examples:
  - PSE stocks → PHP
  - US stocks → USD
  - Crypto → USD unless exchange specifies otherwise
- Use real historical market data only.
- Do NOT fabricate or estimate prices.
- Stocks: include only official exchange trading days.
- Crypto: include all calendar days (24/7 markets).
- Clearly label each entry with:
  - Symbol
  - Exchange
  - Date (YYYY-MM-DD)
  - Closing price
  - Currency
- Prefer reputable sources (Yahoo Finance, exchange data, CoinMarketCap, CoinGecko).

Output format:
A simple, line-by-line list. No commentary.
`;

        const researchResponse = await genAI.models.generateContent({
            model: currentModelName,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 1.0, // Higher temp helps synthesize search results better
            },
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }]
        });

        const rawResearchText = researchResponse.text || '';

        await logUsage('fetchHistoricalPrices_Research', researchPrompt, rawResearchText, 0, 0, Date.now() - startTime, modelName, 'success');

        // --- PASS 2: THE ACCOUNTANT (No Tools, Strict Schema Enabled) ---
        const formatPrompt = `
Transform the following research data into valid JSON
matching the provided schema.

RESEARCH DATA:
${rawResearchText}

STRICT RULES:
- Do NOT infer or guess currency.
- If currency is missing, EXCLUDE the entry.
- Currency must be a valid ISO 4217 code (e.g. USD, PHP).
- Do NOT invent missing values.
- Exclude entries with missing prices or dates.
- Symbols must be tickers only (e.g. "AREIT", "BTC").
- Dates must be in YYYY-MM-DD format.
- Prices must be numeric.
- If high, low, or volume are unavailable, set them to null.
`;
        const formatResponse = await genAI.models.generateContent({
            model: currentModelName,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseJsonSchema: assetPriceSchema,
            },
            contents: [{ role: 'user', parts: [{ text: formatPrompt }] }]
        });

        const finalJson = formatResponse.text || '[]';
        const parsed: FetchedPrice[] = JSON.parse(finalJson);

        await logUsage('fetchHistoricalPrices_Accountant', formatPrompt, finalJson, 0, 0, Date.now() - startTime, modelName, 'success');

        return parsed;

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logUsage('fetchHistoricalPrices', message, '', 0, 0, Date.now() - startTime, currentModelName, 'error');
        return [];
    }
};

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

export const fetchDividendHistory = async (assets: AssetRequest[], duration: string): Promise<FetchedDividend[]> => {
    const startTime = Date.now();
    let currentModelName = 'unknown';

    try {
        const { genAI, modelName } = await getGeminiClient();
        currentModelName = modelName;

        const assetList = assets.map(a => {
            const symbol = a.symbol.toUpperCase();
            const exchange = a.exchange ? a.exchange.toUpperCase() : 'PSE';
            return `${exchange}:${symbol}`;
        }).join(', ');

        // --- PASS 1: THE RESEARCHER (Plain Text + Search) ---
        const researchPrompt = `Find the dividend history for: [${assetList}]. 
        Duration: ${duration}. Focus on Ex-Date, Record Date, and Amount in local currency (e.g. PHP for PSE). 
        Provide the raw results in text.`;

        const researchResponse = await genAI.models.generateContent({
            model: currentModelName,
            config: { tools: [{ googleSearch: {} }] }, // Tools allowed here
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }]
        });

        const rawResearchText = researchResponse.text || '';

        await logUsage('fetchDividendHistory_Research', researchPrompt, rawResearchText, 0, 0, Date.now() - startTime, modelName, 'success');

        // --- PASS 2: THE ACCOUNTANT (Strict JSON + No Tools) ---
        const accountantPrompt = `Convert this raw financial research into a structured JSON list:
        
        RESEARCH DATA:
        ${rawResearchText}

        RULES:
        - Use ONLY the following JSON Schema.
        - Ticker symbols only (e.g., "DMC").
        - Dates in YYYY-MM-DD.`;

        const extractionResponse = await genAI.models.generateContent({
            model: currentModelName,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: dividendHistorySchema,
            },
            contents: [{ role: 'user', parts: [{ text: accountantPrompt }] }]
        });

        const finalJson = extractionResponse.text || '[]';
        const parsed: FetchedDividend[] = JSON.parse(finalJson);

        await logUsage('fetchDividendHistory_Accountant', accountantPrompt, finalJson, 0, 0, Date.now() - startTime, modelName, 'success');

        return parsed;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await logUsage('fetchDividendHistory', message, '', 0, 0, Date.now() - startTime, currentModelName, 'error');
        return [];
    }
};