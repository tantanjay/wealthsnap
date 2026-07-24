import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'FX_RATE_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours for current rates

interface CachedRate {
    rate: number;
    timestamp: number;
}

/**
 * Fetch exchange rate from Base to Target currency.
 * Supports current and historical rates.
 * 
 * @param base Base currency (e.g. 'USD')
 * @param target Target currency (e.g. 'PHP')
 * @param date (Optional) YYYY-MM-DD for historical rates. If omitted, fetches latest.
 * @returns Exchange rate as a number
 */
export const fetchExchangeRate = async (base: string, target: string, date?: string): Promise<number | null> => {
    if (base === target) return 1;

    const cacheKey = `${CACHE_PREFIX}${base}_${target}_${date || 'LATEST'}`;

    // 1. Check Cache
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const data: CachedRate = JSON.parse(cached);

            // For historical dates, cache is valid indefinitely (rates shouldn't change).
            // For latest rates, check expiry.
            if (date || (Date.now() - data.timestamp < CACHE_EXPIRY_MS)) {
                return data.rate;
            }
        }
    } catch (e) {
        console.warn('[CurrencyService] Cache read failed', e);
    }

    // 2. Fetch from API
    try {
        const baseUrl = 'https://api.frankfurter.dev/v1';
        const datePath = date || 'latest';
        const url = `${baseUrl}/${datePath}?base=${base}&symbols=${target}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.rates && typeof data.rates[target] === 'number') {
            const rate = data.rates[target];

            // 3. Save to Cache
            const cacheData: CachedRate = {
                rate,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

            return rate;
        }
    } catch (error) {
        console.error(`[CurrencyService] Failed to fetch rate for ${base}->${target} (${date})`, error);
    }

    return null;
};
