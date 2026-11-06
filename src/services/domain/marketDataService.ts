
import { fetchExchangeRate } from '@services/integrations/currencyService';
import { AssetRequest, FetchedPrice, fetchHistoricalPrices as fetchGeminiPrices, fetchDividendHistory as fetchGeminiDividends } from '@services/integrations/geminiService';
import { addPriceHistory, updatePriceHistory, getPriceHistory } from '@services/domain/priceHistoryService';
import { addDividendHistory, updateDividendHistory, getDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { BigNumber } from 'bignumber.js';
import { BackgroundTaskTone, finishBackgroundTask, isBackgroundTaskRunning, showBackgroundTask, startBackgroundTask } from '@services/core/backgroundTaskService';

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
            // Same ex-date and type: a regular and a special dividend can share an ex-date and stay separate rows.
            const history = await getDividendHistory(d.symbol);
            const existing = history.find(curr =>
                curr.source === 'AI_FETCH' &&
                curr.type === d.type &&
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
                    // Deterministic so a concurrent fetch of the same dividend replaces this row instead of adding one.
                    id: `AI_${d.symbol}_${d.exDate.slice(0, 10)}_${d.type}`,
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

const FETCH_DURATIONS: Record<string, string> = {
    'Today': 'Today',
    'Last 3 days': 'Last 3 days',
};

interface HoldingsFetchJob {
    taskId: string;
    // Plural noun for messages: "prices", "dividends".
    noun: string;
    // Shown in the banner, e.g. "Last 3 days" or "This year".
    durationLabel: string;
    isFetchable: (type?: string) => boolean;
    // What to say when no holding qualifies.
    noneMessage: string;
    fetch: (requests: AssetRequest[]) => Promise<number>;
}

// Shared by the "Fetch … list" actions: one banner task per kind, one fetch of that kind at a time.
const runHoldingsFetch = async (
    job: HoldingsFetchJob,
    holdings: { symbol: string; type?: string }[],
    notify: (message: string) => void,
    onUpdated: () => void,
): Promise<void> => {
    if (isBackgroundTaskRunning(job.taskId)) {
        // Brings back a banner the user hid, so the tap still visibly answers (notify is Android-only).
        showBackgroundTask(job.taskId);
        notify(`A ${job.noun.replace(/s$/, '')} fetch is already running.`);
        return;
    }
    const fetchable = holdings.filter(h => job.isFetchable(h.type));
    if (fetchable.length === 0) {
        notify(job.noneMessage);
        return;
    }

    const finish = (tone: BackgroundTaskTone, message: string) => {
        finishBackgroundTask(job.taskId, tone, message);
        notify(message);
    };

    const count = `${fetchable.length} ${fetchable.length === 1 ? 'holding' : 'holdings'}`;
    startBackgroundTask(job.taskId, `Fetching ${job.noun} · ${job.durationLabel}`, `${count} · can take a few minutes`);
    try {
        const allAssets = await getAllAssets();
        const requests: AssetRequest[] = fetchable.map(h => ({
            symbol: h.symbol,
            exchange: requestExchange(allAssets.find(a => a.symbol === h.symbol)?.exchange, h.type),
        }));

        const savedCount = await job.fetch(requests);
        if (savedCount > 0) {
            finish('success', `Updated ${savedCount} ${job.noun}.`);
            onUpdated();
        } else {
            finish('info', `No new ${job.noun} to update.`);
        }
    } catch (err) {
        console.error(`Bulk ${job.noun} fetch failed`, err);
        finish('error', `Failed to fetch ${job.noun}.`);
    }
};

// The AI prompt prices "CRYPTO:<coin>" in USD on a 24/7 calendar, so crypto without an exchange gets that one.
export const requestExchange = (exchange?: string, type?: string) => exchange || (type === 'CRYPTO' ? 'CRYPTO' : 'Unknown');

const isStock = (type?: string) => type === 'STOCKS' || type === 'STOCK';

// "Fetch price list": every stock and crypto holding; progress shows in the app-wide banner, `notify` adds a toast.
export const refreshHoldingPrices = (
    holdings: { symbol: string; type?: string }[],
    durationLabel: string,
    targetCurrency: string,
    notify: (message: string) => void,
    onUpdated: () => void,
): Promise<void> => runHoldingsFetch({
    taskId: 'price-fetch',
    noun: 'prices',
    durationLabel,
    isFetchable: type => isStock(type) || type === 'CRYPTO',
    noneMessage: 'No stock or crypto holdings to fetch prices for.',
    fetch: requests => refreshAssetPrices(requests, FETCH_DURATIONS[durationLabel] || 'Last 7 days', targetCurrency),
}, holdings, notify, onUpdated);

// Dividend list options: the label shown, and the start year sent to the AI.
export const getDividendListRanges = () => {
    const year = new Date().getFullYear();
    return [
        { label: 'This year', year },
        { label: `Since ${year - 1}`, year: year - 1 },
        { label: `Since ${year - 2}`, year: year - 2 },
    ];
};

// "Fetch dividend list": every stock holding, from January 1 of the chosen year.
export const refreshHoldingDividends = (
    holdings: { symbol: string; type?: string }[],
    range: { label: string; year: number },
    notify: (message: string) => void,
    onUpdated: () => void,
): Promise<void> => runHoldingsFetch({
    taskId: 'dividend-fetch',
    noun: 'dividends',
    durationLabel: range.label,
    isFetchable: isStock,
    noneMessage: 'No stock holdings to fetch dividends for.',
    // Same wording as a single holding's dividend fetch.
    fetch: requests => refreshAssetDividends(requests, `From January 1, ${range.year} to Present`),
}, holdings, notify, onUpdated);
