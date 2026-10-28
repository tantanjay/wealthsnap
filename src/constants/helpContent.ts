import { CHANGELOG_MARKDOWN } from '@constants/changelog';
import { parseMarkdownToContentItems } from '@utils/markdownParser';

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
    type: 'onboarding' | 'document';
    content?: ContentItem[];
}

export const HELP_TOPICS: HelpTopic[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        subtitle: 'The basic guide to WealthSnap',
        icon: 'rocket-outline',
        color: '#4CAF50',
        type: 'onboarding'
    },
    {
        id: 'home-snapshot',
        title: 'Home Snapshot',
        subtitle: 'Net worth, overview rows and privacy modes',
        icon: 'home-outline',
        color: '#3AA39A',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Home Snapshot' },
            { type: 'paragraph', text: 'Home shows your net worth on top, then one row each for Cash, Investments, Loans and Goals, then your 3 most recent transactions. Tap "Overall" to switch every row to "This month". Reorder the rows from the sliders button, which opens the settings for whichever Home tab you are on.' },
            { type: 'paragraph', text: 'The tabs under the greeting open the full lists: Ledger (every transaction by day, with search, filters and a calendar), Holdings, Goals and Loans. Tapping a row jumps to its tab.' },
            { type: 'divider' },
            { type: 'heading2', text: 'Projected Net Worth' },
            { type: 'formula', text: 'Net Worth = Cash + Investments + Goal balances − (Loan principal + Projected future interest)' },
            { type: 'bullet', text: 'Only loans you owe count. Money owed to you isn\'t an asset until it\'s repaid.' },
            { type: 'bullet', text: 'Change this month = Net Worth now − Net Worth at the end of last month. The % divides by last month\'s figure, and shows "—" while that was zero or below.' },
            { type: 'bullet', text: 'Last month\'s figure uses your cash, goal balances and loan principal as of then, and each holding\'s latest price on or before then (or its last trade price). The line under the number shows your past month-ends, 6 months back by default; change it to 1 year, 3 years or all time in Home settings.' },
            { type: 'heading2', text: 'Overview rows' },
            { type: 'bullet', text: 'Cash (Overall): your cash balance. Cash kept = Cash balance ÷ Lifetime income.' },
            { type: 'bullet', text: 'Cash (This month): Monthly net = Income − Expense, with goal-funded purchases left out. Savings rate = (Income − Expense − Debt principal repaid) ÷ Income.' },
            { type: 'bullet', text: 'Investments: market value. Return = Unrealized P/L ÷ Cost of what you still hold. This month: net invested (buys − sells) and the return on shares bought this month that you still hold.' },
            { type: 'bullet', text: 'Loans: what you still owe on active loans. % repaid = (Borrowed − Still owed) ÷ Borrowed. Obligations paid counts principal + interest paid this month (not fees), up to each loan\'s minimum payment, so overpaying one loan doesn\'t cover another.' },
            { type: 'bullet', text: 'Goals: total saved. % to target = Saved (each goal capped at its target) ÷ Total targets. A goal is on track once it reaches its target, or while it has an active recurring contribution. "On plan" means this month\'s contributions reached your goals\' monthly plan.' },
            { type: 'heading2', text: 'Home tabs' },
            { type: 'bullet', text: 'Ledger In / Out: In = Income + Transfer In, Out = Expense + Transfer Out, for this month. That is raw cash movement, so goal contributions, loan payments and investment buys count as Out.' },
            { type: 'formula', text: 'Total return = (Unrealized P/L + Realized P/L + Dividends) ÷ Everything you ever invested' },
            { type: 'bullet', text: 'Holdings: "everything you ever invested" is the cost of what you still hold plus the cost of what you sold. Each holding\'s own return is still unrealized only, like the Investments row above.' },
            { type: 'bullet', text: 'Loans: "Owed to you" uses the same rules as money you owe: % collected = (Lent − Still owed) ÷ Lent, and repayments received count up to each loan\'s minimum.' },
            { type: 'divider' },
            { type: 'heading2', text: 'Privacy modes' },
            { type: 'paragraph', text: 'Open, Discreet or Hidden, picked from the sliders button on Home. See the Privacy Modes guide for what each one shows.' },
        ]
    },
    {
        id: 'runway',
        title: 'What Runway Tells You',
        subtitle: 'How long your cash would last',
        icon: 'hourglass-outline',
        color: '#1976D2',
        type: 'document',
        content: [
            { type: 'heading1', text: 'What Runway Tells You' },
            { type: 'paragraph', text: 'Runway is how many months your tracked cash would last at your usual monthly costs if no more money came in.' },
            { type: 'formula', text: 'Runway = Cash balance ÷ Burn rate' },
            { type: 'paragraph', text: 'Cash balance is everything you\'ve recorded coming in (income, transfers in) minus everything going out (expenses, transfers out). It\'s your tracked balance, so it only matches your bank if every peso is recorded.' },
            { type: 'heading2', text: 'Burn rate' },
            { type: 'paragraph', text: 'What a typical month costs you:' },
            { type: 'bullet', text: 'Your average spending over up to the last 6 full months. With no full month yet: your daily spending since your first transaction × 30.44.' },
            { type: 'bullet', text: 'Plus your loans\' minimum payments.' },
            { type: 'bullet', text: 'Plus your goals\' recurring contributions. Paused goals and goals already at their target don\'t count.' },
            { type: 'bullet', text: 'Left out: purchases paid from a goal (that cash left when you saved it), and loan principal and interest (already inside the minimum payment). Loan fees stay in, since minimum payments don\'t cover them.' },
            { type: 'heading2', text: 'What moves it' },
            { type: 'bullet', text: 'Up: more cash recorded, lower spending, a loan paid off (its minimum payment stops counting).' },
            { type: 'bullet', text: 'Down: spending more, a new loan\'s minimum payment, a new recurring goal contribution.' },
            { type: 'bullet', text: 'Putting money into a goal shortens your runway right away: that cash left your pocket, even though it still counts toward net worth.' },
            { type: 'heading2', text: 'Where you see it' },
            { type: 'bullet', text: 'Home → Snapshot, under net worth, with the change since the end of last month.' },
            { type: 'bullet', text: 'Insights → Runway tile. Its sheet shows the date your cash would last until and how spending, debts and investments move it.' },
            { type: 'bullet', text: 'Alerts: one when runway falls 25% or more below last month\'s, and a monthly reminder while your cash balance is at or below zero.' },
            { type: 'alert', alertType: 'info', text: 'In Discreet mode runway shows as it is, since months don\'t reveal amounts.' },
        ]
    },
    {
        id: 'privacy-modes',
        title: 'Privacy Modes',
        subtitle: 'Open, Discreet and Hidden',
        icon: 'eye-off-outline',
        color: '#607D8B',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Privacy Modes' },
            { type: 'paragraph', text: 'Pick a mode in Home settings (the sliders button on Home). It applies everywhere as soon as you pick it.' },
            { type: 'bullet', text: 'Open: every amount.' },
            { type: 'bullet', text: 'Discreet: only numbers that don\'t reveal how much money is involved: percentages, months, counts and progress bars. Transaction amounts are left out. Useful at a glance in public.' },
            { type: 'bullet', text: 'Hidden: every amount shows as ****, keeping a leading + or − sign.' },
            { type: 'heading2', text: 'What Discreet shows instead' },
            { type: 'bullet', text: 'Home: net worth\'s % change, runway in months, savings rate, cash kept as a % of lifetime income, investment return %, % of loans repaid, % to your goals.' },
            { type: 'bullet', text: 'Ledger: this month\'s Out as a % of In. Holdings: total return and each holding\'s weight. Goals and Loans: % to target, % repaid or collected.' },
            { type: 'bullet', text: 'Insights: each Financial Health number\'s scale-free version (see the Financial Insights guide). Investment boost shows "—".' },
            { type: 'alert', alertType: 'info', text: 'Screens that don\'t have a Discreet version yet show Hidden instead.' },
            { type: 'heading2', text: 'Screenshots' },
            { type: 'paragraph', text: 'In Open and Discreet, screenshots are blocked so your amounts and charts can\'t be captured by accident. Hidden allows them. To allow screenshots for 15 seconds, use Profile → Security → "Reveal for screenshot".' },
        ]
    },
    {
        id: 'goals',
        title: 'Saving with Goals',
        subtitle: 'Set money aside and spend it down',
        icon: 'flag-outline',
        color: '#3AA39A',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Saving with Goals' },
            { type: 'paragraph', text: 'A goal sets aside cash for a purpose, like a Travel Fund or Annual Insurance. The money still counts toward your net worth; it just moves from cash into the goal.' },
            { type: 'heading2', text: 'Using goals' },
            { type: 'bullet', text: 'Home → Goals → "New goal": a name, a target, and optionally a recurring contribution.' },
            { type: 'bullet', text: 'Tap a goal to add funds, withdraw, pause, edit or delete it.' },
            { type: 'bullet', text: 'To spend from a goal, record an expense and pick the goal as its Funding Source.' },
            { type: 'heading2', text: 'How goals affect your numbers' },
            { type: 'bullet', text: 'Putting money in lowers your cash right away, so runway goes down. A recurring contribution also counts in burn rate as a monthly cost, like a bill; a one-off contribution doesn\'t.' },
            { type: 'bullet', text: 'Spending from a goal adds nothing extra to burn rate, runway or your monthly spending trends: the cash already left when you saved it. The purchase still shows in your category breakdown and as "+ from goals" under Total Expense, and never counts against a budget.' },
            { type: 'heading2', text: 'Progress' },
            { type: 'formula', text: '% to target = Saved (each goal counted only up to its target) ÷ All targets' },
            { type: 'bullet', text: 'Capping stops one overfunded goal from hiding one that\'s behind.' },
            { type: 'bullet', text: 'A goal is on track once it reaches its target, or while it has an active recurring contribution. Goals have no target date, so on track doesn\'t mean on pace for a date.' },
            { type: 'bullet', text: 'On plan means this month\'s contributions reached your goals\' combined monthly plan.' },
            { type: 'alert', alertType: 'info', text: 'In Discreet mode Goals shows % to target and how many goals got a contribution this month.' },
        ]
    },
    {
        id: 'insights',
        title: 'Financial Insights',
        subtitle: 'Financial Health grid and charts',
        icon: 'bar-chart-outline',
        color: '#2196F3',
        type: 'document',
        content: [
            { type: 'heading1', text: 'Financial Health & Charts' },
            { type: 'paragraph', text: 'This guide explains what each number and chart shows and the user value behind it.' },
            { type: 'divider' },
            { type: 'heading2', text: 'Financial Health grid' },
            { type: 'paragraph', text: 'Four tiles that answer "Am I financially okay right now?" at a glance. Pick which 4 of the 13 numbers below appear, and in what order, from the sliders button on Insights: the order you check them in is their order on the grid. "Show all" lists every number with its value. Tap a tile or row for its details and "How is this calculated?".' },
            { type: 'paragraph', text: 'Runway, Spending pace, Debt drag and Investment boost always reflect today. The rest follow the month selector; the line under each one says which month it shows.' },

            { type: 'heading3', text: '1. Runway' },
            { type: 'blockquote', text: 'Shows: How many months your current balance can support your lifestyle.' },
            { type: 'bullet', text: 'Measures financial safety' },
            { type: 'bullet', text: '"Current balance" here is your entire transaction history, not just the browsed month — everything you\'ve ever earned and transferred in, minus everything you\'ve ever spent and transferred out' },
            { type: 'bullet', text: 'Includes your mandatory minimum debt payments and your active savings goal contributions, not just everyday spending' },
            { type: 'bullet', text: 'Always reflects today, even while you\'re browsing a past month' },
            { type: 'bullet', text: 'Highlights risk early' },
            { type: 'bullet', text: 'Its sheet shows the change since last month, the date your cash would last until, and how spending, debts and investments move it' },
            { type: 'paragraph', text: 'User insight: "I can sustain my current spending for X months."' },

            { type: 'heading3', text: '2. Spending pace' },
            { type: 'blockquote', text: 'Shows: How this month\'s spending so far compares with your 3-month average by the same day.' },
            { type: 'bullet', text: 'Catches overspending mid-month, before the month is over' },
            { type: 'bullet', text: 'Its sheet adds this month\'s net flow and how many months of self-sustain your net flow buys each year' },

            { type: 'heading3', text: '3. Debt drag' },
            { type: 'blockquote', text: 'Shows: How many months of runway your debt minimum payments cost you.' },
            { type: 'bullet', text: 'Only debts you owe count; money owed to you isn\'t a liability' },
            { type: 'bullet', text: 'Its sheet shows your mandatory payments, interest cost and self-sustain delay, plus an "extra per month" stepper that runs your payoff plan to show how much sooner you\'d be debt-free' },

            { type: 'heading3', text: '4. Investment boost' },
            { type: 'blockquote', text: 'Shows: How many extra months of runway your investments would add if you sold them today.' },
            { type: 'bullet', text: 'Its sheet shows your portfolio value, dividend yield, yearly dividend impact and how much sooner investing your surplus brings self-sustain' },
            { type: 'bullet', text: 'Shown as "—" in Discreet mode, since a large figure would reveal that your investments far exceed your spending' },

            { type: 'heading3', text: '5. Budget Health' },
            { type: 'blockquote', text: 'Shows: How much of your monthly budgets you’ve used (percentage).' },
            { type: 'bullet', text: 'Only counts categories that actually have a budget set' },
            { type: 'bullet', text: 'Purchases funded from a savings goal don\'t count against a budget — the goal was the budget for them' },
            { type: 'bullet', text: 'Early warning before overspending' },
            { type: 'paragraph', text: 'User insight: "My spending is healthy / getting risky."' },

            { type: 'heading3', text: '6. Net Cash Flow' },
            { type: 'blockquote', text: 'Shows: The true net movement of liquid cash for the selected month — income plus transfers in, minus expenses and transfers out.' },
            { type: 'bullet', text: 'Indicates progress or regression' },
            { type: 'bullet', text: 'Contributing to or spending from a savings goal is a transfer, not an expense, so it nets to ₱0 here instead of looking like a cash drop' },
            { type: 'paragraph', text: 'User insight: "I’m moving forward / falling behind this month."' },

            { type: 'heading3', text: '7. Savings Rate' },
            { type: 'blockquote', text: 'Shows: Percentage of income saved this month.' },
            { type: 'bullet', text: 'Standard wealth metric' },
            { type: 'bullet', text: 'Scales across any income level' },
            { type: 'bullet', text: 'Purchases funded from a savings goal don\'t count as an expense here — that money was already set aside as savings when you contributed it' },
            { type: 'bullet', text: 'Debt principal you repay counts as spent, not saved — the rate reflects cash you actually kept' },
            { type: 'paragraph', text: 'User insight: "How efficiently am I saving what I earn?"' },

            { type: 'heading3', text: '8. Total Income' },
            { type: 'blockquote', text: 'Shows: All income received in the selected month.' },
            { type: 'bullet', text: 'Baseline for all other insights' },
            { type: 'bullet', text: 'Useful for variable income earners' },

            { type: 'heading3', text: '9. Total Expense' },
            { type: 'blockquote', text: 'Shows: All spending recorded in the selected month.' },
            { type: 'bullet', text: 'Clear cost awareness' },
            { type: 'bullet', text: 'No category noise' },
            { type: 'bullet', text: 'Excludes purchases funded from a savings goal — that cash already left when you contributed it, not when you later spent it. They\'re shown underneath instead, as "+ ₱X from goals"' },

            { type: 'heading3', text: '10. Burn Rate' },
            { type: 'blockquote', text: 'Shows: Average monthly spending based on recent history, as of today.' },
            { type: 'bullet', text: 'More realistic than a single month' },
            { type: 'bullet', text: 'Includes your mandatory minimum debt payments and your active savings goal contributions' },
            { type: 'bullet', text: 'Excludes purchases funded from a savings goal, so a big goal-funded purchase doesn\'t look like a spending surge' },
            { type: 'bullet', text: 'Always reflects today, even while you\'re browsing a past month' },
            { type: 'bullet', text: 'Powers Runway, Debt drag and Investment boost' },
            { type: 'paragraph', text: 'User insight: "This is what my lifestyle actually costs, debts and goals included."' },

            { type: 'heading3', text: '11. Daily Average' },
            { type: 'blockquote', text: 'Shows: Average amount spent per day so far in the selected month.' },
            { type: 'bullet', text: 'Helps pace spending mid-month' },
            { type: 'bullet', text: 'Easy mental model' },
            { type: 'bullet', text: 'Excludes purchases funded from a savings goal' },

            { type: 'heading3', text: '12. Annualized Expense' },
            { type: 'blockquote', text: 'Shows: Burn Rate projected across a full year.' },
            { type: 'bullet', text: 'Connects daily habits to long-term impact' },
            { type: 'bullet', text: 'Helps plan income needs' },

            { type: 'heading3', text: '13. Top Category' },
            { type: 'blockquote', text: 'Shows: Highest spending category in the selected month.' },
            { type: 'bullet', text: 'Identifies biggest money drain' },
            { type: 'bullet', text: 'Includes purchases funded from a savings goal, so a big goal-funded trip can top the list — the spending breakdown marks how much of each category came from goals' },
            { type: 'bullet', text: 'Highlights optimization opportunities' },

            { type: 'heading3', text: 'In Discreet mode' },
            { type: 'bullet', text: 'Runway, Spending pace, Debt drag, Budget Health and Savings Rate are already scale-free and stay the same' },
            { type: 'bullet', text: 'Net Cash Flow: % of the month\'s income kept. Total Expense: % of income. Total Income: % vs your average of up to 6 prior full months' },
            { type: 'bullet', text: 'Burn Rate and Annualized Expense: % of your average monthly income. Daily Average: % lower or higher than your daily average over the 3 prior full months' },
            { type: 'bullet', text: 'Top Category: its share of spending. Investment boost: "—". Debt drag\'s stepper counts steps instead of amounts' },

            { type: 'divider' },
            { type: 'heading2', text: 'Charts & Trends' },
            { type: 'paragraph', text: 'Charts answer "Where am I heading?", not just where I am.' },

            { type: 'heading3', text: 'Savings Rate Trend' },
            { type: 'blockquote', text: 'Shows: Your monthly performance over time, across three switchable views.' },
            { type: 'bullet', text: 'Rate — the percentage of income you kept each month' },
            { type: 'bullet', text: 'Saved — the raw amount you kept each month (income minus expenses and debt principal repaid), including money moved into investments' },
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
            { type: 'bullet', text: 'Out of Cash — your tracked cash balance is at or below zero; repeats every month it stays there' },
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

            { type: 'heading1', text: '1. Financial Health grid' },

            { type: 'heading2', text: 'Runway' },
            { type: 'formula', text: 'Runway = Net Liquid Balance ÷ Adjusted Burn Rate' },
            { type: 'bullet', text: 'Net Liquid Balance = (Lifetime Income + Lifetime Transfer In) − (Lifetime Total Expenses + Lifetime Transfer Out) — summed across every transaction you\'ve recorded, including ones dated in the future, not just the browsed month. Savings goal contributions/spends are transfers, so they shift money between this balance and your goal balances without changing the total' },
            { type: 'bullet', text: 'Adjusted Burn Rate = Burn Rate + Total Minimum Payments on your active, payable debts + Total Monthly Contributions on your active, not-yet-completed savings goals' },
            { type: 'paragraph', text: 'Both this and Burn Rate are computed as of today, regardless of which month you\'re browsing, and both draw on your full history rather than a single month.' },
            { type: 'formula', text: 'Runway change = Runway now − Runway at the end of last month' },

            { type: 'heading2', text: 'Spending pace' },
            { type: 'formula', text: 'Pace = (Spent this month so far − 3-month average by the same day) ÷ 3-month average × 100' },
            { type: 'bullet', text: 'Excludes purchases funded from a savings goal. Months with no transactions are left out of the average.' },
            { type: 'formula', text: 'Impact on self-sustain = 3-month average Net Cash Flow × 12 ÷ Adjusted Burn Rate' },

            { type: 'heading2', text: 'Debt drag' },
            { type: 'formula', text: 'Debt drag = Runway without debt minimum payments − Runway with them' },
            { type: 'bullet', text: 'Interest cost = Σ balance × monthly rate (Flat-rate loans use the original amount)' },
            { type: 'bullet', text: 'Self-sustain delay = Total debt ÷ ((6-month average income − Adjusted Burn Rate) × 12)' },
            { type: 'bullet', text: '"Extra per month" = how many months sooner your payoff plan (Snowball or Avalanche) reaches zero with the extra added' },

            { type: 'heading2', text: 'Investment boost' },
            { type: 'formula', text: 'Investment boost = Investment market value ÷ Adjusted Burn Rate' },
            { type: 'bullet', text: 'Dividend yield = held shares × annual dividend per share ÷ market value; 7.2% is assumed when there\'s no dividend data' },
            { type: 'bullet', text: 'Annual dividend impact = Market value × Yield ÷ Adjusted Burn Rate (months per year)' },
            { type: 'bullet', text: 'Self-sustain = years until investments reach 300 × monthly costs (without debt minimums), at today\'s average monthly buys vs your full surplus' },

            { type: 'heading2', text: 'Budget Health' },
            { type: 'formula', text: 'Health = (Total Spent in Budgeted Categories ÷ Total Budget Amounts) × 100' },
            { type: 'paragraph', text: 'Process:' },
            { type: 'bullet', text: '1. Get all budgets for the selected month' },
            { type: 'bullet', text: '2. Sum total spent in those specific categories, leaving out purchases funded from a savings goal' },
            { type: 'bullet', text: '3. Divide by total budget limit' },
            { type: 'paragraph', text: 'Color Coding:' },
            { type: 'bullet', text: 'Green: <70% (healthy)' },
            { type: 'bullet', text: 'Orange: 70-90% (warning)' },
            { type: 'bullet', text: 'Red: >90% (danger/over)' },

            { type: 'heading2', text: 'Net Cash Flow' },
            { type: 'formula', text: 'Net Cash Flow = (Income + Transfer In) − (Expenses + Transfer Out)' },
            { type: 'paragraph', text: 'For the selected month only. Nets out transfers (rather than plain Income − Expenses) so a savings goal contribution or a goal-funded purchase — both transfers — don\'t swing this figure even though no real liquid cash left your overall balance.' },

            { type: 'heading2', text: 'Savings Rate' },
            { type: 'formula', text: 'Rate = ((Income − Expenses − Debt Principal Repaid) ÷ Income) × 100' },
            { type: 'paragraph', text: 'Debt Principal Repaid is the principal part of payments on debts you owe (interest is already an expense). It counts as spent, so the rate shows the share of income you actually kept in cash.' },
            { type: 'paragraph', text: 'Expenses here excludes purchases funded from a savings goal — that money was already counted as saved the month you contributed it, so spending it later shouldn\'t look like it un-saves it.' },
            { type: 'paragraph', text: 'Edge Cases:' },
            { type: 'bullet', text: 'Income ≤ 0 → 0%' },
            { type: 'bullet', text: 'Negative rate shown if expenses > income' },

            { type: 'heading2', text: 'Burn Rate' },
            { type: 'formula', text: 'Burn Rate = Total Expenses (prior full months) ÷ Effective Months' },
            { type: 'paragraph', text: '"Total Expenses" here excludes purchases funded from a savings goal (that cash already left when contributed), so a goal-funded purchase doesn\'t look like a spending spike.' },
            { type: 'paragraph', text: 'Effective Months Logic:' },
            { type: 'blockquote', text: 'Averages only full calendar months since your first transaction, so a partly tracked month doesn\'t understate it. Your first month counts only if it started on the 1st, and the current, in-progress month is left out. A full month with no spending still counts, as 0.' },
            { type: 'formula', text: 'effectiveMonths = min(monthsBack, fullMonthsSinceFirstTransaction)' },
            { type: 'paragraph', text: 'No full month yet? The Burn Rate and Runway cards use your daily spending since your first transaction × 30.44 instead.' },
            { type: 'paragraph', text: 'The Burn Rate and Runway cards then strip out all savings-goal transactions and debt principal/interest payments before this calculation (both are already inside a debt\'s minimum payment; debt fees stay in as normal spending, since minimum payments don\'t cover them) and add back your total minimum debt payments plus your active goals\' current monthly-equivalent contribution on top (see Financial Runway above) — a goal already at its target stops counting. The Comparison Chart\'s Avg 3M/6M/1Y bars use plain Burn Rate without that debt/goal adjustment.' },

            { type: 'heading2', text: 'Daily Average' },
            { type: 'formula', text: 'Daily Average = Expenses So Far This Month ÷ Days Elapsed' },
            { type: 'bullet', text: 'Uses days actually elapsed in the current month, not the full calendar length.' },
            { type: 'bullet', text: 'Excludes purchases funded from a savings goal, same as Total Expense and Burn Rate.' },

            { type: 'heading2', text: 'Annualized Expense' },
            { type: 'formula', text: 'Annualized Expense = Burn Rate × 12' },

            { type: 'heading2', text: 'Top Category' },
            { type: 'formula', text: 'Category with highest spending in the selected month' },
            { type: 'bullet', text: 'Uses item level, the category you picked (e.g., "Groceries")' },

            { type: 'heading2', text: 'Discreet versions' },
            { type: 'bullet', text: 'Net Cash Flow ÷ Income × 100 ("kept"); Total Expense ÷ Income × 100' },
            { type: 'bullet', text: 'Total Income vs its average of up to 6 prior full months; Burn Rate (and Annualized Expense) ÷ that average income' },
            { type: 'bullet', text: 'Daily Average vs (3-month average Total Expense ÷ 30.44)' },
            { type: 'bullet', text: 'While a month is in progress, income and expense comparisons use the month so far' },

            { type: 'divider' },
            { type: 'heading1', text: '2. Savings Rate Trend' },
            { type: 'paragraph', text: 'Three switchable views, each its own monthly time series:' },
            { type: 'formula', text: 'Rate(month) = ((Income − Expense − Debt Principal Repaid) ÷ Income) × 100' },
            { type: 'formula', text: 'Saved(month) = Income − Expense − Debt Principal Repaid' },
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
            { type: 'formula', text: 'Triggered when: Runway (same as the Runway card) has dropped 25% or more vs. the end of last month' },

            { type: 'heading2', text: 'Out of Cash Detection' },
            { type: 'formula', text: 'Triggered when: Cash Balance ≤ 0' },
            { type: 'paragraph', text: 'Checked every month, so it keeps reminding you until your balance is back above zero. While it applies, Runway Drop is skipped.' },

            { type: 'divider' },
            { type: 'heading1', text: 'Edge Cases Handled' },
            { type: 'heading2', text: 'Common Safeguards' },
            { type: 'bullet', text: 'Division by Zero: Income ≤ 0 → Rate = 0%' },
            { type: 'bullet', text: 'Negative Income: caught before the division, so a negative income figure can never flip Savings Rate\'s sign into a false positive percentage — it\'s forced to 0% instead' },
            { type: 'bullet', text: 'Income Analysis\' Growth %: if last month is being compared against a $0 prior month, it shows +100% (or 0% if both months are $0) instead of dividing by zero' },
            { type: 'bullet', text: 'Empty Datasets: Shows "No data"' },
            { type: 'bullet', text: 'Account Age: Burn rate respects actual history' },
            { type: 'bullet', text: 'Negative Values: Handled for Savings, Cash Flow, and Runway' },
            { type: 'bullet', text: 'Debts: Only active, payable debts count toward Burn Rate / Runway — receivables and settled debts are excluded' },
            { type: 'bullet', text: 'Savings Goals: A goal-funded purchase is excluded from Expense/Burn Rate totals (the cash already left at contribution time); a goal already at its target amount stops counting its contribution toward Burn Rate / Runway' }
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
            { type: 'paragraph', text: 'This guide explains the payoff plan, strategies and payment tracking on Home\'s Loans tab. Switch between "You owe" and "Owed to you" at the top.' },
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
            { type: 'bullet', text: 'Time Cost uses your 6-month Burn Rate as the yardstick — your everyday living costs, without debt principal/interest or savings-goal transactions (debt fees count as normal spending)' },

            { type: 'divider' },
            { type: 'heading2', text: 'Payoff Strategy' },
            { type: 'paragraph', text: 'Tap the strategy name next to "Payoff plan" to choose how your active loans are ranked:' },
            { type: 'bullet', text: 'Avalanche — highest interest rate first. Mathematically minimizes total interest paid.' },
            { type: 'bullet', text: 'Snowball — smallest balance first. Clears individual debts faster for a motivational win.' },
            { type: 'paragraph', text: 'Overdue and due-soon debts always jump to the top of the list regardless of strategy.' },

            { type: 'divider' },
            { type: 'heading2', text: 'Recording a Payment' },
            { type: 'paragraph', text: 'Tap a loan, then "Record Payment", to log a payment split up to three ways:' },
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
            { type: 'paragraph', text: 'Based on the day-of-month you started the debt — a 29th-31st due day falls on the last day of shorter months. The due date only rolls to next month once what you\'ve paid toward this debt so far this month (principal + interest) adds up to at least your minimum payment — fees don\'t count toward it, and a partial or extra payment alone won\'t hide the remaining balance still due.' },

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
        id: 'faq',
        title: 'FAQ',
        subtitle: 'Common questions',
        icon: 'help-circle-outline',
        color: '#795548',
        type: 'document',
        content: [
            { type: 'heading1', text: 'FAQ' },
            { type: 'heading3', text: 'Where is my data stored?' },
            { type: 'paragraph', text: 'Only on this phone. WealthSnap has no account and no server, so nobody else can see your records.' },
            { type: 'heading3', text: 'Does WealthSnap go online?' },
            { type: 'paragraph', text: 'Only for two things: exchange rates when you record an investment in another currency, and Google Gemini features (chat, receipt scanning, fetching prices and dividends) if you add your own API key.' },
            { type: 'heading3', text: 'How do I move to a new phone?' },
            { type: 'paragraph', text: 'Profile → Data → Import / export → Backup data creates a password-protected file. Copy it to the new phone and use Restore data. If both phones are on the same WiFi, "Sync from device" merges them directly.' },
            { type: 'heading3', text: 'What if I forget my backup password?' },
            { type: 'paragraph', text: 'The backup can\'t be opened without it, and there\'s no way to recover it. Keep it somewhere safe.' },
            { type: 'heading3', text: 'Can I back up automatically?' },
            { type: 'paragraph', text: 'Yes. Profile → Data → Auto backup saves an encrypted backup weekly or every 2 weeks.' },
            { type: 'heading3', text: 'Why doesn\'t my balance match my bank?' },
            { type: 'paragraph', text: 'WealthSnap only knows what you record. Your cash balance is everything recorded coming in minus everything going out.' },
            { type: 'heading3', text: 'Can I change my currency or name?' },
            { type: 'paragraph', text: 'Not in this version. Both are set when you first open the app.' },
            { type: 'heading3', text: 'Why can\'t I take a screenshot?' },
            { type: 'paragraph', text: 'In Open and Discreet, screenshots are blocked to protect your amounts and charts. Switch to Hidden, or use Profile → Security → "Reveal for screenshot".' },
            { type: 'heading3', text: 'Do I need a Gemini API key?' },
            { type: 'paragraph', text: 'Only for the AI features. You bring your own key (Profile → Google Gemini), so you pay Google directly for what you use and WealthSnap stays free.' },
            { type: 'heading3', text: 'I\'m locked out of my PIN.' },
            { type: 'paragraph', text: 'After too many wrong tries, the PIN screen waits 30 seconds before you can try again. If your phone supports it, use your fingerprint or face instead.' },
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
