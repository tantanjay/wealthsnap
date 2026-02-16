

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
    // Simple Method:
    // If PAYABLE (Loan): Only TRANSFER_OUT reduces balance. (TRANSFER_IN is ignored/initial funding)
    // If RECEIVABLE (Lending): Only TRANSFER_IN reduces balance. (TRANSFER_OUT is ignored/initial lending)

    const isPayable = (debt.direction || 'PAYABLE') === 'PAYABLE';
    const paymentType = isPayable ? 'TRANSFER_OUT' : 'TRANSFER_IN';

    const payments = transactions
        .filter(t => t.debtId === debt.id && t.type === paymentType)
        .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

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

export const calculateDebtProgress = (initialAmount: BigNumber, currentBalance: BigNumber): number => {
    if (initialAmount.lte(0)) return 100;
    const paid = initialAmount.minus(currentBalance);
    const progress = paid.div(initialAmount).times(100);
    return Math.min(100, Math.max(0, progress.toNumber()));
};

export const calculateNextPaymentBreakdown = (debt: Debt, currentBalance: BigNumber) => {
    // Similar to handleOpenPayment logic
    const rate = new BigNumber(debt.interestRate || 0).div(100);
    const monthlyRate = rate.div(12);

    let interest = new BigNumber(0);
    const balance = currentBalance; // Using the current calculated balance

    if (debt.interestType === 'NONE') {
        interest = new BigNumber(0);
    } else if (debt.interestType === 'FLAT') {
        // Flat interest is usually based on initial amount
        const base = debt.initialAmount;
        interest = base.times(monthlyRate);
    } else {
        // FIXED / VARIABLE (Reducing Balance)
        interest = balance.times(monthlyRate);
    }

    const minPay = new BigNumber(debt.minPayment || 0);
    let principal = minPay.minus(interest);

    // If payment < interest (negative amortization), principal paid is 0 (debt grows, but for display we show 0 principal paid)
    if (principal.lt(0)) principal = new BigNumber(0);

    // If remaining balance is less than principal part, cap it
    if (principal.gt(balance)) {
        principal = balance;
    }

    return {
        principal,
        interest,
        totalEstimate: principal.plus(interest)
    };
};

export const getNextDueDate = (debt: Debt, transactions: Transaction[]): Date | null => {
    if (!debt.startDate) return null;
    const start = new Date(debt.startDate);
    const day = start.getDate();
    const now = new Date();

    // 1. Initial Candidate: The occurrence in the CURRENT month
    let candidateDate = new Date(now.getFullYear(), now.getMonth(), day);

    // 2. Check if a PRINCIPAL payment occurred in this candidate month
    const paidThisMonth = transactions.some(t => {
        if (t.debtId !== debt.id || t.type !== 'TRANSFER_OUT') return false;
        const tDate = new Date(t.date);
        return tDate.getMonth() === candidateDate.getMonth() &&
            tDate.getFullYear() === candidateDate.getFullYear();
    });

    // 3. If paid, advance to NEXT month
    if (paidThisMonth) {
        candidateDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }

    return candidateDate;
};