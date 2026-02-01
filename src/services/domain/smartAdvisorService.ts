import { Suggestion } from '@components/investments/SmartAdvisor';
import { getLatestPrices, getPriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { getPortfolioHoldings } from '@services/domain/investmentService';

export type Priority = 'div' | 'crash' | 'balance' | 'all';

export const getSmartSuggestions = async (priority: Priority = 'all'): Promise<Suggestion[]> => {
    try {
        const assets = await getAllAssets();
        const holdings = await getPortfolioHoldings();
        const latestPricesRecord = await getLatestPrices(assets.map(a => a.symbol));

        const suggestions: Suggestion[] = [];

        // 1. Analyze for "Crash" and "Dip"
        if (priority === 'all' || priority === 'crash') {
            for (const asset of assets) {
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
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);

            for (const asset of assets) {
                const divHistory = await getDividendHistory(asset.symbol);
                // Look for upcoming ex-dates. Since our service only gets history, we rely on projected data 
                // we added in dummyDataService.
                // Filter for exDate > today and exDate < nextMonth

                const upcomingDiv = divHistory.find(d => {
                    const exDate = new Date(d.exDate);
                    return exDate >= today && exDate <= nextMonth;
                });

                if (upcomingDiv) {
                    const currentPrice = latestPricesRecord[asset.symbol]?.price?.toNumber() || 0;
                    suggestions.push({
                        ticker: asset.symbol,
                        reason: `📅 DIV SOON`,
                        type: 'balance', // Use balance or a new type if UI supports it, existing UI uses balance for blue
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

            // Find sectors from all available assets
            const allSectors = Array.from(new Set(assets.map(a => a.sector).filter(s => s)));

            for (const sector of allSectors) {
                const alloc = sectorAlloc[sector as string] || 0;
                const pct = totalValue > 0 ? alloc / totalValue : 0;

                // If allocation is < 10%, suggest top stock in that sector?
                if (pct < 0.10) {
                    // Suggest a stock in this sector that isn't crashing? 
                    // Or just any stock. Let's pick one we don't own, or minimal own.
                    const candidate = assets.find(a => a.sector === sector);
                    if (candidate) {
                        const currentPrice = latestPricesRecord[candidate.symbol]?.price?.toNumber() || 0;
                        // Avoid duplicates if already suggested
                        if (!suggestions.find(s => s.ticker === candidate.symbol)) {
                            suggestions.push({
                                ticker: candidate.symbol, // Access symbol directly as string
                                reason: `⚖️ BALANCE (${sector})`,
                                type: 'balance',
                                price: currentPrice
                            });
                        }
                    }
                }
            }
        }

        // Sort and Limit
        // Prioritize: Crash > Div > Dip > Balance
        const typePriority = { 'crash': 0, 'dip': 2, 'balance': 3 };
        // Note: Divs might be 'balance' type but hasDivSoon=true. 

        return suggestions.sort((a, b) => {
            const scoreA = (typePriority[a.type] || 9) - (a.hasDivSoon ? 1.5 : 0);
            const scoreB = (typePriority[b.type] || 9) - (b.hasDivSoon ? 1.5 : 0);
            return scoreA - scoreB;
        });

    } catch (error) {
        console.error("Error getting smart suggestions", error);
        return [];
    }
};
