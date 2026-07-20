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

### 🔧 Backup & Restore v2 (Refactor) — ✅ shipped (Phases 1–3a), Phase 3b held back

Implemented in full: UI split ([BackupRestoreModal.tsx](src/components/data/BackupRestoreModal.tsx), [CsvImportFlow.tsx](src/components/data/CsvImportFlow.tsx)), the v2 container format below ([backupEntities.ts](src/services/integrations/backupEntities.ts), rewritten [backupService.ts](src/services/integrations/backupService.ts)), and the File System API migration off `expo-file-system/legacy`. Along the way also fixed: the double-`JSON.stringify` bug, the ID-remap gap (`Transaction.investmentId`/`debtId`/`recurrenceId` and `Investment.recurrenceId` were previously left dangling on restore if those entities' legacy ids got regenerated — now generalized via `ENTITY_REGISTRY`'s `fkFields`), a null-item bug in `sanitizeIds` (falsy items were pushed into the output array instead of dropped), and a reminder-rescheduling bug (was scheduling notifications off the raw pre-sanitize array instead of the ids actually saved to SQLite). Also found and fixed two more `BackupModal`/`RestoreModal` call sites the original audit missed — `App.tsx`'s 7-day-reminder flow and `SetupScreen.tsx`'s onboarding restore — both now on the unified modal too.

**Phase 3b (JSZip → `fflate` streaming) intentionally not implemented** — turned out riskier/lower-value on inspection: needs a new dependency with a callback-driven API foreign to the rest of the codebase, and since `CryptoJS.AES` isn't incremental here, true streaming could only avoid buffering the whole multi-entity zip at once (not each entity's encrypt/decrypt step) — a real but small win, not worth the risk of unverified native-stream code in a backup feature. Phase 3a's switch to `uint8array` (from base64 strings) already removed the bigger memory cost. Revisit later if large backups prove to be an actual problem.

**Needs a real device/emulator verification pass** — everything above was checked via `tsc`/`eslint` (clean) plus a standalone Node script reproducing the pure ID-remap/container logic (all assertions passed, including the FK-remap fix, wrong-password rejection, and legacy double-stringify fallback), but none of it has run inside the actual RN app — no device/emulator/web build was available in the environment this was built in.

#### v2 container format spec — ✅ shipped as spec'd

`manifest.json` (plaintext, `containerVersion`/`schemaVersion`/`createdAt`/`appVersion`/`entities`/`counts`) + `entities/*.enc` (one `JSON.stringify`'d-once, AES-encrypted file per entity) inside the same `.zip` wrapper. Restore dispatches on file presence (`manifest.json` → v2 reader; else `backup.enc` → untouched legacy reader) — see [backupService.ts](src/services/integrations/backupService.ts)'s `restoreFromBackup`/`restoreV2`/`restoreV1Legacy`, and [backupEntities.ts](src/services/integrations/backupEntities.ts) for the entity registry (`getAll`/`bulkSave`/`hasId`/`fkFields` per entity) that drives both create and restore.

#### File System API Migration — ✅ shipped (the migration itself; streaming held back, see above)

All 4 files (`geminiService.ts`, `ProfileScreen.tsx`, `backupService.ts`, and CSV import — now in `CsvImportFlow.tsx`) migrated off `expo-file-system/legacy` onto the modern `File`/`Directory`/`Paths` API. `backupService.ts` also switched its zip I/O from base64 strings to `Uint8Array` throughout (`JSZip`'s `type: 'uint8array'`, `File.write()`/`.bytes()`), which was the main memory-pressure win from this migration even without the streaming library swap.

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
