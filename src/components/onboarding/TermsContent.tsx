import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@context/ThemeContext';

const TermsContent: React.FC = () => {
    const { colors } = useTheme();

    const styles = React.useMemo(() => StyleSheet.create({
        container: {
            padding: 20,
        },
        termsHeading: {
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 20,
            marginBottom: 10,
            color: colors.primary,
        },
        termsText: {
            fontSize: 14,
            marginBottom: 12,
            lineHeight: 22,
            color: colors.text,
        },
        bold: {
            fontWeight: 'bold',
        },
        bullet: {
            marginLeft: 10,
        },
    }), [colors]);

    return (
        <View style={styles.container}>
            <Text style={[styles.termsHeading, { marginTop: 0 }]}>1. OVERVIEW</Text>
            <Text style={styles.termsText}>
                WealthSnap is a <Text style={styles.bold}>privacy-first, local-only application</Text>. Your financial data, transaction logs, and personal details remain stored locally on your device; we do not maintain external servers. {'\n\n'}
                By downloading, installing, or using WealthSnap (&quot;the App&quot;), you agree to these Terms of Service and Privacy Policy.
            </Text>

            <Text style={styles.termsHeading}>2. INFORMATION WE COLLECT & HOW WE USE IT</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.1 Camera & Images:</Text> We request access to your camera and photo library so you can take photos of receipts, invoices, or financial documents for analysis. Images are sent directly from your device to Google Gemini API using your personal API key. We never see, store, or intercept these images. Users should review their Google Cloud or AI Studio privacy settings.
            </Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.2 Biometric Data:</Text> We use device biometrics (FaceID, TouchID) for secure access. Your biometric data never leaves your device; authentication is handled by your OS.
            </Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.3 User Content & Data Transit:</Text> Financial data (budgets, transactions, notes) is stored locally. For AI features, only the data relevant to that feature — receipt images, stock/asset symbols, or an aggregated financial summary for Chat — is sent to Google Gemini. Sensitive values are encrypted (AES-256); metadata is stored in plain text for fast search. Decryption keys are stored in secure hardware enclaves.
            </Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.4 AI Features & Third-Party Integration:</Text>
            </Text>
            <Text style={[styles.termsText, styles.bullet]}>
                • <Text style={styles.bold}>Data Sharing:</Text> Only the data you explicitly send for AI features is shared. Other app data remains local.
            </Text>
            <Text style={[styles.termsText, styles.bullet]}>
                • <Text style={styles.bold}>Chat & Financial Summary:</Text> If you use Chat, WealthSnap sends Google Gemini a snapshot of your finances (cash, investment value, realized/unrealized P/L, dividends, debt, runway, current-month budgets) plus your Monthly Summaries for the history range you choose. You may exclude specific transaction categories beforehand; excluded categories are sent only as a combined total, never broken out individually. Chat conversations are not saved by WealthSnap.
            </Text>
            <Text style={[styles.termsText, styles.bullet]}>
                • <Text style={styles.bold}>User API Key:</Text> You provide your Google Gemini API key. You control the data and your agreement with Google applies.
            </Text>
            <Text style={[styles.termsText, styles.bullet]}>
                • <Text style={styles.bold}>Data Use for Training:</Text> Free-tier keys may be used by Google for model training. Paid-tier keys generally have stronger privacy guarantees.
            </Text>

            <Text style={styles.termsHeading}>3. THIRD-PARTY SERVICES</Text>
            <Text style={styles.termsText}>
                • <Text style={styles.bold}>Google Gemini API:</Text> AI analysis of receipt images, stock/asset symbols, and, for Chat, your financial summary.{'\n'}
                • <Text style={styles.bold}>Google ML Kit:</Text> On-device document scanning; no personal data sent.{'\n'}
                • <Text style={styles.bold}>Frankfurter API:</Text> Open-source currency exchange rates.{'\n'}
                • <Text style={styles.bold}>Expo:</Text> Used to build and update the app.
            </Text>

            <Text style={styles.termsHeading}>4. FREEWARE & API USAGE</Text>
            <Text style={styles.termsText}>
                • <Text style={styles.bold}>Free to Use:</Text> The app is free.{'\n'}
                • <Text style={styles.bold}>API Key:</Text> Optional AI features require your own Google Gemini API key.{'\n'}
                • <Text style={styles.bold}>API Costs:</Text> You are responsible for any costs or limits related to your API key.
            </Text>

            <Text style={styles.termsHeading}>5. SECURITY & DATA RETENTION</Text>
            <Text style={styles.termsText}>
                • <Text style={styles.bold}>No Backup Liability:</Text> All data is local. Losing the device or deleting the app may result in permanent data loss. You are responsible for backups.{'\n'}
                • <Text style={styles.bold}>No Password Recovery:</Text> We cannot reset PINs or recover encrypted databases.{'\n'}
                • <Text style={styles.bold}>Data Deletion:</Text> Clear cache/data or uninstall the app to remove all data permanently.
            </Text>

            <Text style={styles.termsHeading}>6. CHILDREN&apos;S PRIVACY</Text>
            <Text style={styles.termsText}>
                We do not collect data from anyone under 13. Parents may remove data by clearing app data or uninstalling.
            </Text>

            <Text style={styles.termsHeading}>7. DISCLAIMER OF WARRANTIES</Text>
            <Text style={styles.termsText}>
                • <Text style={styles.bold}>&quot;AS IS&quot;:</Text> The app is provided without warranties of any kind.{'\n'}
                • <Text style={styles.bold}>Automated Insights:</Text> Features like Safe-to-Spend, Ghost Forecast, and Smart Alerts are estimates only and are not financial advice. You are responsible for your decisions.
            </Text>

            <Text style={styles.termsHeading}>8. LIMITATION OF LIABILITY</Text>
            <Text style={styles.termsText}>
                We are not liable for damages, data loss, or lost profits related to app use to the fullest extent allowed by law.
            </Text>

            <Text style={styles.termsHeading}>9. INDEMNIFICATION</Text>
            <Text style={styles.termsText}>
                You agree to hold the developer harmless from claims, liabilities, or costs arising from your use of the app.
            </Text>

            <Text style={styles.termsHeading}>10. GOVERNING LAW</Text>
            <Text style={styles.termsText}>
                These Terms are governed by the <Text style={styles.bold}>Republic of the Philippines</Text>. Courts in the Philippines have exclusive jurisdiction. Users exercise their data rights directly via the app.
            </Text>

            <Text style={styles.termsHeading}>11. SEVERABILITY</Text>
            <Text style={styles.termsText}>
                If any provision is invalid, the remaining Terms remain in effect.
            </Text>

            <Text style={styles.termsHeading}>12. CHANGES TO THIS AGREEMENT</Text>
            <Text style={styles.termsText}>
                Terms may change; users should review them periodically. Updates are posted in the app.
            </Text>

            <Text style={styles.termsHeading}>13. DEVICE PERMISSIONS</Text>
            <Text style={styles.termsText}>
                • <Text style={styles.bold}>Camera & Photos:</Text> For receipt analysis.{'\n'}
                • <Text style={styles.bold}>Biometrics:</Text> For secure app access.{'\n'}
                • <Text style={styles.bold}>Storage:</Text> To save encrypted local data.{'\n'}
                • <Text style={styles.bold}>Notifications:</Text> Local reminders only, no spam.{'\n'}
                • <Text style={styles.bold}>Network:</Text> Only for AI features; no other data sent.{'\n'}
                • <Text style={styles.bold}>Service Permissions:</Text> Standard system access for vibration and reminders.
            </Text>

            <Text style={styles.termsHeading}>14. CONTACT US</Text>
            <Text style={styles.termsText}>
                Questions? Email: <Text style={styles.bold}>cjs.dev.studio@gmail.com</Text>
            </Text>
        </View>
    );
};

export default TermsContent;
