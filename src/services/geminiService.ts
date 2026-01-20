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
    // Default to gemini-2.5-flash as requested
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
    } catch (e) {
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
        console.log(`[AI Usage] ${endpoint} (${modelName}): ${durationMs}ms, $${totalCost.toFixed(6)}`);
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

    try {
        const { uri: optimizedUri, width, height } = await optimizeImage(imageUri);
        imageTokens = calculateImageTokens(width, height);

        const base64Image = await FileSystem.readAsStringAsync(optimizedUri, {
            encoding: 'base64',
        });

        const { genAI, modelName } = await getGeminiClient();
        const model = genAI.getGenerativeModel({ model: modelName });

        const categories = getCategoryList();

        prompt = `Analyze this image to determine if it is a valid receipt, invoice, or bill.
        
        Step 1: VALIDATION
        - Is this image a receipt, bill, or invoice?
        - If NOT (e.g., photo of food, a person, a random object), set "isValidReceipt" to false and provide a reason in "validationError". Stop processing.

        Step 2: EXTRACTION (only if valid)
        - Merchant/Vendor Name
        - Date (YYYY-MM-DD format if possible)
        - Total Amount (The final amount paid)
        - Currency Code (e.g., USD, PHP, JPY)
        - List of items:
            - Description: Name of the item.
            - Quantity: Count of items. Default to 1 if not specified.
            - Unit Price: Price per individual item.
            - Amount: Total price for this line item (Quantity * Unit Price).
        
        Special Rules for Items:
        - Weighted Items: If an item is sold by weight (e.g., 0.5kg @ $10/kg), set "quantity" to 1, "unitPrice" to the final line amount, and include the weight in the "description" (e.g., "Apples (0.5kg)").
        - Discounts/Tax: If there are line-item discounts or taxes, treat them as separate items.
        
        Step 3: CATEGORIZATION
        - For each extracted item, link it to one of the following exact categories:
        [${categories}]
        - If the item doesn't fit well, use "Uncategorized" or "Others".

        Step 4: BALANCING
        - Verify that the Sum of all Item Amounts ≈ Total Amount.
        - If there is a discrepancy, check if a Tax or Service Charge was missed and add it as an item.

        Return ONLY a JSON object:
        {
          "isValidReceipt": boolean,
          "validationError": string (optional, if invalid),
          "merchantName": string (optional),
          "date": string (optional),
          "totalAmount": number (optional),
          "currency": string (optional),
          "items": [
            { 
               "description": string, 
               "quantity": number, 
               "unitPrice": number, 
               "amount": number, 
               "category": string 
            }
          ],
          "confidence": number (0-100)
        }`;

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
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", text);
            return { ...failResult, validationError: "Failed to parse AI response" };
        }

    } catch (error) {
        console.error('Error analyzing receipt:', error);
        await logUsage('analyzeReceiptImage', prompt, '', imageTokens, 1, Date.now() - startTime, 'unknown', 'error');
        return { ...failResult, validationError: "Network or API error" };
    }
};
