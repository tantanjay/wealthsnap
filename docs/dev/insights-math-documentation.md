# Financial Insights - Mathematical Documentation

**Purpose**: Comprehensive technical reference for all calculations used in the Financial Insights feature.  
**Audience**: Developers, QA testers, and anyone questioning "how is this calculated?"  
**Last Updated**: January 23, 2026

---

## Table of Contents

1. [Overview Cards (10 Metrics)](#overview-cards)
2. [Savings Rate Trend](#savings-rate-trend)
3. [Cumulative Spending Chart](#cumulative-spending-chart)
4. [Comparison Chart](#comparison-chart)
5. [Income Analysis](#income-analysis)
6. [Expense Analysis](#expense-analysis)
7. [Smart Alerts](#smart-alerts)

---

## Overview Cards

The Overview section displays 10 financial metrics across 5 pages (2 cards per page).

### 1. Financial Runway

**Formula**:
```
Financial Runway = Net Tracked Balance ÷ Burn Rate
```

Where:
- **Net Tracked Balance** = Lifetime Income - Lifetime Expenses (from all tracked transactions)
- **Burn Rate** = Average monthly expenses (see [Burn Rate](#7-burn-rate) below)

**Example**:
```
Transactions tracked:
- Total Income: $100,000
- Total Expenses: $85,000
- Net Balance: $15,000
- Burn Rate: $3,000/month

Financial Runway = $15,000 ÷ $3,000 = 5 months
```

**Edge Cases**:
- If `burnRate = 0` → Display "∞ months" (infinite runway)
- Negative balance → Will show negative months (debt situation)

**Important Note**: This uses tracked transactions only, NOT actual bank account balance. Users must record their starting balance as an initial income transaction for accuracy.

**Color Coding**:
- Green: ≥6 months
- Orange: 3-6 months
- Red: <3 months

---

### 2. Budget Health

**Formula**:
```
Budget Performance = (Total Spent in Budgeted Categories ÷ Total Budget Amounts) × 100
```

**Process**:
1. Get all budgets for current month
2. For each budget, find total spent in that specific category (using SUB_CATEGORY level)
3. Sum all budgeted spending
4. Divide by sum of all budget limits

**Example**:
```
Budgets:
- Groceries: $500 limit, $400 spent
- Dining: $200 limit, $180 spent
- Gas: $150 limit, $120 spent

Total Budget: $850
Total Spent: $700

Budget Health = ($700 ÷ $850) × 100 = 82.4%
```

**Edge Cases**:
- No budgets set → Display "N/A"
- Category with no spending counts as 0% of that budget

**Color Coding** (v1.3.2+):
- Green: ≤70% (healthy)
- Orange: 70-90% (warning)
- Red: >90% (danger/over)

---

### 3. Net Cash Flow

**Formula**:
```
Net Cash Flow = Total Income - Total Expenses
```

For current month only.

**Example**:
```
Current Month (January):
- Income: $5,000
- Expenses: $3,200

Net Cash Flow = $5,000 - $3,200 = $1,800
```

**Color Coding**:
- Green: ≥0 (positive)
- Red: <0 (negative)

---

### 4. Savings Rate

**Formula**:
```
Savings Rate = ((Income - Expenses) ÷ Income) × 100
```

For current month only.

**Example**:
```
Current Month:
- Income: $5,000
- Expenses: $3,200

Savings = $5,000 - $3,200 = $1,800
Savings Rate = ($1,800 ÷ $5,000) × 100 = 36%
```

**Edge Cases**:
- If `income = 0` → Return 0%
- Negative rate (overspending) → Show negative percentage

**Color Coding**:
- Green: ≥20%
- Orange: <20%

---

### 5. Total Income

**Formula**:
```
Total Income = Sum of all INCOME transactions for current month
```

Simple aggregation.

**Color**: Always green (#4CAF50)

---

### 6. Total Expense

**Formula**:
```
Total Expense = Sum of all EXPENSE transactions for current month
```

Simple aggregation.

**Color**: Always red (#F44336)

---

### 7. Burn Rate

**Formula**:
```
Burn Rate = Total Expenses ÷ Effective Months
```

Where **Effective Months** is calculated with account age awareness:

```typescript
// Find earliest transaction date
firstTxMonthStart = First day of month of earliest transaction

// Calculate months since account start (inclusive of current month)
accountAgeMonths = (Current Month - First Transaction Month) + 1

// Effective window = min(requested history, actual history)
effectiveMonths = max(1, min(monthsBack, accountAgeMonths))
```

**Example 1** (New Account):
```
Account started: December 2025
Current: January 2026
Requested history: 6 months
Actual history: 2 months (Dec + Jan)

effectiveMonths = min(6, 2) = 2 months

Total expenses: $6,500
Burn Rate = $6,500 ÷ 2 = $3,250/month
```

**Example 2** (Mature Account):
```
Account started: 2020
Current: January 2026
Requested history: 6 months
Actual history: 60+ months

effectiveMonths = min(6, 60+) = 6 months

Total expenses for last 6 months: $18,000
Burn Rate = $18,000 ÷ 6 = $3,000/month
```

**Why This Logic?**: Prevents inflated burn rates for new accounts by only averaging over months with actual data.

---

### 8. Daily Average

**Formula**:
```
Daily Average = Total Monthly Expenses ÷ Days in Month
```

**Example**:
```
January 2026 (31 days):
- Total Expenses: $3,100

Daily Average = $3,100 ÷ 31 = $100/day
```

**Note**: Uses calendar days in month (28/29/30/31), not days elapsed.

---

### 9. Annualized Expense

**Formula**:
```
Annualized Expense = Burn Rate × 12
```

**Example**:
```
Burn Rate (6-month avg): $3,000/month
Annualized Expense = $3,000 × 12 = $36,000/year
```

---

### 10. Top Category

**Formula**:
```
Top Category = Category with highest spending in current month
```

Uses the **first item** from the expense breakdown (already sorted by amount descending).

**Note**: Uses SUB_CATEGORY level for granular insight (e.g., "Groceries" not "Food & Lifestyle").

---

## Savings Rate Trend

### Monthly Savings Rate Calculation

**Formula** (per month):
```
Savings Rate = ((Income - Expense) ÷ Income) × 100
Rounded to 1 decimal place
```

**Example Dataset**:
```
Oct: Income $4,500, Expense $3,200 → Rate = 28.9%
Nov: Income $5,000, Expense $4,200 → Rate = 16.0%
Dec: Income $4,800, Expense $3,000 → Rate = 37.5%
```

### Chart Scaling Algorithm

**Problem**: Need to fit data in 4 segments (5 grid lines) while ensuring 0% is always a grid line.

**Smart Scaling Logic**:
```typescript
SEGMENTS = 4
steps = [1, 2, 5, 8, 10, 15, 20, 25, 30, ...]

For each step:
    // Find how many steps below 0 we need
    n = ceil(abs(min(dataMin, 0)) / step)
    
    candidateMin = -n × step
    candidateMax = candidateMin + (step × SEGMENTS)
    
    If candidateMax >= dataMax:
        Use this range (tightest fit found)
        break
```

**Example**:
```
Data: [-15%, 5%, 20%, 35%]
dataMin = -15%, dataMax = 35%

Try step = 10:
    n = ceil(abs(min(-15, 0)) / 10) = ceil(15/10) = 2
    candidateMin = -2 × 10 = -20%
    candidateMax = -20 + (10 × 4) = 20%
    
    20% < 35% → Too small, continue

Try step = 15:
    n = ceil(15 / 15) = 1
    candidateMin = -1 × 15 = -15%
    candidateMax = -15 + (15 × 4) = 45%
    
    45% >= 35% ✓ → Use range [-15%, 45%]
    
Grid lines: -15%, 0%, 15%, 30%, 45%
```

### Color Gradient

The line changes color at the 0% mark:
- **Above 0%**: Primary color (blue/green)
- **Below 0%**: Red

**Implementation**: Uses SVG LinearGradient with stop offset calculated as:
```
zeroOffset = (max - 0) / (max - min)
```

**Example**:
```
Range: [-15%, 45%]
zeroOffset = (45 - 0) / (45 - (-15)) = 45/60 = 0.75

Gradient stops at 75% of chart height for color transition
```

### Statistics

**Average**:
```
Average = (Sum of all rates) / Number of months
Rounded to 1 decimal
```

**Streak**:
```
Count consecutive months of same sign (positive or negative)
Starting from most recent month backwards
```

**Positive/Negative Count**:
```
Positive Count = Number of months with rate ≥ 0%
Negative Count = Number of months with rate < 0%

Longest Streak = Max consecutive months in each direction
```

---

## Cumulative Spending Chart

### Historical Average Curve

**Purpose**: Calculate average daily cumulative spending across past N months.

**Algorithm**:
```typescript
For each historical month:
    For day 1 to 31:
        If day <= daysInThisMonth:
            dailySpending = Sum of expenses on that day
            monthRunningTotal += dailySpending
        
        dailySums[day] += monthRunningTotal
    
    count++

Return: dailySums.map(sum => sum / count)
```

**Example**:
```
3-Month Average for Day 5:

Oct (31 days):
    Days 1-5 cumulative: $450

Nov (30 days):
    Days 1-5 cumulative: $520

Dec (31 days):
    Days 1-5 cumulative: $480

Average at Day 5 = ($450 + $520 + $480) / 3 = $483
```

### Current Month Cumulative

**Formula**:
```
For day 1 to currentDay:
    dayExpenses = Sum of expenses on that specific day
    runningTotal += dayExpenses
    result.push(runningTotal)
```

**Example**:
```
Today is Jan 5th:

Jan 1: Spent $50 → Cumulative: $50
Jan 2: Spent $100 → Cumulative: $150
Jan 3: Spent $30 → Cumulative: $180
Jan 4: Spent $80 → Cumulative: $260
Jan 5: Spent $60 → Cumulative: $320

Chart shows: [50, 150, 180, 260, 320]
```

### Projection Logic

**Formula**:
```
Start with current cumulative total
For each remaining day in month:
    dailyIncrement = avgData[day] - avgData[day-1]
    projectedTotal += dailyIncrement
    projectionData.push(projectedTotal)
```

**Example**:
```
Current Day 5: $320 cumulative
Historical average Day 6: $550
Historical average Day 5: $483

Increment = $550 - $483 = $67
Projected Day 6 = $320 + $67 = $387
```

**Visual Result**:
- Solid line: Days 1-5 (actual)
- Dotted line: Days 5-31 (projection)

### Insight Message

**Formula**:
```
currentTotal = Last value in currentData
avgAtSameDay = avgData[currentDay - 1]

diff = currentTotal - avgAtSameDay

If diff > 0:
    "Pacing $X above 3M avg"
Else:
    "Pacing $X below 3M avg"
```

---

## Comparison Chart

### Pro-Rating Logic

**Formula**:
```
Pro-Rated Expense = (Current Month Spending / Days Elapsed) × Total Days in Month
```

**Example**:
```
Today: January 15, 2026
Days in January: 31
Current spending: $1,500

Pro-Rated = ($1,500 / 15) × 31 = $3,100
```

**Limitation**: Assumes **even spending** throughout month. Real spending is often lumpy (rent on 1st, bi-weekly paychecks, etc.).

**Footnote Added (v1.3.2)**: "*Projection assumes even spending throughout month"

### Chart Data

**5 Bars Displayed**:
1. **This Month*** (Projected)
   - Actual: Orange solid
   - Projected: Orange lighter (stacked on top)
   
2. **Last Month** - Full month actual
3. **Avg 3M** - Average of last 3 completed months
4. **Avg 6M** - Average of last 6 completed months
5. **Avg 1Y** - Average of last 12 completed months

### Y-Axis Scaling

**Formula**:
```
yMin = max(0, minValue × 0.85)  // 15% padding below minimum
yMax = maxValue × 1.05           // 5% padding above maximum
```

**Why**: Zooms the chart to data range for better visibility while keeping some breathing room.

---

## Income Analysis

### Projection Strategy

**Formula**:
```
historicalAverage = (Sum of past months) / Count of past months
proRatedIncome = max(currentMonthIncome, historicalAverage)
```

**Logic**: Assumes you'll earn **at least** your historical average by month end.

**Example**:
```
Historical average: $4,800/month
Current month (Jan 15): $2,000 earned so far

Projection: $4,800 (not a pro-rated $4,133)
```

**Visual**: Lighter bar segment shows gap to average.

### Growth Insight

**Formula**:
```
If lastMonth > prevMonth:
    growth = ((lastMonth - prevMonth) / prevMonth) × 100
    "Income grew by X%"
    
Else if lastMonth < prevMonth:
    drop = ((prevMonth - lastMonth) / prevMonth) × 100
    "Income down by X%"
    
Else:
    "Income has been stable"
```

**Edge Case**: `prevMonth = 0` → Growth = 100%

---

## Expense Analysis

### Category Breakdown

**Formula** (for each category):
```
categoryTotal = Sum of all transactions in that category
percentage = (categoryTotal / grandTotal) × 100
```

**Grouping Modes**:
- **CATEGORY**: Groups by category parent (e.g., "Food & Lifestyle")
- **SUB_CATEGORY**: Groups by individual item (e.g., "Groceries")

### Budget Integration

**Progress Bar**:
```
budgetProgress = (spent / budgetLimit) × 100
visualWidth = min(budgetProgress, 100)  // Cap bar at 100% width
```

**Color**:
- Green: <80%
- Orange: 80-100%
- Red: >100%

### Smart Sorting

**Priority Order**:
1. Over-budget categories (spent > limit)
2. Budgeted categories (has a budget)
3. Highest spending (by amount descending)

**Why**: Surfaces actionable items first (categories needing attention).

---

## Smart Alerts

### Anomaly Detection - Spending Spike

**Criteria**:
1. Category must have ≥3 historical transactions
2. Current month spending > historical average
3. Percentage increase ≥50%
4. Absolute difference ≥$1,000

**Formula**:
```
historicalAverage = (Sum of historical category spending) / Number of transactions
percentIncrease = ((currentAmount - historicalAverage) / historicalAverage) × 100
difference = currentAmount - historicalAverage

If percentIncrease > 50 AND difference > 1000:
    Trigger Alert
```

**Example**:
```
Historical "Groceries" transactions: [$300, $320, $280, $310]
Historical Average: $302.50
Current Month: $550

% Increase = (($550 - $302.50) / $302.50) × 100 = 81.8%
Difference = $247.50

81.8% > 50%? ✓
$247.50 > $1,000? ✗ → No alert (difference too small)
```

**Severity**:
- **MEDIUM**: 50-100% increase
- **HIGH**: >100% increase

---

## Formula Quick Reference

| Metric | Formula |
|--------|---------|
| Savings Rate | `((Income - Expense) / Income) × 100` |
| Burn Rate | `Total Expenses / Effective Months` |
| Budget Health | `(Spent in Budgets / Total Budgets) × 100` |
| Financial Runway | `Net Balance / Burn Rate` |
| Pro-Rated Expense | `(Current / Days Elapsed) × Days in Month` |
| Daily Average | `Monthly Expenses / Days in Month` |
| Annualized Expense | `Burn Rate × 12` |

---

## Data Validation

### Common Safeguards

1. **Division by Zero**:
   - Income = 0 → Savings Rate = 0%
   - Burn Rate = 0 → Financial Runway = ∞
   
2. **Empty Datasets**:
   - No transactions → Show "No data" message
   - No history → Skip historical comparisons
   
3. **Account Age**:
   - Burn Rate respects actual account age
   - Prevents inflated averages for new users
   
4. **Negative Values**:
   - Savings Rate can be negative (overspending)
   - Net Cash Flow can be negative (deficit)
   - Financial Runway can be negative (debt)

---

## Edge Cases Handled

1. **First Month User**:
   - Burn Rate uses 1 month (not 0)
   - No historical average for comparisons
   - Projections fall back to linear
   
2. **Irregular Income** (bi-weekly, freelance):
   - Savings Rate still accurate (uses actual income)
   - Projection may be less accurate mid-month
   
3. **Month Transitions**:
   - All "current month" calculations use server/device time
   - Timezone-aware date handling
   
4. **Missing Categories**:
   - Budget Health excludes unbud­geted spending
   - Top Category returns "None" if no expenses

---

## Testing Formulas

### Recommended Test Cases

1. **Boundary Values**:
   - 0 income, 0 expenses
   - Negative cash flow
   - Exactly 100% budget
   
2. **Edge Scenarios**:
   - First day of month (pro-rating)
   - Last day of month (projections)
   - Account exactly 6 months old (burn rate)
   
3. **Data Validation**:
   - Empty transaction history
   - Single transaction
   - Thousands of transactions (performance)

---

**Maintained by**: Development Team  
**Questions?**: Refer to source code in `src/utils/financialMetrics.ts`
