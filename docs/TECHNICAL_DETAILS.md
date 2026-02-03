# WealthSnap: Comprehensive Technical Specifications (v1.8.0)

## 1. System Architecture & Evolution
WealthSnap is a high-precision, offline-first personal finance engine built on React Native and the Expo New Architecture.

* **Persistence Layer**: Migrated from flat JSON files to a robust SQLite (`expo-sqlite`) implementation in v1.1.0 for scalability.
* **Schema Management**: Transitioned from a "Waterfall" migration pattern to a streamlined V7 Schema Enforcement policy in v1.8.0 to ensure cold-start performance.
* **Data Ingestion**: Support for bulk CSV/TSV imports with a structured `importService.ts` that handles date validation, duplicate detection, and 50-character note sanitization.
* **Batch Processing**: Implemented non-blocking background decryption in 500-item chunks using `setTimeout(0)` to prevent main-thread jank during large dataset loads.

## 2. Security & Privacy Engineering
The security model is designed for "Zero-Knowledge" operation, ensuring no user data ever touches a remote server.

* **Hybrid Encryption**: Utilizes AES-256 for sensitive fields (amounts, notes) while keeping metadata (dates, category IDs) raw for high-speed SQL indexing.
* **Hardware-Backed Keys**: Encryption keys are generated and stored in the device's Secure Hardware Enclave (SecureStore).
* **Key Caching Logic**: To optimize performance, the AES-256 key is cached in memory after the initial hardware fetch, eliminating redundant SecureStore I/O calls during bulk operations.
* **Dynamic Privacy UI**: 
    * **Screenshot Protection**: Android Activity flags are toggled to block screenshots and app-switcher previews by default.
    * **Conditional Bypass**: Screenshot protection is programmatically disabled only when "Privacy Mode" (masked values) is active, allowing for safe data sharing.
    * **Smart Security Lock**: Intelligent re-authentication logic prevents the PIN lock from triggering during brief backgrounding tasks like camera usage or file sharing.

## 3. Financial Computation Engine
Standard JavaScript floating-point numbers are discarded in favor of a high-precision decimal engine.

* **Precision Layer**: Implementation of `BigNumber.js` for all financial calculations, ensuring totals reconcile perfectly even with 2000+ transaction histories.
* **Investment Mathematics**:
    * **Cost Basis**: Tracks unrealized Profit/Loss (P/L) against the latest known price per asset.
    * **Realized P/L**: Automatically calculates capital gains/losses at the point of SELL transactions.
    * **O(N) Optimization**: Investment computations use O(N) grouping to handle large portfolio histories without linear performance degradation.
* **Predictive Analytics**: 
    * **Monthly Pulse**: Uses linear regression based on 3M/6M/12M historical spending averages to project month-end totals.
    * **Financial Runway**: Calculated using a lifetime "tracked balance" (Income - Expense) relative to current burn rate.

## 4. AI & Machine Learning Implementation (BYOK)
WealthSnap leverages a "Bring Your Own Key" (BYOK) architecture to provide advanced AI features without centralizing user data.

* **On-Device Vision**: Integration of Google ML Kit for document edge detection and perspective correction during receipt scanning.
* **Double-Pass AI Fetching**: 
    1.  **Researcher Mode**: AI performs an iterative search for raw market and dividend data.
    2.  **Accountant Mode**: A second pass with `Temperature 0` ensures the raw data is formatted into a precise, valid JSON structure for SQLite ingestion.
* **Smart Categorization**: ML-based suggestions for categories based on the last 30 days of user behavior.

## 5. Background Services & OS Integration
* **Headless JS (Android)**: A custom background task manager handles notification actions (Snooze/Complete) without requiring the UI to mount.
* **Notification Engine**: Locally-triggered push notifications monitor recurring transactions and budget breaches daily in the background.
* **Catch-up System**: Persistent tracking of snoozed or missed reminders using a batch-processing "Catch-up Modal" on next app launch.
* **Telemetry**: Local-only Global Error Boundary that captures crash logs and saves them to the device for developer debugging without external transmission.

## 6. UI/UX Infrastructure
* **Theming**: Reusable `SettingItem`, `BottomModal`, and `CustomAlert` components that adapt to system Safe Area Insets.
* **Loading Patterns**: Comprehensive skeleton loading system for Home, History, and Insights dashboards to prevent content "jumping".
* **Visual Data Tools**: 
    * **Treemaps**: Color-coded investment allocation heatmap (Size = Value; Color = Performance).
    * **Dynamic Charts**: Y-axis auto-scaling that switches between "Symmetric" and "Standard" modes based on dataset volatility.