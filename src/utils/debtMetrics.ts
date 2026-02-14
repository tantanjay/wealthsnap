

import { Debt } from "@types";
import { BigNumber } from "bignumber.js";

export const calculateDebtSchedule = (debt: Debt, balance: BigNumber) => {
    // Re-creates the amortization logic from DebtForm to project future interest
    let totalInterest = new BigNumber(0);
    const P = balance;

    if (P.lte(0)) return { totalInterest: new BigNumber(0) };

    const rate = new BigNumber(debt.interestRate || 0).div(100);
    const months = debt.termMonths || 0;
    const minPayment = new BigNumber(debt.minPayment || 0);
    const interestType = debt.interestType || 'FIXED';

    // Safety check for invalid minPayment to prevent infinite loops
    // If payment is too low (less than interest), we can't easily project without infinite loop.
    // In that case, we might fallback to a simple approximation or cap at 10 years.

    if (minPayment.lte(0)) return { totalInterest: new BigNumber(0) };

    // Limit simulation
    const maxMonths = months > 0 ? months : 120; // 10 years max projection
    let currentBalance = P;

    for (let i = 1; i <= maxMonths; i++) {
        let interestPart = new BigNumber(0);

        if (interestType === 'NONE') {
            interestPart = new BigNumber(0);
        } else if (interestType === 'FLAT') {
            // Flat interest usually calculated on original principal, but here we might lack original if partial payment happened.
            // We'll use current Balance as proxy for "Remaining Principal" or fallback to initialAmount if available and logic permits.
            // Simplified: Flat on current balance for remaining term? Or based on Initial?
            // Standard Flat: (Original * Rate) / 12. 
            // We will use InitialAmount if available, else Balance.
            const base = debt.initialAmount || P;
            interestPart = base.times(rate).div(12);
        } else {
            // FIXED / VARIABLE (Reducing Balance)
            interestPart = currentBalance.times(rate).div(12);
        }

        let principalPart = minPayment.minus(interestPart);

        // Adjust for last payment
        if (currentBalance.lte(minPayment) || (months > 0 && i === months)) {
            interestPart = currentBalance.times(rate).div(12); // Recalc interest on exact remaining? Or just take previous?
            // Simple approach: Use calculated interestPart.
            // If final balance is small, interest is small.
            totalInterest = totalInterest.plus(interestPart);
            break;
        }

        // If payment < interest, balance grows. Cap this.
        if (principalPart.lte(0)) {
            // Infinite debt trap. Stop projection to avoid massive numbers.
            // Just take interest * remaining months?
            // For safety, break.
            break;
        }

        currentBalance = currentBalance.minus(principalPart);
        totalInterest = totalInterest.plus(interestPart);

        if (currentBalance.lte(0)) break;
    }

    return { totalInterest };
};

export const calculateProjectedDebtLiability = (debt: Debt, currentPrincipalBalance: BigNumber) => {
    // 1. Current Principal Balance (Passed from caller who calculated it via transactions)
    // 2. Projected Future Interest
    const { totalInterest } = calculateDebtSchedule(debt, currentPrincipalBalance);

    return {
        principal: currentPrincipalBalance,
        interest: totalInterest,
        totalLiability: currentPrincipalBalance.plus(totalInterest)
    };
};

