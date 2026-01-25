import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIUsageLog, ReceiptAnalysisResult } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { saveAIUsageLog, getAIConfig } from './storageService';
import { EXPENSE_CATEGORIES } from '../constants/categories';

// Dynamic Configuration
let genAIInstance: GoogleGenerativeAI | null = null;
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
        genAIInstance = new GoogleGenerativeAI(apiKey);
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
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            endpoint,
            provider: 'gemini',
            model: modelName,
            status,
            inputTokens,
            outputTokens,
            imageCount,
            durationMs,
            costUSD: totalCost
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

/**
 * Analyze a receipt image to extract transaction details.
 */
export const analyzeReceiptImage = async (imageUri: string): Promise<ReceiptAnalysisResult> => {
    const startTime = Date.now();
    let prompt = '';
    let imageTokens = 0;

    // Default error result
    const failResult: ReceiptAnalysisResult = { isValidReceipt: false, validationError: "Analysis failed", confidence: 0 };

    // 1. Check Configuration First - Fail fast before doing any heavy lifting
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

        // 1. Initialize the model with thinking configuration
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                // THE "STRICT ACCOUNTANT" SETTINGS
                temperature: 0.1, // No randomness
                topP: 0.1, // Stay within the highest confidence
                topK: 1, // Pick only the best match
                responseMimeType: "application/json",
            }
        });

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

--------------------------------------------------
RETURN FORMAT (JSON ONLY)
--------------------------------------------------
{
  "isValidReceipt": boolean,
  "validationError": string | null,
  "receiptType": "GROCERY" | "RETAIL" | "RESTAURANT" | "CAFE" | "INVOICE" | "UNKNOWN",
  "merchantName": string | null,
  "date": string | null,
  "totalAmount": number | null,
  "totalDiscount": number | 0,
  "currency": string | null,
  "items": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "amount": number,
      "category": string
    }
  ],
  "confidence": number
}
`;


        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

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
