import { CHANGELOG_MARKDOWN } from '@constants/changelog';
import { parseMarkdownToContentItems } from '@utils/markdownParser';

export interface HelpSlide {
    id: string;
    icon: string;
    title: string;
    description: string;
    color: string;
    isNotice?: boolean;
    isLast?: boolean;
}

export type ContentItem =
    | { type: 'heading1'; text: string }
    | { type: 'heading2'; text: string }
    | { type: 'heading3'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'bullet'; text: string; indent?: number }
    | { type: 'blockquote'; text: string }
    | { type: 'formula'; text: string }
    | { type: 'divider' }
    | { type: 'example'; text: string }
    | { type: 'alert'; text: string; alertType?: 'info' | 'warning' | 'danger' };

export interface HelpTopic {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    type: 'slides' | 'document';
    slides?: HelpSlide[];
    content?: ContentItem[];
}

export const HELP_TOPICS: HelpTopic[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        subtitle: 'The basic guide to WealthSnap',
        icon: 'rocket-outline',
        color: '#4CAF50',
        type: 'slides',
        slides: [
            {
                id: 'security',
                icon: 'shield-checkmark',
                title: 'Your Data is Secure 🔒',
                description: 'This app is built "Local-First". Your data is encrypted and stored ONLY on your phone.\n\nWE DO NOT HAVE ACCESS TO YOUR DATA.',
                color: '#4CAF50',
                isNotice: true
            },
            {
                id: 'backup',
                icon: 'cloud-download-outline',
                title: 'Backup & Restore',
                description: 'Since data is local, YOU are responsible for safe keeping.\n\nGo to Profile > Backup Data regularly to save a copy of your financial life.',
                color: '#2196F3'
            },
            {
                id: 'transaction',
                icon: 'add-circle-outline',
                title: 'Add Income & Expenses',
                description: 'Tap the big "+" button at the bottom to log transactions.\n\nUse the camera to scan receipts using AI!',
                color: '#FF9800'
            },
            {
                id: 'recurring',
                icon: 'repeat-outline',
                title: 'Recurring Transactions',
                description: 'Set up automated salary or bill entries so you never forget to log them.',
                color: '#9C27B0'
            },
            {
                id: 'budget',
                icon: 'pie-chart-outline',
                title: 'Manage Budget',
                description: 'Set monthly limits for different categories to keep your spending on track.',
                color: '#E91E63'
            },
            {
                id: 'ready',
                icon: 'checkmark-circle-outline',
                title: 'You are Ready!',
                description: 'Take control of your wealth today.',
                color: '#4CAF50',
                isLast: true
            }
        ]
    },
    {
        id: 'insights',
        title: 'Financial Insights',
        subtitle: 'Meaning of cards and charts',
        icon: 'bar-chart-outline',
        color: '#2196F3',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Cards & Charts Overview' },
            { type: 'paragraph', text: 'This guide explains what each card and chart shows and the user value behind it.' },
            { type: 'divider' },
            { type: 'heading2', text: 'Overview Cards' },
            { type: 'paragraph', text: 'These cards answer "Am I financially okay right now?" at a glance. You can browse past months via the month selector above; each card\'s subtitle shows which month it\'s reflecting.' },

            { type: 'heading3', text: '1. Financial Runway' },
            { type: 'blockquote', text: 'Shows: How many months your current balance can support your lifestyle.' },
            { type: 'bullet', text: 'Measures financial safety' },
            { type: 'bullet', text: '"Current balance" here is your entire transaction history, not just the browsed month — everything you\'ve ever earned and transferred in, minus everything you\'ve ever spent and transferred out' },
            { type: 'bullet', text: 'Includes your mandatory minimum debt payments, not just everyday spending' },
            { type: 'bullet', text: 'Always reflects today, even while you\'re browsing a past month' },
            { type: 'bullet', text: 'Highlights risk early' },
            { type: 'paragraph', text: 'User insight: "I can sustain my current spending for X months."' },

            { type: 'heading3', text: '2. Budget Health' },
            { type: 'blockquote', text: 'Shows: How much of your monthly budgets you’ve used (percentage).' },
            { type: 'bullet', text: 'Only counts categories that actually have a budget set' },
            { type: 'bullet', text: 'Early warning before overspending' },
            { type: 'paragraph', text: 'User insight: "My spending is healthy / getting risky."' },

            { type: 'heading3', text: '3. Net Cash Flow' },
            { type: 'blockquote', text: 'Shows: Income minus expenses for the selected month.' },
            { type: 'bullet', text: 'Indicates progress or regression' },
            { type: 'bullet', text: 'Simple profitability signal' },
            { type: 'paragraph', text: 'User insight: "I’m moving forward / falling behind this month."' },

            { type: 'heading3', text: '4. Savings Rate' },
            { type: 'blockquote', text: 'Shows: Percentage of income saved this month.' },
            { type: 'bullet', text: 'Standard wealth metric' },
            { type: 'bullet', text: 'Scales across any income level' },
            { type: 'paragraph', text: 'User insight: "How efficiently am I saving what I earn?"' },

            { type: 'heading3', text: '5. Total Income' },
            { type: 'blockquote', text: 'Shows: All income received in the selected month.' },
            { type: 'bullet', text: 'Baseline for all other insights' },
            { type: 'bullet', text: 'Useful for variable income earners' },

            { type: 'heading3', text: '6. Total Expense' },
            { type: 'blockquote', text: 'Shows: All spending recorded in the selected month.' },
            { type: 'bullet', text: 'Clear cost awareness' },
            { type: 'bullet', text: 'No category noise' },

            { type: 'heading3', text: '7. Burn Rate' },
            { type: 'blockquote', text: 'Shows: Average monthly spending based on recent history, as of today.' },
            { type: 'bullet', text: 'More realistic than a single month' },
            { type: 'bullet', text: 'Includes your mandatory minimum debt payments' },
            { type: 'bullet', text: 'Always reflects today, even while you\'re browsing a past month' },
            { type: 'bullet', text: 'Powers the Runway card' },
            { type: 'paragraph', text: 'User insight: "This is what my lifestyle actually costs, debts included."' },

            { type: 'heading3', text: '8. Daily Average' },
            { type: 'blockquote', text: 'Shows: Average amount spent per day so far in the selected month.' },
            { type: 'bullet', text: 'Helps pace spending mid-month' },
            { type: 'bullet', text: 'Easy mental model' },

            { type: 'heading3', text: '9. Annualized Expense' },
            { type: 'blockquote', text: 'Shows: Burn Rate projected across a full year.' },
            { type: 'bullet', text: 'Connects daily habits to long-term impact' },
            { type: 'bullet', text: 'Helps plan income needs' },

            { type: 'heading3', text: '10. Top Category' },
            { type: 'blockquote', text: 'Shows: Highest spending category in the selected month.' },
            { type: 'bullet', text: 'Identifies biggest money drain' },
            { type: 'bullet', text: 'Highlights optimization opportunities' },

            { type: 'divider' },
            { type: 'heading2', text: 'Charts & Trends' },
            { type: 'paragraph', text: 'Charts answer "Where am I heading?", not just where I am.' },

            { type: 'heading3', text: 'Savings Rate Trend' },
            { type: 'blockquote', text: 'Shows: Your monthly performance over time, across three switchable views.' },
            { type: 'bullet', text: 'Rate — the percentage of income you kept each month' },
            { type: 'bullet', text: 'Saved — the raw amount you kept each month (income minus expenses), including money moved into investments' },
            { type: 'bullet', text: 'Cash Flow — the true net movement of cash in and out, transfers included' },
            { type: 'paragraph', text: 'Each view is color-split at zero (green above, red below) so a bad month is obvious at a glance. Average and streak stats update to match whichever view is active.' },

            { type: 'heading3', text: 'Cumulative Spending Chart' },
            { type: 'blockquote', text: 'Shows: How fast you’re spending this month vs your historical average.' },
            { type: 'bullet', text: 'Detects overspending early' },
            { type: 'bullet', text: 'Predicts month-end outcome' },
            { type: 'paragraph', text: 'Includes: Actual spending (solid line), Projected spending (dotted line), Pacing insight. Only shown for the current month.' },

            { type: 'heading3', text: 'Monthly Comparison Chart' },
            { type: 'blockquote', text: 'Shows: This month compared to last month and historical averages — or a longer-range trend.' },
            { type: 'bullet', text: '"Compare" mode: bars for This Month, Last Month, Avg 3M/6M/1Y' },
            { type: 'bullet', text: '"Trend" mode: a line over 6 Months, 1 Year, 3 Years, or All Time — with year-by-year browsing when viewing 1 Year' },
            { type: 'bullet', text: 'Adds context to partial-month data and prevents overreaction' },

            { type: 'heading3', text: 'Income Analysis' },
            { type: 'blockquote', text: 'Shows: Income stability and growth trends.' },
            { type: 'bullet', text: 'Highlights volatility' },
            { type: 'bullet', text: 'Useful for freelancers and variable income users' },

            { type: 'heading3', text: 'Expense Analysis' },
            { type: 'blockquote', text: 'Shows: Spending breakdown by category with budget awareness.' },
            { type: 'bullet', text: 'Switch between Group and Item level detail — your choice is remembered' },
            { type: 'bullet', text: 'Surfaces actionable problem areas, prioritizing over-budget categories' },

            { type: 'divider' },
            { type: 'heading2', text: 'Smart Alerts' },
            { type: 'paragraph', text: 'Automatically detected issues worth your attention, so you don\'t have to go looking.' },
            { type: 'bullet', text: 'Budget Exceeded — a category has spent past its set budget' },
            { type: 'bullet', text: 'Spending Spike — a category jumped well above its usual average' },
            { type: 'bullet', text: 'Runway Drop — your Financial Runway fell sharply versus last month' },
            { type: 'paragraph', text: 'Catches anomalies you might miss and reduces the mental load of checking everything manually.' }
        ]
    },
    {
        id: 'math',
        title: 'Math & Formulas',
        subtitle: 'Calculations reference',
        icon: 'calculator-outline',
        color: '#9C27B0',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Mathematical Documentation' },
            { type: 'paragraph', text: 'Technical reference for all calculations used in the Financial Insights feature.' },
            { type: 'divider' },

            { type: 'heading1', text: '1. Overview Cards' },

            { type: 'heading2', text: 'Financial Runway' },
            { type: 'formula', text: 'Runway = Net Liquid Balance ÷ Adjusted Burn Rate' },
            { type: 'bullet', text: 'Net Liquid Balance = (Lifetime Income + Lifetime Transfer In) − (Lifetime Total Expenses + Lifetime Transfer Out) — summed across your entire transaction history, not just the browsed month' },
            { type: 'bullet', text: 'Adjusted Burn Rate = Burn Rate + Total Minimum Payments on your active, payable debts' },
            { type: 'paragraph', text: 'Both this and Burn Rate are computed as of today, regardless of which month you\'re browsing, and both draw on your full history rather than a single month.' },
            { type: 'paragraph', text: 'Color Coding:' },
            { type: 'bullet', text: 'Green: ≥6 months' },
            { type: 'bullet', text: 'Orange: 3-6 months' },
            { type: 'bullet', text: 'Red: <3 months' },

            { type: 'heading2', text: 'Budget Health' },
            { type: 'formula', text: 'Health = (Total Spent in Budgeted Categories ÷ Total Budget Amounts) × 100' },
            { type: 'paragraph', text: 'Process:' },
            { type: 'bullet', text: '1. Get all budgets for the selected month' },
            { type: 'bullet', text: '2. Sum total spent in those specific categories' },
            { type: 'bullet', text: '3. Divide by total budget limit' },
            { type: 'paragraph', text: 'Color Coding:' },
            { type: 'bullet', text: 'Green: <70% (healthy)' },
            { type: 'bullet', text: 'Orange: 70-90% (warning)' },
            { type: 'bullet', text: 'Red: >90% (danger/over)' },

            { type: 'heading2', text: 'Net Cash Flow' },
            { type: 'formula', text: 'Net Cash Flow = Total Income - Total Expenses' },
            { type: 'paragraph', text: 'For the selected month only.' },
            { type: 'bullet', text: 'Green: ≥0 (positive)' },
            { type: 'bullet', text: 'Red: <0 (negative)' },

            { type: 'heading2', text: 'Savings Rate' },
            { type: 'formula', text: 'Rate = ((Income - Expenses) ÷ Income) × 100' },
            { type: 'paragraph', text: 'Edge Cases:' },
            { type: 'bullet', text: 'Income ≤ 0 → 0%' },
            { type: 'bullet', text: 'Negative rate shown if expenses > income' },

            { type: 'heading2', text: 'Burn Rate' },
            { type: 'formula', text: 'Burn Rate = Total Expenses (prior months) ÷ Effective Months' },
            { type: 'paragraph', text: 'Effective Months Logic:' },
            { type: 'blockquote', text: 'Prevents inflated burn rates for new accounts by only averaging over months with actual data, and excludes the current, in-progress month.' },
            { type: 'formula', text: 'effectiveMonths = min(monthsBack, accountAgeMonths)' },
            { type: 'paragraph', text: 'The Burn Rate and Runway cards then add your total minimum debt payments on top of this (see Financial Runway above). The Comparison Chart\'s Avg 3M/6M/1Y bars use plain Burn Rate without that debt adjustment.' },

            { type: 'heading2', text: 'Daily Average' },
            { type: 'formula', text: 'Daily Average = Expenses So Far This Month ÷ Days Elapsed' },
            { type: 'bullet', text: 'Uses days actually elapsed in the current month, not the full calendar length.' },

            { type: 'heading2', text: 'Annualized Expense' },
            { type: 'formula', text: 'Annualized Expense = Burn Rate × 12' },

            { type: 'heading2', text: 'Top Category' },
            { type: 'formula', text: 'Category with highest spending in the selected month' },
            { type: 'bullet', text: 'Uses SUB_CATEGORY level (e.g., "Groceries")' },

            { type: 'divider' },
            { type: 'heading1', text: '2. Savings Rate Trend' },
            { type: 'paragraph', text: 'Three switchable views, each its own monthly time series:' },
            { type: 'formula', text: 'Rate(month) = ((Income − Expense) ÷ Income) × 100' },
            { type: 'formula', text: 'Saved(month) = Income − Expense' },
            { type: 'formula', text: 'Cash Flow(month) = (Income + Transfer In) − (Expense + Transfer Out)' },

            { type: 'heading2', text: 'Chart Scaling Algorithm' },
            { type: 'paragraph', text: 'Smart Scaling Logic ensures 0 is always a grid line, with a symmetric Y-axis above and below it.' },
            { type: 'blockquote', text: 'Finds a step size (e.g. 5, 10, 25) such that the full range fits in a small number of even segments.' },

            { type: 'heading2', text: 'Color Gradient' },
            { type: 'paragraph', text: 'Whichever view is active, the line changes color at the zero mark:' },
            { type: 'bullet', text: 'Above 0: Primary Color (Green/Blue)' },
            { type: 'bullet', text: 'Below 0: Red' },

            { type: 'heading2', text: 'Statistics' },
            { type: 'bullet', text: 'Average: Sum of the active view\'s monthly values ÷ number of months' },
            { type: 'bullet', text: 'Streak: Consecutive months on the same side of zero' },

            { type: 'divider' },
            { type: 'heading1', text: '3. Cumulative Spending Chart' },

            { type: 'heading2', text: 'Historical Average Curve' },
            { type: 'paragraph', text: 'Calculates average daily cumulative spending across past N months.' },
            { type: 'formula', text: 'Avg(Day N) = Sum(Cumulative at Day N for all history) / Month Count' },

            { type: 'heading2', text: 'Projection Logic' },
            { type: 'formula', text: 'Projected = Current + (DailyIncrement × RemainingDays)' },
            { type: 'paragraph', text: 'Where DailyIncrement is based on your historical average for those specific remaining days.' },

            { type: 'heading2', text: 'Insight Message' },
            { type: 'formula', text: 'Diff = CurrentData[last] - AvgData[sameDay]' },
            { type: 'bullet', text: 'Diff > 0: "Pacing above average"' },
            { type: 'bullet', text: 'Diff < 0: "Pacing below average"' },

            { type: 'divider' },
            { type: 'heading1', text: '4. Comparison Chart' },

            { type: 'heading2', text: 'Pro-Rating Logic' },
            { type: 'formula', text: 'Pro-Rated = (Current Spending / Days Elapsed) × Total Days in Month' },
            { type: 'blockquote', text: 'Note: Projection assumes even spending throughout the month.' },

            { type: 'heading2', text: 'Compare Mode: Data Layers' },
            { type: 'bullet', text: '1. This Month (Actual + Pro-Rated Projection)' },
            { type: 'bullet', text: '2. Last Month (Actual)' },
            { type: 'bullet', text: '3. Avg 3M' },
            { type: 'bullet', text: '4. Avg 6M' },
            { type: 'bullet', text: '5. Avg 1Y' },

            { type: 'heading2', text: 'Trend Mode' },
            { type: 'paragraph', text: 'Plots the same metric over a selectable range — 6 Months, 1 Year, 3 Years, or All Time — instead of a single-month bar comparison. When viewing 1 Year, use the year selector to browse prior 12-month windows.' },

            { type: 'divider' },
            { type: 'heading1', text: '5. Income Analysis' },

            { type: 'heading2', text: 'Projection Strategy' },
            { type: 'formula', text: 'Projection = max(currentMonthIncome, historicalAverage)' },
            { type: 'paragraph', text: 'Assumes you will earn at least your historical average by month end.' },

            { type: 'heading2', text: 'Growth Insight' },
            { type: 'formula', text: 'Growth = ((LastMonth - PrevMonth) / PrevMonth) × 100' },
            { type: 'bullet', text: 'Displays "Income grew/down by X%"' },
            { type: 'bullet', text: 'If PrevMonth was $0: shows +100% growth if LastMonth has income, otherwise "stable" — never divides by zero' },

            { type: 'divider' },
            { type: 'heading1', text: '6. Expense Analysis' },

            { type: 'heading2', text: 'Budget Integration' },
            { type: 'formula', text: 'progress = (spent / budgetLimit) × 100' },
            { type: 'bullet', text: 'Green: <80%' },
            { type: 'bullet', text: 'Orange: 80-100%' },
            { type: 'bullet', text: 'Red: >100%' },

            { type: 'heading2', text: 'Smart Sorting Priority' },
            { type: 'bullet', text: '1. Over-budget categories' },
            { type: 'bullet', text: '2. Categories with a budget set' },
            { type: 'bullet', text: '3. Highest spending' },

            { type: 'heading2', text: 'Group vs Item Toggle' },
            { type: 'paragraph', text: 'Switches the breakdown between parent Category (Group) and specific sub-category (Item) level. Your last choice is remembered next time you open Insights.' },

            { type: 'divider' },
            { type: 'heading1', text: '7. Smart Alerts' },

            { type: 'heading2', text: 'Spending Spike Detection' },
            { type: 'paragraph', text: 'Triggered if ALL conditions are met:' },
            { type: 'bullet', text: '1. The category has at least 3 past transactions and 1+ months of history' },
            { type: 'bullet', text: '2. Its historical monthly average is at least 50 (in your currency) — tiny categories are skipped to avoid noise' },
            { type: 'bullet', text: '3. Current spending is more than 50% above that average' },
            { type: 'bullet', text: '4. The absolute increase is more than 100 (in your currency)' },
            { type: 'paragraph', text: 'Severity is High if the increase is over 100%, otherwise Medium.' },

            { type: 'heading2', text: 'Budget Exceeded Detection' },
            { type: 'formula', text: 'Triggered when: Category Spent > Category Budget' },

            { type: 'heading2', text: 'Runway Drop Detection' },
            { type: 'formula', text: 'Triggered when: Runway has dropped 25% or more vs. last month' },

            { type: 'divider' },
            { type: 'heading1', text: 'Edge Cases Handled' },
            { type: 'heading2', text: 'Common Safeguards' },
            { type: 'bullet', text: 'Division by Zero: Income ≤ 0 → Rate = 0%' },
            { type: 'bullet', text: 'Negative Income: caught before the division, so a negative income figure can never flip Savings Rate\'s sign into a false positive percentage — it\'s forced to 0% instead' },
            { type: 'bullet', text: 'Income Analysis\' Growth %: if last month is being compared against a $0 prior month, it shows +100% (or 0% if both months are $0) instead of dividing by zero' },
            { type: 'bullet', text: 'Empty Datasets: Shows "No data"' },
            { type: 'bullet', text: 'Account Age: Burn rate respects actual history' },
            { type: 'bullet', text: 'Negative Values: Handled for Savings, Cash Flow, and Runway' },
            { type: 'bullet', text: 'Debts: Only active, payable debts count toward Burn Rate / Runway — receivables and settled debts are excluded' }
        ]
    },
    {
        id: 'debt-strategy',
        title: 'Debt Strategy',
        subtitle: 'Payoff plans, interest cost, and payments',
        icon: 'trending-down-outline',
        color: '#FF5722',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Debt Strategy Overview' },
            { type: 'paragraph', text: 'This guide explains the cards, payoff strategies, and payment tracking on the Debt Strategy screen.' },
            { type: 'divider' },

            { type: 'heading2', text: 'Payable vs Receivable' },
            { type: 'blockquote', text: 'Payable = money you owe (a loan, credit card, mortgage). Receivable = money someone owes you (you lent it out).' },
            { type: 'bullet', text: 'Receivable debts don\'t count toward your Financial Runway or Burn Rate in Insights, since they\'re not a bill you owe' },
            { type: 'bullet', text: 'Recording a payment on a Receivable logs Transfer In + Income, instead of Transfer Out + Expense' },

            { type: 'divider' },
            { type: 'heading2', text: 'The Cards' },

            { type: 'heading3', text: 'Estimated Debt-Free Date' },
            { type: 'blockquote', text: 'Shows: When you\'ll be debt-free, simulated month by month using your active debts\' minimum payments.' },
            { type: 'bullet', text: 'Includes total interest you\'re projected to pay along the way' },
            { type: 'bullet', text: 'If a debt\'s minimum payment doesn\'t cover its own interest, a red warning banner names it — its balance would otherwise never shrink' },

            { type: 'heading3', text: 'Interest Leak' },
            { type: 'blockquote', text: 'Shows: How much interest is quietly accumulating every hour, based on your current balances and rates.' },
            { type: 'bullet', text: 'Makes an abstract yearly rate feel immediate' },

            { type: 'heading3', text: 'Total Debt & Time Cost' },
            { type: 'blockquote', text: 'Shows: Your combined outstanding balance, and how many months of your normal spending that balance represents.' },
            { type: 'bullet', text: 'Time Cost uses your 6-month Burn Rate from Insights as the yardstick' },

            { type: 'divider' },
            { type: 'heading2', text: 'Payoff Strategy' },
            { type: 'paragraph', text: 'Choose how your Priority Payoff Order is ranked:' },
            { type: 'bullet', text: 'Avalanche — highest interest rate first. Mathematically minimizes total interest paid.' },
            { type: 'bullet', text: 'Snowball — smallest balance first. Clears individual debts faster for a motivational win.' },
            { type: 'paragraph', text: 'Overdue and due-soon debts always jump to the top of the list regardless of strategy.' },

            { type: 'divider' },
            { type: 'heading2', text: 'Recording a Payment' },
            { type: 'paragraph', text: 'Tap "Pay Now" on any debt to log a payment split up to three ways:' },
            { type: 'bullet', text: 'Principal — reduces your debt balance' },
            { type: 'bullet', text: 'Interest — the cost of borrowing; doesn\'t reduce your balance' },
            { type: 'bullet', text: 'Fee / Insurance — optional add-ons like MRI (Mortgage Redemption Insurance) or Fire Insurance' },
            { type: 'paragraph', text: 'Principal and Interest are pre-filled with an estimate based on your minimum payment and interest type — edit them if your actual statement differs.' },

            { type: 'heading3', text: 'Interest Types' },
            { type: 'bullet', text: 'Fixed / Variable — interest is charged on your current remaining balance (reducing balance)' },
            { type: 'bullet', text: 'Flat — interest is charged on the original loan amount for its whole life, even as you pay it down' },
            { type: 'bullet', text: 'None — no interest charged' },

            { type: 'divider' },
            { type: 'heading2', text: 'Math & Formulas' },

            { type: 'heading3', text: 'Current Balance' },
            { type: 'formula', text: 'Balance = max(0, Original Amount − Payments Toward Principal So Far)' },

            { type: 'heading3', text: 'Interest Leak' },
            { type: 'formula', text: 'Hourly Leak = (Σ Annual Interest) ÷ 365 ÷ 24' },
            { type: 'bullet', text: 'Fixed / Variable / None: Annual Interest = Current Balance × Annual Rate ÷ 100 (0 for None)' },
            { type: 'bullet', text: 'Flat: Annual Interest = Original Amount × Annual Rate ÷ 100 — always based on what you originally borrowed, since Flat interest never shrinks as you pay it down' },

            { type: 'heading3', text: 'Debt-Free Date & Total Interest' },
            { type: 'paragraph', text: 'Simulated month by month (up to 100 years): each month, interest accrues on every active debt, then its minimum payment is applied.' },
            { type: 'bullet', text: 'Fixed / Variable: Interest = Current Balance × (Rate ÷ 12)' },
            { type: 'bullet', text: 'Flat: Interest = Original Amount × (Rate ÷ 12) — always based on what you originally borrowed' },
            { type: 'paragraph', text: 'Debt-Free Date is the month every balance reaches zero. Total Interest is every month\'s interest summed across all debts.' },
            { type: 'blockquote', text: 'If a debt\'s minimum payment doesn\'t even cover its interest, the balance never shrinks — a warning banner calls this out by name instead of quietly showing a ~100-year freedom date.' },

            { type: 'heading3', text: 'Payoff Progress' },
            { type: 'formula', text: 'Progress % = (Original Amount − Current Balance) ÷ Original Amount × 100' },

            { type: 'heading3', text: 'Next Payment Breakdown' },
            { type: 'formula', text: 'Interest = Current Balance × (Rate ÷ 12), or Original Amount × (Rate ÷ 12) for Flat' },
            { type: 'formula', text: 'Principal = Minimum Payment − Interest, capped at the remaining balance' },

            { type: 'heading3', text: 'Next Due Date' },
            { type: 'paragraph', text: 'Based on the day-of-month you started the debt. The due date only rolls to next month once what you\'ve paid toward this debt so far this month (principal + interest + fees) adds up to at least your minimum payment — a partial or extra payment alone won\'t hide the remaining balance still due.' },

            { type: 'divider' },
            { type: 'heading2', text: 'Edge Cases Handled' },
            { type: 'bullet', text: 'Debts fully paid off (or forgiven) move to the "Paid Off" list with their timeline and total interest cost' },
            { type: 'bullet', text: 'A balance that reaches zero mid-simulation stops accruing further interest' },
            { type: 'bullet', text: 'Interest exceeding the minimum payment never produces a negative principal amount' },
            { type: 'bullet', text: 'A minimum payment that doesn\'t cover interest is flagged with a warning naming the debt, instead of silently projecting a distant or inflated payoff' },
            { type: 'bullet', text: 'A partial payment below your minimum doesn\'t prematurely mark the month as "paid" and hide the remaining Due Soon / Overdue status' }
        ]
    },
    {
        id: 'investments',
        title: 'Investments',
        subtitle: 'Portfolio stats, Smart Advisor, and dividends',
        icon: 'trending-up-outline',
        color: '#00BFA5',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Investments Overview' },
            { type: 'paragraph', text: 'This guide explains the portfolio stats, allocation chart, dividend tracking, and Smart Advisor on the Investments screen.' },
            { type: 'divider' },

            { type: 'heading2', text: 'Portfolio Stats' },

            { type: 'heading3', text: 'Total Equity' },
            { type: 'blockquote', text: 'Shows: The current market value of everything you hold.' },
            { type: 'bullet', text: 'Subtitle shows this month\'s net amount invested — green if you added money, red if you withdrew via selling' },

            { type: 'heading3', text: 'Realized P/L' },
            { type: 'blockquote', text: 'Shows: Profit or loss you\'ve already locked in by selling.' },
            { type: 'bullet', text: 'Comes from your logged Capital Gain / Capital Loss transactions' },
            { type: 'bullet', text: 'Subtitle shows this as a percentage of what those sold shares originally cost you' },

            { type: 'heading3', text: 'Unrealized P/L' },
            { type: 'blockquote', text: 'Shows: Paper profit or loss on what you\'re still holding — the gap between what it\'s worth now and what you paid.' },
            { type: 'bullet', text: 'Green if positive, red if negative' },
            { type: 'bullet', text: 'Subtitle shows this as a percentage of your cost basis' },

            { type: 'heading3', text: 'Total Dividends Received' },
            { type: 'blockquote', text: 'Shows: All dividend income ever recorded.' },
            { type: 'bullet', text: 'Subtitle shows dividends received this month' },

            { type: 'divider' },
            { type: 'heading2', text: 'Holdings List' },
            { type: 'paragraph', text: 'One card per asset you hold.' },
            { type: 'bullet', text: 'Price and gain/loss %, with an allocation bar showing its share of your portfolio' },
            { type: 'bullet', text: 'Dividend yield badge and an estimated annual dividend income for that holding' },
            { type: 'bullet', text: 'Sort by Allocation, Alphabetical, P/L amount, P/L %, or Yield' },

            { type: 'heading2', text: 'Allocation Chart' },
            { type: 'blockquote', text: 'Shows: How your money is spread out, as a treemap — box size reflects weight in your portfolio.' },
            { type: 'bullet', text: 'Switch between Stocks, Sector, and Type views' },
            { type: 'bullet', text: 'Color intensity reflects how much that holding is up or down' },

            { type: 'heading2', text: 'Dividend Chart' },
            { type: 'blockquote', text: 'Shows: Your dividend income over time and what\'s coming next.' },
            { type: 'bullet', text: 'Actual — dividends you\'ve actually received, by year' },
            { type: 'bullet', text: 'Calendar — a month-by-month grid of dividend events' },
            { type: 'bullet', text: 'Projected — an estimate of upcoming dividends based on each holding\'s history' },

            { type: 'divider' },
            { type: 'heading2', text: 'Smart Advisor' },
            { type: 'paragraph', text: 'Automatically scans your stock holdings and flags four kinds of opportunities.' },
            { type: 'bullet', text: 'Crash — a stock has dropped more than 15% from its 30-day high' },
            { type: 'bullet', text: 'Dip — a stock is 5–15% off its 30-day high, or sitting more than 3% below your own average cost' },
            { type: 'bullet', text: 'Dividend — a holding has an ex-dividend date coming up within 30 days' },
            { type: 'bullet', text: 'Balance — a sector makes up less than 10% of your stock portfolio, with a suggested stock to fill the gap' },
            { type: 'paragraph', text: 'Filter by All, Divs, Dips (also covers Crash alerts), or Balance. Multiple flags on the same stock merge into one card.' },

            { type: 'divider' },
            { type: 'heading2', text: 'Math & Formulas' },

            { type: 'heading3', text: 'Cost Basis' },
            { type: 'paragraph', text: 'Uses weighted-average cost, not FIFO.' },
            { type: 'formula', text: 'New Average Cost = (Old Total Cost Basis + Buy Price × Qty + Fees) ÷ (Old Qty + Qty)' },
            { type: 'paragraph', text: 'Old Total Cost Basis is the dollar value of everything you already held (Old Average Cost × Old Qty) — a total, not a per-share figure.' },
            { type: 'paragraph', text: 'Selling reduces quantity and cost basis proportionally — it never changes your average cost.' },

            { type: 'heading3', text: 'Realized P/L' },
            { type: 'formula', text: 'Realized P/L % = Realized P/L ÷ Cost Basis of Shares Sold × 100' },
            { type: 'paragraph', text: 'This is relative to what the shares you sold originally cost you — not your remaining holdings.' },

            { type: 'heading3', text: 'Unrealized P/L' },
            { type: 'formula', text: 'Unrealized P/L = Market Value − Cost Basis' },
            { type: 'formula', text: 'Unrealized P/L % = Unrealized P/L ÷ Cost Basis × 100' },

            { type: 'heading3', text: 'Dividend Yield' },
            { type: 'formula', text: 'Yield % = Trailing 12-Month Dividend per Share ÷ Current Price × 100' },
            { type: 'formula', text: 'Estimated Annual Income = Holding Value × Yield %' },

            { type: 'heading3', text: 'Smart Advisor Thresholds' },
            { type: 'formula', text: 'Drop From 30-Day High = (30-Day High − Current Price) ÷ 30-Day High × 100' },
            { type: 'bullet', text: 'Crash: Drop of 15% or more' },
            { type: 'bullet', text: 'Dip: Drop between 5% and 15%, or your price is 3%+ below your own average cost' },
            { type: 'bullet', text: 'Dividend: ex-dividend date within the next 30 days' },
            { type: 'bullet', text: 'Balance: sector allocation below 10% of your stock portfolio' },

            { type: 'heading3', text: 'Projected Dividends' },
            { type: 'paragraph', text: 'For each month, uses that month\'s dividend history if you have it; otherwise falls back to the same month last year. Amounts are converted to your profile currency.' },

            { type: 'divider' },
            { type: 'heading2', text: 'Edge Cases Handled' },
            { type: 'bullet', text: 'No price history: Smart Advisor skips a holding rather than guessing' },
            { type: 'bullet', text: 'No holding at all (zero cost basis, zero market value): P/L % shows 0% instead of dividing by zero' },
            { type: 'bullet', text: 'Free or gifted shares (zero cost basis, real market value): P/L % shows "N/A" instead of a misleading 0%, since the return is mathematically undefined, not flat' },
            { type: 'bullet', text: 'Non-stock holdings (Funds, Bonds, Crypto, etc.): excluded from Smart Advisor, which is stock-specific' }
        ]
    },
    {
        id: 'changelog',
        title: 'Change Logs',
        subtitle: 'Version history and release notes',
        icon: 'git-branch-outline',
        color: '#607D8B',
        type: 'document',
        content: parseMarkdownToContentItems(CHANGELOG_MARKDOWN)
    }
];
