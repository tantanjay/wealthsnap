import { BigNumber } from 'bignumber.js';
import { Investment } from '@types';

/**
 * Result of investment portfolio calculation
 */
export interface PortfolioMetrics {
    symbol: string;
    currentQuantity: BigNumber;
    averagePrice: BigNumber; // Weighted Average Cost
    totalCostBasis: BigNumber; // Total book value (Avg Price * Quantity)
    totalMarketValue: BigNumber; // Current Price * Quantity (need current price input)
    realizedPL: BigNumber;
    unrealizedPL: BigNumber;
    totalPL: BigNumber;
}

/**
 * Calculates investment metrics including weighted average cost, realized P&L, etc.
 * Uses the "Weighted Average Cost" method.
 * 
 * Rules:
 * 1. BUY: Updates weighted average price.
 *    New Avg = ((Old Avg * Old Qty) + (Buy Price * Buy Qty) + Buy Fees) / (Old Qty + Buy Qty)
 *    *Note on Fees*: The user requested "(price+fees)/alloc = actualPrice". 
 *    Standard accounting adds buy-side fees to the Cost Basis.
 * 
 * 2. SELL: Reduces quantity but DOES NOT change average price per unit.
 *    Realized P/L = (Sell Price * Sell Qty) - Sell Fees - (Avg Price * Sell Qty)
 */
export const calculatePortfolioMetrics = (
    investments: Investment[],
    currentMarketPrice: BigNumber | number = 0
): PortfolioMetrics => {
    // 1. Sort by date (oldest first) to replay history correctly
    // Secondary sort by createdAt to ensure consistent order for same-day transactions
    const sortedInvestments = [...investments].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        // Fallback to createdAt or id if dates are identical
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let currentQuantity = new BigNumber(0);
    let totalCostBasis = new BigNumber(0); // This tracks the "Book Value"
    let realizedPL = new BigNumber(0);

    sortedInvestments.forEach(inv => {
        const price = new BigNumber(inv.price);
        const quantity = new BigNumber(inv.quantity);
        const fees = new BigNumber(inv.fees || 0);

        if (inv.action === 'BUY') {
            // Net Cost for this transaction = (Price * Qty) + Fees
            const transactionCost = price.times(quantity).plus(fees);

            // Update Total Cost Basis (Inventory Value)
            totalCostBasis = totalCostBasis.plus(transactionCost);

            // Update Quantity
            currentQuantity = currentQuantity.plus(quantity);

        } else if (inv.action === 'SELL') {
            // Calculate Cost of Goods Sold (COGS) based on CURRENT Average Cost
            // Average Cost = Total Cost Basis / Current Quantity
            // Note: If quantity is 0, avg cost is 0.
            const averageCostPerShare = currentQuantity.isGreaterThan(0)
                ? totalCostBasis.dividedBy(currentQuantity)
                : new BigNumber(0);

            const costOfSoldShares = averageCostPerShare.times(quantity);

            // Proceeds = (Price * Qty) - Fees
            const proceeds = price.times(quantity).minus(fees);

            // Realized P/L = Proceeds - Cost Basis of Sold Shares
            const tradePL = proceeds.minus(costOfSoldShares);
            realizedPL = realizedPL.plus(tradePL);

            // Reduce Cost Basis and Quantity
            // We reduce the Cost Basis by the value of the shares that left
            totalCostBasis = totalCostBasis.minus(costOfSoldShares);
            currentQuantity = currentQuantity.minus(quantity);

            // Safety Net: If quantity hits zero (or negative due to data error), reset basis to 0
            // This prevents floating point "dust" (e.g. 0.0000001) from persisting
            if (currentQuantity.isLessThanOrEqualTo(0)) {
                currentQuantity = new BigNumber(0);
                totalCostBasis = new BigNumber(0);
            }
        }
    });

    // Final Calculation of Average Price
    // Avoid division by zero
    const averagePrice = currentQuantity.isGreaterThan(0)
        ? totalCostBasis.dividedBy(currentQuantity)
        : new BigNumber(0);

    const marketPrice = new BigNumber(currentMarketPrice);
    const totalMarketValue = marketPrice.times(currentQuantity);

    // Unrealized P/L = (Market Price - Avg Price) * Quantity
    // OR: Market Value - Total Cost Basis
    const unrealizedPL = totalMarketValue.minus(totalCostBasis);

    return {
        // Assume all passed investments are for the same symbol. 
        // If mixed, the caller should group them first.
        symbol: investments[0]?.symbol || '',
        currentQuantity,
        averagePrice,
        totalCostBasis,
        totalMarketValue,
        realizedPL,
        unrealizedPL,
        totalPL: realizedPL.plus(unrealizedPL)
    };
};

/**
 * Helper to group investments by symbol and calculate metrics for each
 */
export const getAllPortfolioMetrics = (investments: Investment[], marketPrices: Record<string, number> = {}) => {
    const grouped: Record<string, Investment[]> = {};

    investments.forEach(inv => {
        if (!grouped[inv.symbol]) grouped[inv.symbol] = [];
        grouped[inv.symbol].push(inv);
    });

    return Object.keys(grouped).map(symbol => {
        return calculatePortfolioMetrics(grouped[symbol], marketPrices[symbol] || 0);
    });
};
