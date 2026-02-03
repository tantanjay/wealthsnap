import { CHANGELOG_MARKDOWN } from '@constants/changeLogData';
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
    | { type: 'bullet'; text: string }
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
            { type: 'paragraph', text: 'These cards answer "Am I financially okay right now?" at a glance.' },

            { type: 'heading3', text: '1. Financial Runway' },
            { type: 'blockquote', text: 'Shows: How many months your current balance can support your lifestyle.' },
            { type: 'bullet', text: 'Measures financial safety' },
            { type: 'bullet', text: 'Highlights risk early' },
            { type: 'paragraph', text: 'User insight: "I can sustain my current spending for X months."' },

            { type: 'heading3', text: '2. Budget Health' },
            { type: 'blockquote', text: 'Shows: How much of your monthly budgets you’ve used (percentage).' },
            { type: 'bullet', text: 'Early warning before overspending' },
            { type: 'bullet', text: 'Easier to understand than raw numbers' },
            { type: 'paragraph', text: 'User insight: "My spending is healthy / getting risky."' },

            { type: 'heading3', text: '3. Net Cash Flow' },
            { type: 'blockquote', text: 'Shows: Income minus expenses for the current month.' },
            { type: 'bullet', text: 'Indicates progress or regression' },
            { type: 'bullet', text: 'Simple profitability signal' },
            { type: 'paragraph', text: 'User insight: "I’m moving forward / falling behind this month."' },

            { type: 'heading3', text: '4. Savings Rate' },
            { type: 'blockquote', text: 'Shows: Percentage of income saved this month.' },
            { type: 'bullet', text: 'Standard wealth metric' },
            { type: 'bullet', text: 'Scales across any income level' },
            { type: 'paragraph', text: 'User insight: "How efficiently am I saving what I earn?"' },

            { type: 'heading3', text: '5. Total Income' },
            { type: 'blockquote', text: 'Shows: All income received this month.' },
            { type: 'bullet', text: 'Baseline for all other insights' },
            { type: 'bullet', text: 'Useful for variable income earners' },

            { type: 'heading3', text: '6. Total Expense' },
            { type: 'blockquote', text: 'Shows: All spending recorded this month.' },
            { type: 'bullet', text: 'Clear cost awareness' },
            { type: 'bullet', text: 'No category noise' },

            { type: 'heading3', text: '7. Burn Rate' },
            { type: 'blockquote', text: 'Shows: Average monthly spending based on recent history.' },
            { type: 'bullet', text: 'More realistic than a single month' },
            { type: 'bullet', text: 'Powers runway and projections' },
            { type: 'paragraph', text: 'User insight: "This is what my lifestyle actually costs."' },

            { type: 'heading3', text: '8. Daily Average' },
            { type: 'blockquote', text: 'Shows: Average amount spent per day this month.' },
            { type: 'bullet', text: 'Helps pace spending mid-month' },
            { type: 'bullet', text: 'Easy mental model' },

            { type: 'heading3', text: '9. Annualized Expense' },
            { type: 'blockquote', text: 'Shows: Estimated yearly spending based on burn rate.' },
            { type: 'bullet', text: 'Connects daily habits to long-term impact' },
            { type: 'bullet', text: 'Helps plan income needs' },

            { type: 'heading3', text: '10. Top Category' },
            { type: 'blockquote', text: 'Shows: Highest spending category this month.' },
            { type: 'bullet', text: 'Identifies biggest money drain' },
            { type: 'bullet', text: 'Highlights optimization opportunities' },

            { type: 'divider' },
            { type: 'heading2', text: 'Charts & Trends' },
            { type: 'paragraph', text: 'Charts answer "Where am I heading?", not just where I am.' },

            { type: 'heading3', text: 'Savings Rate Trend' },
            { type: 'blockquote', text: 'Shows: Monthly savings performance over time.' },
            { type: 'bullet', text: 'Reveals consistency' },
            { type: 'bullet', text: 'Highlights improvement or decline' },
            { type: 'paragraph', text: 'Key insights: Average savings rate, Positive vs negative months, Current saving or overspending streak.' },

            { type: 'heading3', text: 'Cumulative Spending Chart' },
            { type: 'blockquote', text: 'Shows: How fast you’re spending this month vs your historical average.' },
            { type: 'bullet', text: 'Detects overspending early' },
            { type: 'bullet', text: 'Predicts month-end outcome' },
            { type: 'paragraph', text: 'Includes: Actual spending (solid line), Projected spending (dotted line), Pacing insight.' },

            { type: 'heading3', text: 'Monthly Comparison Chart' },
            { type: 'blockquote', text: 'Shows: This month compared to last month and historical averages.' },
            { type: 'bullet', text: 'Adds context to partial-month data' },
            { type: 'bullet', text: 'Prevents overreaction' },

            { type: 'heading3', text: 'Income Analysis' },
            { type: 'blockquote', text: 'Shows: Income stability and growth trends.' },
            { type: 'bullet', text: 'Highlights volatility' },
            { type: 'bullet', text: 'Useful for freelancers and variable income users' },

            { type: 'heading3', text: 'Expense Analysis' },
            { type: 'blockquote', text: 'Shows: Spending breakdown by category with budget awareness.' },
            { type: 'bullet', text: 'Surfaces actionable problem areas' },
            { type: 'bullet', text: 'Prioritizes over-budget categories' },

            { type: 'divider' },
            { type: 'heading2', text: 'Smart Alerts' },
            { type: 'paragraph', text: 'Automatically detected unusual spending behavior.' },
            { type: 'bullet', text: 'Catches anomalies users may miss' },
            { type: 'bullet', text: 'Reduces mental load' },
            { type: 'paragraph', text: 'Examples: Spending spike alerts, Category anomaly warnings.' }
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
            { type: 'formula', text: 'Runway = Net Liquid Balance ÷ Burn Rate' },
            { type: 'bullet', text: 'Net Liquid Balance = (Income + Transfer In) - (Total Expenses + Transfer Out)' },
            { type: 'bullet', text: 'Burn Rate = Average monthly expenses' },
            { type: 'paragraph', text: 'Color Coding:' },
            { type: 'bullet', text: 'Green: ≥6 months' },
            { type: 'bullet', text: 'Orange: 3-6 months' },
            { type: 'bullet', text: 'Red: <3 months' },

            { type: 'heading2', text: 'Budget Health' },
            { type: 'formula', text: 'Health = (Total Spent in Budgeted Categories ÷ Total Budget Amounts) × 100' },
            { type: 'paragraph', text: 'Process:' },
            { type: 'bullet', text: '1. Get all budgets for current month' },
            { type: 'bullet', text: '2. Sum total spent in those specific categories' },
            { type: 'bullet', text: '3. Divide by total budget limit' },
            { type: 'paragraph', text: 'Color Coding:' },
            { type: 'bullet', text: 'Green: ≤70% (healthy)' },
            { type: 'bullet', text: 'Orange: 70-90% (warning)' },
            { type: 'bullet', text: 'Red: >90% (danger/over)' },

            { type: 'heading2', text: 'Net Cash Flow' },
            { type: 'formula', text: 'Net Cash Flow = Total Income - Total Expenses' },
            { type: 'paragraph', text: 'For current month only.' },
            { type: 'bullet', text: 'Green: ≥0 (positive)' },
            { type: 'bullet', text: 'Red: <0 (negative)' },

            { type: 'heading2', text: 'Savings Rate' },
            { type: 'formula', text: 'Rate = ((Income - Expenses) ÷ Income) × 100' },
            { type: 'paragraph', text: 'Edge Cases:' },
            { type: 'bullet', text: 'Income = 0 → 0%' },
            { type: 'bullet', text: 'Negative rate shown if expenses > income' },

            { type: 'heading2', text: 'Burn Rate' },
            { type: 'formula', text: 'Burn Rate = Total Expenses ÷ Effective Months' },
            { type: 'paragraph', text: 'Effective Months Logic:' },
            { type: 'blockquote', text: 'Prevents inflated burn rates for new accounts by only averaging over months with actual data.' },
            { type: 'formula', text: 'effectiveMonths = min(monthsBack, accountAgeMonths)' },

            { type: 'heading2', text: 'Daily Average' },
            { type: 'formula', text: 'Daily Average = Total Monthly Expenses ÷ Days in Month' },
            { type: 'bullet', text: 'Uses calendar days (28/30/31), not days elapsed.' },

            { type: 'heading2', text: 'Top Category' },
            { type: 'formula', text: 'Category with highest spending in current month' },
            { type: 'bullet', text: 'Uses SUB_CATEGORY level (e.g., "Groceries")' },

            { type: 'divider' },
            { type: 'heading1', text: '2. Savings Rate Trend' },

            { type: 'heading2', text: 'Chart Scaling Algorithm' },
            { type: 'paragraph', text: 'Smart Scaling Logic ensures 0% is always a grid line.' },
            { type: 'blockquote', text: 'Finds step size (e.g. 5, 10, 25) such that range fits in 4 segments.' },

            { type: 'heading2', text: 'Color Gradient' },
            { type: 'paragraph', text: 'The line changes color at the 0% mark:' },
            { type: 'bullet', text: 'Above 0%: Primary Color (Green/Blue)' },
            { type: 'bullet', text: 'Below 0%: Red' },

            { type: 'heading2', text: 'Statistics' },
            { type: 'bullet', text: 'Average: Sum of rates / months' },
            { type: 'bullet', text: 'Streak: Consecutive months of same sign' },

            { type: 'divider' },
            { type: 'heading1', text: '3. Cumulative Spending Chart' },

            { type: 'heading2', text: 'Historical Average Curve' },
            { type: 'paragraph', text: 'Calculates average daily cumulative spending across past N months.' },
            { type: 'formula', text: 'Avg(Day N) = Sum(Cumulative at Day N for all history) / Month Count' },

            { type: 'heading2', text: 'Projection Logic' },
            { type: 'formula', text: 'Projected = Current + (DailyIncrement × RemainingDays)' },
            { type: 'paragraph', text: 'Where DailyIncrement is based on your historical average for those specific days.' },

            { type: 'heading2', text: 'Insight Message' },
            { type: 'formula', text: 'Diff = CurrentData[last] - AvgData[sameDay]' },
            { type: 'bullet', text: 'Diff > 0: "Pacing above avg"' },
            { type: 'bullet', text: 'Diff < 0: "Pacing below avg"' },

            { type: 'divider' },
            { type: 'heading1', text: '4. Comparison Chart' },

            { type: 'heading2', text: 'Pro-Rating Logic' },
            { type: 'formula', text: 'Pro-Rated = (Current Spending / Days Elapsed) × Total Days in Month' },
            { type: 'alert', text: 'Note: Projection assumes even spending throughout month.', alertType: 'info' },

            { type: 'heading2', text: 'Chart Data Layers' },
            { type: 'bullet', text: '1. This Month (Actual + Projected)' },
            { type: 'bullet', text: '2. Last Month (Actual)' },
            { type: 'bullet', text: '3. Avg 3M' },
            { type: 'bullet', text: '4. Avg 6M' },
            { type: 'bullet', text: '5. Avg 1Y' },

            { type: 'divider' },
            { type: 'heading1', text: '5. Income Analysis' },

            { type: 'heading2', text: 'Projection Strategy' },
            { type: 'formula', text: 'projection = max(currentMonthIncome, historicalAverage)' },
            { type: 'paragraph', text: 'Assumes you will earn at least your historical average by month end.' },

            { type: 'heading2', text: 'Growth Insight' },
            { type: 'formula', text: 'Growth = ((LastMonth - PrevMonth) / PrevMonth) × 100' },
            { type: 'bullet', text: 'Displays "Income grew/down by X%"' },

            { type: 'divider' },
            { type: 'heading1', text: '6. Expense Analysis' },

            { type: 'heading2', text: 'Budget Integration' },
            { type: 'formula', text: 'progress = (spent / budgetLimit) × 100' },
            { type: 'bullet', text: 'Green: <80%' },
            { type: 'bullet', text: 'Orange: 80-100%' },
            { type: 'bullet', text: 'Red: >100%' },

            { type: 'heading2', text: 'Smart Sorting Priority' },
            { type: 'bullet', text: '1. Over-budget categories' },
            { type: 'bullet', text: '2. Budgeted categories' },
            { type: 'bullet', text: '3. Highest spending' },

            { type: 'divider' },
            { type: 'heading1', text: '7. Smart Alerts' },

            { type: 'heading2', text: 'Spending Spike Detection' },
            { type: 'paragraph', text: 'Triggered if ALL conditions met:' },
            { type: 'bullet', text: '1. Current > Historical Average' },
            { type: 'bullet', text: '2. Increase ≥ 50%' },
            { type: 'bullet', text: '3. Absolute Difference ≥ $1,000' },

            { type: 'divider' },
            { type: 'heading1', text: 'Edge Cases Handled' },
            { type: 'heading2', text: 'Common Safeguards' },
            { type: 'bullet', text: 'Division by Zero: Income=0 -> Rate=0%' },
            { type: 'bullet', text: 'Empty Datasets: Shows "No data"' },
            { type: 'bullet', text: 'Account Age: Burn rate respects actual history' },
            { type: 'bullet', text: 'Negative Values: Handled for Savings, Cash Flow, and Runway' }
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
