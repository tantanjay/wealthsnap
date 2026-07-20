# WealthSnap – TODO

Working notes for planned improvements. Not scheduled to a release yet.

---

## 🤖 Multi-Provider LLM Support

Currently every AI call is hardcoded to Google's `@google/genai` SDK. Goal: let users choose their provider (OpenAI, Claude, Ollama, self-hosted) and model, not just bring a Gemini key.

- [ ] Design a provider-agnostic interface (`chat()`, `stream()`, `analyzeImage()`) to sit in front of [geminiService.ts](src/services/integrations/geminiService.ts) and [geminiChatService.ts](src/services/integrations/geminiChatService.ts)
- [ ] Implement OpenAI provider adapter (structured JSON output, vision input, streaming, usage metadata all have equivalents)
- [ ] Implement Claude (Anthropic) provider adapter
- [ ] Implement Ollama / self-hosted adapter (OpenAI-compatible endpoint — should ride on the OpenAI adapter with a configurable base URL)
- [ ] Add model selection UI — [GeminiSettingsModal.tsx](src/components/profile/settings/GeminiSettingsModal.tsx) currently only has an API key field, no model picker despite `modelId` already being stored via `getAIConfig`/`saveAIConfig`
- [ ] Rework or gate the AI-assisted price/dividend history feature — it depends on Gemini's `googleSearch` grounding tool ([geminiService.ts:478](src/services/integrations/geminiService.ts:478)), which has no equivalent on Ollama/self-hosted models; needs a fallback (disable, or bring-your-own search API)
- [ ] Update pricing table ([geminiService.ts:50](src/services/integrations/geminiService.ts:50)) to be per-provider instead of Gemini-only
- [ ] Update AI Data Usage Consent copy to reflect provider choice

---

## 💰 Budget Management

- [x] ~~**Reality check button** — compare set budgets against actual spending patterns and surface two kinds of gaps~~ — shipped as **Smart Suggestions** (sparkles icon, top-right of [BudgetManagementModal.tsx](src/components/profile/BudgetManagementModal.tsx)), opening [SmartSuggestionsModal.tsx](src/components/profile/SmartSuggestionsModal.tsx): computes trailing-12-month category averages via `getCategoryAverages`, lists out-of-sync budgets (>15% and >₱50 gap) and unbudgeted-but-spending categories, with an editable amount + delete-row per category and a bulk "Update Budgets" apply
- [x] ~~**Add total** — show a summed total label across all budgets, not just per-category amounts~~

---

## 💬 Chat

- [x] ~~**Sanity context** — in the date-range picker, add a follow-up question letting users exclude specific sensitive categories (e.g. Credit Payment) from what's sent to the LLM~~ — added a category-exclusion step before the range picker in [ChatScreen.tsx](src/screens/ChatScreen.tsx), backed by `getAvailableCategories`/`fetchChatContextInputs(excludeCategories)` in [chatContextService.ts](src/services/domain/chatContextService.ts). Excluded categories are stripped from category-level detail (breakdowns, top expenses, budget alerts) and rolled into one lifetime "Private Categories" line in the snapshot — but totals (Total Cash, burn rate, monthly income/expense/savings rate) always compute from the full unfiltered data, so hiding a category can no longer skew those numbers (first cut of this wrongly dropped the transactions outright, which corrupted Total Cash — fixed same session)
- [x] ~~**Include Budgets in Snapshot** — add budget data to the financial snapshot built in chatContextService.ts~~ — `buildFinancialSnapshotData` now takes `budgets` and renders a "Current Month Budgets" section ([financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts))
- [x] ~~**Monthly Summary over-budget detail** — when a category is flagged over budget, also include what the budget was actually set to, not just the overage~~ — `BudgetAlert` now carries `budgetAmount`/`spentAmount` ([monthlySummaryBuilder.ts](src/utils/monthlySummaryBuilder.ts))
- [x] ~~**Explain savings rate** — clarify/expand what "savings rate" means in the context sent to the LLM so it has enough to reason about accurately~~ — added a one-time glossary note in the snapshot text explaining the formula and that transfers/investments/debt payments count as savings, not expenses
- [x] ~~**Top spending notes** — if a transaction has a written note, surface it in the top-spending summary since a note is often a flag worth explaining~~ — `TopTransactionItem.note` flows through to the "Top Expenses" line
- [x] ~~**Copy context button labeling** — in "View Context", relabel the Copy button and add a privacy disclaimer near it~~ — button now reads "Copy for another AI" with a disclaimer banner above the context text in [ChatScreen.tsx](src/screens/ChatScreen.tsx)

---

## 📦 Backup & Restore

- [ ] **Scheduled encrypted backup** — go beyond the current 7-day *reminder* ([BackupReminderModal.tsx](src/components/data/BackupReminderModal.tsx)) to an actual auto-run backup, encrypted and written to a user-chosen folder/cloud-drive path, instead of requiring a manual tap through [BackupModal.tsx](src/components/data/BackupModal.tsx) every time
  - Needs new settings surfaced in Profile — a toggle to enable/disable auto-backup, a folder/cloud-drive path picker, frequency (daily/weekly), and a "last auto-backup" timestamp — living alongside [DataManagementCard.tsx](src/components/data/DataManagementCard.tsx) in [ProfileScreen.tsx](src/screens/ProfileScreen.tsx:171)

### 🔧 Backup & Restore v2 (Refactor)

Current implementation audit: [backupService.ts](src/services/integrations/backupService.ts) (309 lines) does gather→stringify→encrypt→zip→write as one long `createBackup()`, and [DataManagementCard.tsx](src/components/data/DataManagementCard.tsx) (456 lines) bundles Backup, Restore, *and* CSV/TSV Import into a single component — that's the main source of the bloat. Also found: `BackupData.version` exists but restore never branches on it (compatibility today comes purely from optional fields + `safeBulkSave` skipping empty arrays), and the payload gets double-`JSON.stringify`'d before encryption (wasteful, and restore has a defensive unwind for it it shouldn't need).

v2 direction (per discussion):

- [ ] **Split the UI first** — pull CSV/TSV Import out of DataManagementCard.tsx into its own component; unify [BackupModal.tsx](src/components/data/BackupModal.tsx) and [RestoreModal.tsx](src/components/data/RestoreModal.tsx) into one shared password-entry modal (`mode: 'backup' | 'restore'`), since they're currently near-duplicates
- [ ] **Progress feedback** — surface real progress during backup/restore ("Exporting transactions…", "Encrypting…", "Writing file…") instead of the current static "Creating…"/"Restoring…" label
- [ ] **Backward compatibility** — the existing single-blob v1 format must keep restoring correctly through a dedicated legacy path; v2 only changes how *new* backups are written

#### v2 container format spec

Keep the `.zip` wrapper (portable, one file to share/upload), but stop packing everything into one `backup.enc` blob. Instead:

```
wealthsnap_backup_2026-07-20.zip
├── manifest.json              ← plaintext, no financial data
└── entities/
    ├── profile.enc
    ├── transactions.enc
    ├── investments.enc
    ├── debts.enc
    ├── categories.enc
    ├── recurrenceRules.enc
    ├── budgets.enc
    ├── reminders.enc
    ├── transactionReceipts.enc
    ├── assets.enc
    ├── priceHistories.enc
    └── dividendHistories.enc
```

- **`manifest.json`** — unencrypted (contains no financial data, just structure): `{ containerVersion: 2, schemaVersion: "2.1", createdAt, appVersion, entities: [...], counts: { transactions: 4213, investments: 87, ... } }`. Readable *before* the user enters a password, so restore can validate the file and show real numbers ("This backup has 4,213 transactions, 87 investments…") up front instead of failing only after a full decrypt attempt.
- **Each `entities/*.enc`** — that one entity's array, `JSON.stringify`'d *once* (fixes the current double-stringify bug) and AES-encrypted with the same backup password. Same encryption primitive as today (`CryptoJS.AES`), just scoped per-entity instead of one giant string.
- **Self-aware restore = a file check, not a version field to trust**: if `manifest.json` exists → v2 reader; else if `backup.enc` exists at the root → legacy reader (today's `restoreFromBackup` path, untouched). No user-facing version picker either way.
- **Restore order must preserve foreign keys** — `transactions.enc` has to be decrypted and ID-sanitized *before* `transactionReceipts.enc`, since receipts remap `transactionId` off the transaction ID map (same dependency that exists in today's code, just now spread across files instead of one object).
- **Streaming depends on the File System Migration below** — as spec'd with today's tooling (JSZip + `expo-file-system/legacy`), this isn't true chunked disk I/O: JSZip still assembles the final archive in memory before `writeAsStringAsync` writes it in one shot. Per-entity processing still helps (no single giant JSON string + giant ciphertext string coexisting in memory, real per-entity progress ticks), but *real* streaming needs the library swap described below.
- **No forward-compat requirement** — only *new* app versions need to read *old* (v1) backups. Old app versions are not expected to read v2 backups.

#### File System API Migration (prerequisite for real streaming)

Every file I/O call in the app (backup, restore, receipt image handling) goes through `expo-file-system/legacy` — 4 files import it: [geminiService.ts](src/services/integrations/geminiService.ts), [ProfileScreen.tsx](src/screens/ProfileScreen.tsx), [backupService.ts](src/services/integrations/backupService.ts), [DataManagementCard.tsx](src/components/data/DataManagementCard.tsx). That was the working choice back when this project started on Expo SDK 52/53, where the modern API wasn't reliable enough to build on.

- Expo SDK 54 promoted the modern File System API to the *default* export and moved the old one to `/legacy`. The currently-installed `expo-file-system@55.0.24` changelog shows only incremental bug/security fixes since then (a permission check, a path-traversal fix in 55.0.22), not API churn — a reasonable signal it's matured, though it deserves a real test pass before depending on it, not just a changelog read.
- [ ] Migrate all 4 files off `expo-file-system/legacy` onto the modern `File`/`Directory`/`Paths` API
- [ ] Once migrated, use `File.writableStream()` / `readableStream()` (native file handles — see [streams.d.ts](node_modules/expo-file-system/build/streams.d.ts)) for backup/restore instead of one-shot `writeAsStringAsync`/`readAsStringAsync`
- [ ] Swap JSZip for a streaming-capable zip library (e.g. `fflate`'s incremental `Zip`/`Unzip` classes, which push/pull compressed chunks instead of buffering the whole archive) so compression output can be piped straight into the writable stream above
- [ ] This is the actual precondition for true low-memory streaming backups — the per-entity-files spec above works without it, but stays "smaller buffers," not "no buffering"

---

## 🌱 Ideas to Reconsider

Broader brainstorm from a feature-gap pass over README/release notes. Not scoped or committed — revisit and pull individual items up into their own section when ready to act on them.

**History Calendar** (reviewed against [TODOs.txt](TODOs.txt) — see that file for the other items still under consideration)
- Weekly Mini-Summaries — a trailing column per week row showing Weekly Net / Burn Rate on [HistoryCalendar.tsx](src/components/history/HistoryCalendar.tsx); needs a real layout change since the grid is hardcoded to 7 equal-width columns (`width: '14.28%'`)
- Safe-to-Spend Progress Bar — turn the current static number in [HistorySummary.tsx](src/components/history/HistorySummary.tsx:48) into a bar that visually drains as the month progresses

**Budgeting**
- Budget rollover — unspent amount carries into next month instead of resetting, or a "rolling average" budget that self-adjusts
- Split transactions — one receipt/transaction across multiple categories (currently each transaction is single-category)

**Investments**
- Target allocation vs. actual — set a target mix (e.g. 60% stocks / 30% funds / 10% crypto) and get a drift/rebalance nudge, complementing the existing Allocation Heatmap
- Tax-lot aware selling — FIFO/LIFO/specific-lot choice when recording a Sell, since Realized P/L currently doesn't distinguish which lot was sold
- "What-if" buy/sell simulator — preview the runway/net-worth impact of a hypothetical trade before committing

**Debt**
- Extra-payment / refinance simulator distinct from the existing Avalanche/Snowball toggle — "what if I paid ₱2,000 extra this month" or "what if I refinance at 8%"

**Chat / AI** (ties into the Multi-Provider LLM Support section above)
- Actionable suggestions — Chat currently only answers questions; it could propose concrete actions (adjust a budget, flag a subscription) that you approve rather than acting blind
- Voice input for Chat and receipt-less quick-add ("₱500 for gas")

**Insights & Goals**
- Net-worth / FIRE-style goal tracking — set a target number and date, get a progress bar against Wealth Growth Acceleration, since Insights currently reports trends but no explicit user-set target
- User-defined alert thresholds — Smart Alerts' spike/runway-drop thresholds (≥25%) are currently fixed; letting users tune sensitivity would cut noise for people with naturally volatile cash flow

**Reporting / Data Portability**
- PDF/CSV export of Monthly Summary or a custom date range — useful for tax season or sharing with an accountant, and the local narrative-generation engine already exists to build on

**Architecture**
- On-device/local LLM option (e.g. via Ollama) for Chat and receipt scanning — the strongest privacy story given the "zero-knowledge, offline-first" philosophy, and it's the natural payoff of the multi-provider work already in the TODO
