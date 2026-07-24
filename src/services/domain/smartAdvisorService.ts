import { Suggestion } from '@components/investments/SmartAdvisor';
import { getLatestPrices, getPriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { getPortfolioHoldings } from '@services/domain/investmentService';

export type Priority = 'div' | 'crash' | 'balance' | 'all';

/**
 * Manual entries store exDate as a full ISO timestamp; AI-fetched entries store a bare
 * YYYY-MM-DD string, which JS parses as UTC midnight - comparing that against a local `now`
 * Date can miss a dividend whose ex-date is literally today. Same bug class as
 * dividendHistoryService.ts's getExDateYearMonth(); read the calendar components directly
 * for the bare-date case instead of letting JS reinterpret it as a UTC instant.
 */
const parseExDateLocal = (exDate: string): Date => {
    const bareDateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(exDate);
    if (bareDateMatch) {
        return new Date(Number(bareDateMatch[1]), Number(bareDateMatch[2]) - 1, Number(bareDateMatch[3]));
    }
    return new Date(exDate);
};

export const getSmartSuggestions = async (priority: Priority = 'all'): Promise<Suggestion[]> => {
    try {
        const assets = await getAllAssets();
        const holdings = await getPortfolioHoldings();
        const latestPricesRecord = await getLatestPrices(assets.map(a => a.symbol));

        const suggestions: Suggestion[] = [];

        // All stock-type assets (owned or not) - used by the Balance section below so it can
        // suggest sectors the user doesn't currently hold anything in.
        const stockAssets = assets.filter(asset => {
            const isStock = asset.type && (
                asset.type.toUpperCase() === 'STOCK' ||
                asset.type.toUpperCase() === 'STOCKS'
            );
            return isStock;
        });

        // Held stocks only - used by Crash/Dip/Dividend, which only make sense for positions
        // the user actually holds.
        const analysisAssets = stockAssets.filter(asset => holdings.some(h => h.symbol === asset.symbol));
        if (priority === 'all' || priority === 'crash') {
            for (const asset of analysisAssets) {
                // Check recent price history (last 30 days)
                const history = await getPriceHistory(asset.symbol,
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                );

                if (history.length === 0) continue;

                const currentPrice = latestPricesRecord[asset.symbol]?.price?.toNumber() || 0;
                if (!currentPrice) continue;

                // Find 30-day high
                let high30 = 0;
                history.forEach(h => { if (h.price.toNumber() > high30) high30 = h.price.toNumber(); });

                // No valid positive price in the window (bad data row) - can't compute a
                // meaningful drop, so skip rather than divide by zero.
                if (high30 <= 0) continue;

                // Calculate Drop
                const drop = (currentPrice - high30) / high30; // e.g., -0.15 for 15% drop

                // Check if we hold this asset and what our average price is
                const holding = holdings.find(h => h.symbol === asset.symbol);
                let isAvgDown = false;
                let avgDownPct = 0;

                if (holding && holding.shares > 0) {
                    const costBasis = holding.totalValue - holding.gainLoss;
                    const avgPrice = costBasis / holding.shares;
                    if (currentPrice < avgPrice) {
                        isAvgDown = true;
                        avgDownPct = (currentPrice - avgPrice) / avgPrice;
                    }
                }

                if (drop <= -0.15) {
                    suggestions.push({
                        ticker: asset.symbol,
                        reason: `🔥 CRASH(${(drop * 100).toFixed(1)}%)`,
                        type: 'crash',
                        price: currentPrice
                    });
                } else if (drop <= -0.05 || (isAvgDown && avgDownPct < -0.03)) {
                    // Suggest Dip if market dip OR if it's a good averaging down opportunity (>3% below avg)
                    let reason = `🔻 DIP(${(drop * 100).toFixed(1)}%)`;
                    if (isAvgDown) {
                        reason = `📉 AVG DOWN(${(avgDownPct * 100).toFixed(1)}%)`;
                    }

                    suggestions.push({
                        ticker: asset.symbol,
                        reason: reason,
                        type: 'dip',
                        price: currentPrice
                    });
                }
            }
        }

        // 2. Analyze for "Dividends"
        if (priority === 'all' || priority === 'div') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextMonth = new Date(today);
            nextMonth.setDate(today.getDate() + 30);

            for (const asset of analysisAssets) {
                const divHistory = await getDividendHistory(asset.symbol);
                // Look for upcoming ex-dates. Since our service only gets history, we rely on projected data
                // we added in dummyDataService.
                // Filter for exDate > today and exDate < nextMonth

                const upcomingDiv = divHistory.find(d => {
                    const exDate = parseExDateLocal(d.exDate);
                    return exDate >= today && exDate <= nextMonth;
                });

                if (upcomingDiv) {
                    const currentPrice = latestPricesRecord[asset.symbol]?.price?.toNumber() || 0;
                    suggestions.push({
                        ticker: asset.symbol,
                        reason: `📅 DIV SOON`,
                        type: 'div',
                        price: currentPrice,
                        hasDivSoon: true
                    });
                }
            }
        }

        // 3. Analyze for "Balance" (Under-owned sectors)
        if (priority === 'all' || priority === 'balance') {
            // Simple logic: Find sectors we don't own any stock in, or low allocation
            const sectorAlloc: Record<string, number> = {};
            let totalValue = 0;

            holdings.forEach(h => {
                const value = h.totalValue;
                // We need to fetch asset metadata for holding to get sector
                // For efficiency, we can map from 'assets' array
                const asset = assets.find(a => a.symbol === h.symbol);
                const sector = asset?.sector || 'Other';

                sectorAlloc[sector] = (sectorAlloc[sector] || 0) + value;
                totalValue += value;
            });

            // Find sectors from ALL stock assets (owned or not), so a sector the user has zero
            // exposure to can still be surfaced - not just sectors already held.
            const allSectors = Array.from(new Set(stockAssets.map(a => a.sector).filter(s => s)));

            for (const sector of allSectors) {
                const alloc = sectorAlloc[sector as string] || 0;
                const pct = totalValue > 0 ? alloc / totalValue : 0;

                // If allocation is < 10%, suggest a stock in that sector.
                if (pct < 0.10) {
                    // Prefer a stock the user doesn't already own in this sector; fall back to
                    // any stock in the sector if they own them all.
                    const candidate = stockAssets.find(a => a.sector === sector && !holdings.some(h => h.symbol === a.symbol))
                        || stockAssets.find(a => a.sector === sector);
                    if (candidate) {
                        const currentPrice = latestPricesRecord[candidate.symbol]?.price?.toNumber() || 0;
                        // Pushed as its own suggestion (not merged onto an existing Crash/Dip
                        // entry for the same ticker) so a "buy - underweight" cue never reads
                        // as bundled with a "this position is dropping" warning.
                        suggestions.push({
                            ticker: candidate.symbol,
                            reason: `⚖️ BALANCE (${sector})`,
                            type: 'balance',
                            price: currentPrice
                        });
                    }
                }
            }
        }

        // Sort and Limit
        // Prioritize: Crash > Div > Dip > Balance
        const typePriority = { 'crash': 0, 'div': 1, 'dip': 2, 'balance': 3 };

        return suggestions.sort((a, b) => {
            const scoreA = typePriority[a.type] !== undefined ? typePriority[a.type] : 9;
            const scoreB = typePriority[b.type] !== undefined ? typePriority[b.type] : 9;
            return scoreA - scoreB;
        });

    } catch (error) {
        console.error("Error getting smart suggestions", error);
        return [];
    }
};
