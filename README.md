# WealthSnap — Your Financial Mirror

**Version:** v1.8.0  
**Last Updated:** February 3, 2026  
**Status:** Closed Testing (12-Tester Milestone)

---

**WealthSnap** is an offline-first financial mirror built for absolute privacy. It provides a high-resolution reflection of your assets and progress—kept securely on your device, exactly where it belongs.

Built by a developer who wanted a better way to see the *truth* in their numbers, WealthSnap combines **modern encryption standards** with **high-precision math**, without the subscriptions, ads, or cloud-sync trade-offs found in modern apps.

---

## 🔭 Vision & Philosophy

- **Your Standing, Reflected:** WealthSnap is a reflection tool, not a financial advisor. It does not provide recommendations or guidance—only a precise view of your own data.
- **Privacy as a Foundation:** We don’t just protect your data—we don’t collect it. Your financial life stays on your device, not on a server.
- **Accuracy Above All:** Every cent matters. WealthSnap uses an arbitrary-precision math engine to ensure totals reconcile perfectly over years of history.

---

## 🌍 What WealthSnap Does (In Plain Terms)

- **Track Everything:** Income, expenses, transfers, and asset growth in one unified view.
- **Investment Mirror:** Monitor your holdings, cost basis, and portfolio allocation without linking to a brokerage account.
- **Smart Calendar:** See your “Safe-to-Spend” balance and visualize upcoming bills before they happen.
- **Local Insights:** Understand your savings rate, burn rate, and financial runway using your own historical trends.

---

## 🔐 Privacy & Security by Design

> Even the developer cannot see your data—because it never leaves your device.

- **100% Offline-First:** No servers, no accounts, and no third-party tracking. The app works fully offline.
- **Local Encryption:** Sensitive fields such as notes and amounts are encrypted using **AES-256**, leveraging device security features where supported.
- **Total Ownership:** Your data is stored in a local SQLite database. You control the file, the backups, and the lifecycle of your data.

---

## 🤖 Smart Tools (You Control the Key)

WealthSnap includes optional smart features designed with **architectural integrity and user control**:

- **Receipt Scanning:** Extract totals and dates using AI when enabled. Receipt data is stored locally and encrypted.
- **Asset Price Fetching:** AI-assisted retrieval and cross-checking of publicly available market prices when enabled.
- **Bring Your Own Key (BYOK):** To keep the app free and private, you may supply your own Google Gemini API key. Usage and billing are handled directly by the provider, and only when you choose to enable these features.

All smart features are optional and can be disabled at any time.

---

## 💡 Why WealthSnap Is Free

WealthSnap was built as a personal passion project. Its architecture allows it to remain free without monetizing users:

1. **No Servers, No Ongoing Costs:** All data stays on your device.
2. **No Data Collection:** There is no user data to sell or analyze.
3. **Built for the Craft:** This app exists because the developer needed it—and decided to share it.

---

## 🏗️ Technical Highlights (For the Curious)

| Layer | Technology |
|------|------------|
| **Core** | React Native + Expo (New Architecture) |
| **Database** | SQLite (Local-only, Schema V7) |
| **Math Engine** | BigNumber.js (Arbitrary precision, no rounding errors) |
| **Security** | AES-256 Encryption + Device Security Features |

---

## 📌 Developer’s Note

WealthSnap is a 100% independent, solo-developed project. There are no venture capitalists, analytics dashboards, or support teams—just one engineer and a keyboard.

Updates and support are provided on a **best-effort basis** during spare time. If this app brings clarity, the mission is accomplished. If something needs fixing, it will be addressed as time allows.

---

*“Your money is private. Your data is yours. Accuracy builds trust.”*
