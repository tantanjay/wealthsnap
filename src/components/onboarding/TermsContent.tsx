import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const TermsContent: React.FC = () => {
    const { colors } = useTheme();

    const styles = React.useMemo(() => StyleSheet.create({
        container: {
            paddingBottom: 20,
        },
        termsHeading: {
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 16,
            marginBottom: 8,
            color: colors.primary,
        },
        termsText: {
            fontSize: 14,
            marginBottom: 8,
            lineHeight: 20,
            color: colors.text,
        },
        bold: {
            fontWeight: 'bold',
        },
    }), [colors]);

    return (
        <View style={styles.container}>
            <Text style={[styles.termsHeading, { marginTop: 0 }]}>1. ACCEPTANCE OF TERMS</Text>
            <Text style={styles.termsText}>
                By downloading, installing, or using WealthSnap (&quot;the App&quot;), you agree to be bound by these Terms of Use and Privacy Policy. If you do not agree to these terms, do not use the App. Your continued use of the App following any modifications to these terms constitutes acceptance of those changes.
            </Text>

            <Text style={styles.termsHeading}>2. PRIVACY POLICY</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.1 Hybrid Data Encryption:</Text> We prioritize both privacy and performance. <Text style={styles.bold}>Sensitive Data</Text> (e.g., Transaction Amounts, Notes, Receipts) is encrypted at rest using AES-256. <Text style={styles.bold}>Metadata</Text> (e.g., Dates, Categories, Transaction Type) is stored in plain text to ensure the app remains fast and searchable.{'\n\n'}
                <Text style={styles.bold}>2.2 Camera and Images:</Text> We request access to your device&apos;s camera and photo library to allow you to take photos of receipts or financial documents for analysis. Images are processed temporarily to extract insights and are sent securely to Google Gemini API for analysis. They are not permanently stored on your device. Users are encouraged to review their own Google privacy settings, as the use of a personal API key falls under the user&apos;s individual agreement with Google.{'\n\n'}
                <Text style={styles.bold}>2.3 Data Transit (No Internal Collection):</Text> The Developer does not collect, sell, share, or store your personal data on external servers. However, for AI features to work, data you select is transmitted securely to Google Gemini as described in Section 2.2.
            </Text>

            <Text style={styles.termsHeading}>3. THIRD-PARTY SERVICES</Text>
            <Text style={styles.termsText}>
                We use specific third-party services to provide app functionality:{'\n'}
                • <Text style={styles.bold}>Google Gemini API:</Text> Used for AI analysis of images and text.{'\n'}
                • <Text style={styles.bold}>Google ML Kit:</Text> Used for on-device document scanning and image processing (no personal data transmitted).{'\n'}
                • <Text style={styles.bold}>Expo:</Text> The platform used to build and update the app.
            </Text>

            <Text style={styles.termsHeading}>4. FREEWARE & API USAGE</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>4.1 Free to Use:</Text> The App is provided as &quot;Freeware&quot; at no cost to you.{'\n\n'}
                <Text style={styles.bold}>4.2 User-Provided API Key:</Text> To access optional AI-powered features, you must obtain and provide your own Google Gemini API key.{'\n\n'}
                <Text style={styles.bold}>4.3 API Costs:</Text> You are solely responsible for any costs, fees, or usage limits associated with your personal Google Gemini API key.
            </Text>

            <Text style={styles.termsHeading}>5. SECURITY & DATA RETENTION</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>5.1 Data Loss:</Text> Data is stored locally. If you delete the App, lose your device, or forget your PIN, your data is gone permanently. Regular backups (via the in-app Backup feature) are your sole responsibility.{'\n\n'}
                <Text style={styles.bold}>5.2 No Password Recovery:</Text> There is NO &quot;Forgot Password&quot; or recovery mechanism for your custom PIN. The Developer cannot &quot;reset&quot; your PIN or recover your encrypted database.{'\n\n'}
                <Text style={styles.bold}>5.3 Data Deletion:</Text> You can delete all data at any time by clearing the App&apos;s cache/data in device settings or by uninstalling the App. Since no data is stored on developer servers, this action is permanent and irreversible.
            </Text>

            <Text style={styles.termsHeading}>6. DISCLAIMER OF WARRANTIES</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>6.1 &quot;AS IS&quot;:</Text> THE APPLICATION IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.{'\n\n'}
                <Text style={styles.bold}>6.2 Financial Disclaimer:</Text> This App is not intended to provide professional financial, investment, or tax advice. Insights are for informational purposes only.{'\n\n'}
                <Text style={styles.bold}>6.3 Accuracy & Reliability:</Text> Any insights, metrics, calculations, or data (whether generated by AI or standard application logic) may be inaccurate, incomplete, or misleading. Check all outputs carefully. You are fully responsible for your own financial decisions.
            </Text>

            <Text style={styles.termsHeading}>7. LIMITATION OF LIABILITY</Text>
            <Text style={styles.termsText}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, DATA, USE, OR GOODWILL.
            </Text>

            <Text style={styles.termsHeading}>8. INDEMNIFICATION</Text>
            <Text style={styles.termsText}>
                You agree to indemnify, defend, and hold harmless the developer from any and all claims, liabilities, damages, and costs arising from your use of the App, your violation of these Terms, or your violation of any third-party rights.
            </Text>

            <Text style={styles.termsHeading}>9. CHILDREN&apos;S PRIVACY</Text>
            <Text style={styles.termsText}>
                Our Services do not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.
            </Text>

            <Text style={styles.termsHeading}>10. GOVERNING LAW</Text>
            <Text style={styles.termsText}>
                These Terms shall be governed by and defined following the laws of the <Text style={styles.bold}>Republic of the Philippines</Text>. WealthSnap and yourself irrevocably consent that the courts of the Philippines shall have exclusive jurisdiction to resolve any dispute.
            </Text>

            <Text style={styles.termsHeading}>11. SEVERABILITY</Text>
            <Text style={styles.termsText}>
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible.
            </Text>

            <Text style={styles.termsHeading}>12. DEVICE PERMISSIONS</Text>
            <Text style={styles.termsText}>
                The App may request the following permissions on your device:{'\n'}
                • <Text style={styles.bold}>Camera & Photos:</Text> For receipt analysis.{'\n'}
                • <Text style={styles.bold}>Biometrics:</Text> For secure app access (FaceID/Fingerprint).{'\n'}
                • <Text style={styles.bold}>Storage:</Text> For saving your encrypted database.
            </Text>

            <Text style={styles.termsHeading}>13. CONTACT US</Text>
            <Text style={styles.termsText}>
                If you have any questions or suggestions, do not hesitate to contact us at:{'\n'}
                Email: <Text style={styles.bold}>cjs.dev.studio@gmail.com</Text>
            </Text>
        </View>
    );
};

export default TermsContent;
