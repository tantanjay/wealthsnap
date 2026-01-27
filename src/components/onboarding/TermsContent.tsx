import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@context/ThemeContext';

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
            <Text style={[styles.termsHeading, { marginTop: 0 }]}>1. OVERVIEW</Text>
            <Text style={styles.termsText}>
                WealthSnap is designed as a <Text style={styles.bold}>privacy-first, local-only application</Text>. We do not maintain external servers to store your personal account data. Your financial data, transaction logs, and personal details remain stored locally on your device.{'\n\n'}
                By downloading, installing, or using WealthSnap (&quot;the App&quot;), you agree to these Terms of Service and Privacy Policy.
            </Text>

            <Text style={styles.termsHeading}>2. INFORMATION WE COLLECT & HOW WE USE IT</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>2.1 Camera and Images:</Text> We request access to your device&apos;s camera and photo library to allow you to take photos of receipts or financial documents for analysis. Images are processed temporarily to extract insights and are sent securely to Google Gemini API for analysis. They are not permanently stored on your device. Users are encouraged to review their own <Text style={styles.bold}>Google AI Studio or Google Cloud</Text> privacy settings, as the use of a personal API key falls under the user&apos;s individual agreement with Google.{'\n\n'}
                <Text style={styles.bold}>2.2 Biometric Data:</Text> We use your device&apos;s biometric capabilities (FaceID/TouchID). We <Text style={styles.bold}>never</Text> access, collect, or store your actual biometric data. Authentication is handled entirely by your device&apos;s operating system.{'\n\n'}
                <Text style={styles.bold}>2.3 User Content & Data Transit:</Text> We do not collect or store your personal data on external servers. For AI features to work, data you explicitly select is transmitted securely to Google Gemini. We employ a <Text style={styles.bold}>Hybrid Encryption</Text> model (AES-256 for sensitive data, plain text for metadata) to balance security and performance.
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
                <Text style={styles.bold}>4.2 User-Provided API Key:</Text> To access optional AI-powered features, you must provide your own Google Gemini API key.{'\n\n'}
                <Text style={styles.bold}>4.3 API Costs:</Text> You are solely responsible for any costs or usage limits associated with your personal Google Gemini API key.
            </Text>

            <Text style={styles.termsHeading}>5. SECURITY & DATA RETENTION</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>5.1 No Backup Liability:</Text> Data is stored locally. If you delete the App or lose your device, your data is gone permanently. Regular backups are your sole responsibility.{'\n\n'}
                <Text style={styles.bold}>5.2 No Password Recovery:</Text> There is NO &quot;Forgot Password&quot; or recovery mechanism for your custom PIN. The Developer cannot &quot;reset&quot; your PIN or recover your database.{'\n\n'}
                <Text style={styles.bold}>5.3 Data Deletion:</Text> You can delete all data at any time by clearing the App&apos;s cache/data in device settings or by uninstalling the App. Since no data is stored on developer servers, this action is permanent and irreversible.
            </Text>

            <Text style={styles.termsHeading}>6. CHILDREN&apos;S PRIVACY</Text>
            <Text style={styles.termsText}>
                Our Services do not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.
            </Text>

            <Text style={styles.termsHeading}>7. DISCLAIMER OF WARRANTIES</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>7.1 &quot;AS IS&quot;:</Text> THE APPLICATION IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND.{'\n\n'}
                <Text style={styles.bold}>7.2 Accuracy & Reliability:</Text> Any insights, metrics, calculations, or data (whether generated by AI or standard application logic) may be inaccurate, incomplete, or misleading. Check all outputs carefully. You are fully responsible for your own financial decisions.
            </Text>

            <Text style={styles.termsHeading}>8. LIMITATION OF LIABILITY</Text>
            <Text style={styles.termsText}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DAMAGES, LOSS OF PROFITS, DATA, USE, OR GOODWILL.
            </Text>

            <Text style={styles.termsHeading}>9. INDEMNIFICATION</Text>
            <Text style={styles.termsText}>
                You agree to indemnify and hold harmless the developer from any and all claims, liabilities, and costs arising from your use of the App or your violation of these Terms.
            </Text>

            <Text style={styles.termsHeading}>10. GOVERNING LAW</Text>
            <Text style={styles.termsText}>
                These Terms shall be governed by the laws of the <Text style={styles.bold}>Republic of the Philippines</Text>. You irrevocably consent that the courts of the Philippines shall have exclusive jurisdiction.
            </Text>

            <Text style={styles.termsHeading}>11. SEVERABILITY</Text>
            <Text style={styles.termsText}>
                If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed to accomplish the objectives of such provision to the greatest extent possible.
            </Text>

            <Text style={styles.termsHeading}>12. CHANGES TO THIS AGREEMENT</Text>
            <Text style={styles.termsText}>
                We may update our Privacy Policy and Terms from time to time. You are advised to review this page periodically. We will notify you of any changes by posting the new policy in this section.
            </Text>

            <Text style={styles.termsHeading}>13. DEVICE PERMISSIONS</Text>
            <Text style={styles.termsText}>
                The App may request the following permissions on your device:{'\n'}
                • <Text style={styles.bold}>Camera & Photos:</Text> For receipt analysis.{'\n'}
                • <Text style={styles.bold}>Biometrics:</Text> For secure, private access (FaceID/Fingerprint).{'\n'}
                • <Text style={styles.bold}>Storage:</Text> To save your encrypted local database.{'\n'}
                • <Text style={styles.bold}>Notifications:</Text> For local reminders regarding budgets, bills, or investment goals. No marketing spam.{'\n'}
                • <Text style={styles.bold}>Service Permissions:</Text> Standard system access for secure AI connectivity, haptic feedback, and reliable task scheduling.
            </Text>

            <Text style={styles.termsHeading}>14. CONTACT US</Text>
            <Text style={styles.termsText}>
                If you have any questions or suggestions, do not hesitate to contact us at:{'\n'}
                Email: <Text style={styles.bold}>cjs.dev.studio@gmail.com</Text>
            </Text>
        </View>
    );
};

export default TermsContent;
