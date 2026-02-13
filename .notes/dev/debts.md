# 🏦 Debt & Liabilities System Architecture

This document outlines the technical logic for a **Zero-Knowledge (Encrypted)** debt tracking system built with **Expo (SQLite)** and **TypeScript**.

---

## 1. Core Principles
* **Source of Truth:** The `transactions` table is the source of truth for all balance movements.
* **On-the-Fly Calculation:** Debt balances are **not** stored as a static number. They are calculated in the UI layer by subtracting linked payments from the initial principal.
* **Zero-Knowledge Privacy:** Sensitive financial values are encrypted before storage. All mathematical operations occur in the application layer (TSX/TS) after decryption.
* **Interest as Expense:** Interest is treated as "rent for money." It is logged as an `EXPENSE`, while only the **Principal** portion of a payment reduces the debt balance.

---

## 2. Database Schema

### `debts` Table
Stores the metadata and the "starting point" of the obligation.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Unique Identifier |
| `name` | TEXT | **Encrypted** name of the loan or person |
| `type` | TEXT | `LOAN`, `CREDIT_CARD`, `MORTGAGE`, `I_OWE_YOU`, `YOU_OWE_ME` |
| `direction` | TEXT | `PAYABLE` (Debt) or `RECEIVABLE` (Asset) |
| `initialAmount`| TEXT | **Encrypted** starting principal |
| `interestRate` | TEXT | **Encrypted** annual rate (e.g., "0.05" for 5%) |
| `startDate` | TEXT | ISO 8601 Date of the loan |
| `status` | TEXT | `ACTIVE`, `PAID_OFF`, `FORGIVEN` |
| `contactId` | TEXT | **Encrypted** ID for phone contact linkage |

---

## 3. The "Split-Transaction" Double Entry
When a user makes a payment, it must be split into two separate transaction rows to maintain accurate accounting.

**Example: ₱1,000 Payment (₱800 Principal + ₱200 Interest)**

1.  **Principal Entry:**
    * `type`: `TRANSFER_OUT`
    * `category`: `Principal`
    * `debtId`: `LOAN_ID_123`
    * **Effect:** Reduces Cash Balance AND reduces Debt Balance.

2.  **Interest Entry:**
    * `type`: `EXPENSE`
    * `category`: `Interest`
    * `debtId`: `LOAN_ID_123`
    * **Effect:** Reduces Cash Balance ONLY. (Doesn't touch Debt math).

---

## 4. TSX Math Engine Logic
Since SQLite cannot perform math on encrypted strings, the "Remaining Balance" is calculated via a TypeScript hook.



### Logic Matrix:
| Debt Direction | Transaction Type | Category | Math Operation |
| :--- | :--- | :--- | :--- |
| **PAYABLE** | `TRANSFER_OUT` | `Principal` | **Subtract** from Initial Amount |
| **PAYABLE** | `TRANSFER_IN` | `Principal` | **Add** to Initial Amount (New Spend) Manual Input by User |
| **RECEIVABLE** | `TRANSFER_IN` | `Principal` | **Subtract** from Initial Amount |

### Calculation Pseudo-code:
```typescript
const computeDebt = (debt, allTransactions) => {
  const pInitial = decrypt(debt.initialAmount);
  
  const pPaid = allTransactions
    .filter(t => t.debtId === debt.id && t.category === 'Principal')
    .reduce((sum, t) => sum + decrypt(t.amount), 0);
    
  return pInitial - pPaid;
};