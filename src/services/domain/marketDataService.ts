
import { fetchExchangeRate } from '@services/integrations/currencyService';
import { AssetRequest, FetchedPrice, fetchHistoricalPrices as fetchGeminiPrices, fetchDividendHistory as fetchGeminiDividends } from '@services/integrations/geminiService';
import { addPriceHistory, updatePriceHistory, getPriceHistory } from '@services/domain/priceHistoryService';
import { addDividendHistory, updateDividendHistory, getDividendHistory } from '@services/domain/dividendHistoryService';
import { BigNumber } from 'bignumber.js';

/**
 * Orchestrates fetching market data and handles currency conversion.
 */
export const refreshAssetPrices = async (assets: AssetRequest[], duration: string, targetCurrency: string): Promise<number> => {
    // 1. Fetch raw data from Gemini (or other providers)
    // Prices returned might be in various currencies (e.g. USD, PHP)
    const rawPrices: FetchedPrice[] = await fetchGeminiPrices(assets, duration);
    let savedCount = 0;

    for (const p of rawPrices) {
        try {
            let finalPrice = new BigNumber(p.price);
            let finalHigh = p.high ? new BigNumber(p.high) : undefined;
            let finalLow = p.low ? new BigNumber(p.low) : undefined;
            let exchangeRate = new BigNumber(1);
            let sourceCurrency = p.currency || targetCurrency;

            // 2. Currency Conversion
            if (sourceCurrency !== targetCurrency) {
                // Fetch rate for the specific date
                const rate = await fetchExchangeRate(sourceCurrency, targetCurrency, p.date);

                if (rate) {
                    exchangeRate = new BigNumber(rate);
                    finalPrice = finalPrice.multipliedBy(exchangeRate);
                    if (finalHigh) finalHigh = finalHigh.multipliedBy(exchangeRate);
                    if (finalLow) finalLow = finalLow.multipliedBy(exchangeRate);
                } else {
                    // Can't convert to the profile currency - skip this point rather than
                    // saving/overwriting with an unconverted price mislabeled as targetCurrency.
                    console.warn(`[MarketDataService] Missing exchange rate for ${sourceCurrency}->${targetCurrency} on ${p.date}. Skipping this price point.`);
                    continue;
                }
            }

            // 3. Save to Database
            const existingHistory = await getPriceHistory(p.symbol);
            const existing = existingHistory.find(eh => eh.timestamp.startsWith(p.date));

            if (existing) {
                if (existing.source === 'AI_FETCH') {
                    await updatePriceHistory(existing.id, finalPrice, {
                        high: finalHigh,
                        low: finalLow,
                        volume: p.volume ? new BigNumber(p.volume) : undefined,
                        timestamp: existing.timestamp,
                        source: 'AI_FETCH',
                        currency: targetCurrency, // Storing in Profile Currency
                        exchangeRate: exchangeRate
                    });
                    savedCount++;
                }
            } else {
                // Deterministic id (instead of a random UUID) so concurrent refreshes for the
                // same symbol+date collide on the primary key and INSERT OR REPLACE naturally
                // collapses them into one row, instead of the check-then-act read above racing
                // into two rows.
                await addPriceHistory(p.symbol, finalPrice, {
                    id: `AI_${p.symbol}_${p.date}`,
                    high: finalHigh,
                    low: finalLow,
                    volume: p.volume ? new BigNumber(p.volume) : undefined,
                    timestamp: p.date,
                    source: 'AI_FETCH',
                    currency: targetCurrency, // Storing in Profile Currency
                    exchangeRate: exchangeRate
                });
                savedCount++;
            }
        } catch (e) {
            console.error(`[MarketDataService] Error processing price for ${p.symbol}`, e);
        }
    }

    return savedCount;
};

export const refreshAssetDividends = async (assets: AssetRequest[], duration: string): Promise<number> => {
    const dividends = await fetchGeminiDividends(assets, duration);
    let savedCount = 0;

    for (const d of dividends) {
        try {
            // Check for existing AI_FETCH record (match exDate YYYY-MM-DD or ISO start)
            const history = await getDividendHistory(d.symbol);
            const existing = history.find(curr =>
                curr.source === 'AI_FETCH' &&
                (curr.exDate === d.exDate || curr.exDate.startsWith(d.exDate))
            );

            if (existing) {
                await updateDividendHistory(existing.id, {
                    symbol: d.symbol,
                    exDate: d.exDate,
                    paymentDate: d.paymentDate,
                    recordDate: d.recordDate,
                    amount: new BigNumber(d.amount),
                    type: d.type,
                    status: 'PAID',
                    source: 'AI_FETCH'
                });
            } else {
                await addDividendHistory({
                    symbol: d.symbol,
                    exDate: d.exDate,
                    paymentDate: d.paymentDate,
                    recordDate: d.recordDate,
                    amount: new BigNumber(d.amount),
                    type: d.type,
                    status: 'PAID',
                    source: 'AI_FETCH'
                });
            }
            savedCount++;
        } catch (e) {
            console.error(`[MarketDataService] Error processing dividend for ${d.symbol}`, e);
        }
    }
    return savedCount;
};
