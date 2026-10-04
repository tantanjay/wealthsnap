# 🛠️ Expo Code Quality & Health Checks

Use these commands regularly to maintain a stable, bug-free, and well-formatted React Native application.

## 📋 Command Reference

| Command | Purpose | When to Run |
| :--- | :--- | :--- |
| `npx expo-doctor` | **Project Health**: Checks config, SDK compatibility, and native setups. | Before a build or after updating Expo. |
| `npx expo lint` | **Code Style**: Catches syntax errors and enforces consistent formatting. | Before committing code. |
| `npx tsc` | **Type Safety**: Runs the TypeScript compiler to find logic and type errors. | During development and in CI/CD. |
| `npx expo install --check` | **Dependency Sync**: Ensures library versions match the Expo SDK requirements. | After adding new packages. |
