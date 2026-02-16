

import { Debt, Transaction } from "@types";
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

export const calculateTotalDebtObligations = (debts: Debt[]): BigNumber => {
    return debts
        .filter(d => d.status === 'ACTIVE')
        .reduce((sum, d) => sum.plus(d.minPayment), new BigNumber(0));
};

export const calculatePrevDebtObligations = (debts: Debt[], date: Date): BigNumber => {
    return debts.reduce((sum, debt) => {
        // Only include if debt existed at that date
        // Use startDate or createdAt
        const startDate = new Date(debt.startDate || debt.createdAt);
        if (startDate <= date && debt.status === 'ACTIVE') {
            return sum.plus(debt.minPayment);
        }
        return sum;
    }, new BigNumber(0));
};

export const calculateCurrentDebtBalance = (debt: Debt, transactions: Transaction[]): BigNumber => {
    // Current Balance = Initial Amount - Payments + Interest (complex to track interest exactly without full amortization table)
    // SIMPLIFICATION: User manually updates debt, OR we track payments.
    // We assume 'initialAmount' is the starting point.
    // We find transactions linked to this debtId.
    // If transaction type is EXPENSE/TRANSFER_OUT, it reduces debt? 
    // Usually 'TRANSFER_OUT' to 'DEBT' account type.

    // For now, let's just sum up payments made to this debtId.
    // NOTE: This assumes initialAmount was the amount *before* these payments.
    // If the user updates the debt record, they might reset initialAmount.
    // Let's rely on the fact that we have `debtId` on transactions.

    const payments = transactions
        .filter(t => t.debtId === debt.id)
        .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

    // We should also check if there are any "Interest" transactions added to the debt?
    // For MVP, simply: Current = Initial - Payments.
    // If balance < 0, it's 0.
    return BigNumber.maximum(0, debt.initialAmount.minus(payments));
};

export const calculateDebtPayoffStrategy = (
    debts: Debt[],
    extraPayment: number,
    strategy: 'SNOWBALL' | 'AVALANCHE'
) => {
    // 1. Filter active debts
    let activeDebts = debts.filter(d => d.status === 'ACTIVE').map(d => ({
        ...d,
        currentBalance: d.initialAmount, // NOTE: usage of initialAmount as currentBalance is a SIMPLIFICATION. ideally pass currentBalance.
        // We will need to fetch actual balances before calling this, OR update this function to accept balances.
        // For now, let's assume the caller will pass debts with `initialAmount` patched to `currentBalance`,
        // OR we just use initialAmount. Realistically, we need `currentBalance`.
        // Let's rely on the caller to update `initialAmount` to `currentBalance` in the object passed here,
        // or add a `currentBalance` field to the Debt type in memory (not DB).
    }));

    // Check if we need to modify the input type or just assume initialAmount IS currentBalance for the simulation?
    // In `DebtScreen`, we will calculate `currentBalance` for each debt.
    // We can map over them and create a temporary object.

    // Let's assume the input `debts` have their `initialAmount` set to the CURRENT outstanding balance.

    let totalInterestPaid = new BigNumber(0);
    let monthsToFreedom = 0;
    let payoffDates: Record<string, Date> = {};
    const startDate = new Date();

    // Deep copy to avoid mutating
    let currentDebts = activeDebts.map(d => ({
        id: d.id,
        balance: d.initialAmount, // This MUST be current balance
        rate: d.interestRate.div(100).div(12),
        minPayment: d.minPayment,
        name: d.name
    }));

    // Safety break
    let maxMonths = 1200; // 100 years

    while (currentDebts.some(d => d.balance.gt(0)) && monthsToFreedom < maxMonths) {
        monthsToFreedom++;
        let availableExtra = new BigNumber(extraPayment);

        // 1. Pay minimums
        currentDebts.forEach(d => {
            if (d.balance.gt(0)) {
                // Interest
                const interest = d.balance.times(d.rate);
                totalInterestPaid = totalInterestPaid.plus(interest);
                d.balance = d.balance.plus(interest);

                // Minimum Payment
                let payment = d.minPayment;
                if (d.balance.lt(payment)) {
                    payment = d.balance; // Pay off remainder
                }

                // If payment < interest, we have a problem (negative amortization).
                // Just deduct payment.
                d.balance = d.balance.minus(payment);

                // If paid off this month, record date
                if (d.balance.lte(0) && !payoffDates[d.id]) {
                    const date = new Date(startDate);
                    date.setMonth(date.getMonth() + monthsToFreedom);
                    payoffDates[d.id] = date;
                }
            }
        });

        // 2. Apply Extra Payment
        // Sort based on strategy
        // Snowball: Lowest Balance First
        // Avalanche: Highest Rate First
        if (availableExtra.gt(0)) {
            const sortedDebts = [...currentDebts].filter(d => d.balance.gt(0));

            if (strategy === 'SNOWBALL') {
                sortedDebts.sort((a, b) => a.balance.minus(b.balance).toNumber());
            } else {
                // Avalanche
                sortedDebts.sort((a, b) => b.rate.minus(a.rate).toNumber());
            }

            for (const debt of sortedDebts) {
                if (availableExtra.lte(0)) break;

                const amountToPay = BigNumber.minimum(debt.balance, availableExtra);
                debt.balance = debt.balance.minus(amountToPay);
                availableExtra = availableExtra.minus(amountToPay);

                if (debt.balance.lte(0) && !payoffDates[debt.id]) {
                    const date = new Date(startDate);
                    date.setMonth(date.getMonth() + monthsToFreedom);
                    payoffDates[debt.id] = date;
                }
            }
        }
    }

    const finalDate = new Date(startDate);
    finalDate.setMonth(finalDate.getMonth() + monthsToFreedom);

    return {
        freedomDate: finalDate,
        totalInterest: totalInterestPaid,
        payoffDates
    };
};