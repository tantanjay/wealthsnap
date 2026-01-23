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
                <Text style={styles.bold}>2.1 Hybrid Data Encryption:</Text> We prioritize both privacy and performance. <Text style={styles.bold}>Sensitive Data</Text> (e.g., Transaction Amounts, Notes, Receipts) is encrypted at rest using AES-256. <Text style={styles.bold}>Metadata</Text> (e.g., Dates, Categories, Transaction Type) is stored in plain text to ensure the app remains fast, searchable, and responsive.{'\n\n'}
                <Text style={styles.bold}>2.2 No Data Collection:</Text> We do not collect, sell, share, or transfer any of your personal data to third parties. Your privacy is protected by virtue of the App&apos;s local-only storage architecture.{'\n\n'}
                <Text style={styles.bold}>2.3 Analytics:</Text> This App does not include any analytics, tracking, or telemetry services. No usage data is collected or transmitted.{'\n\n'}
                <Text style={styles.bold}>2.4 Third-Party Services:</Text> We use Google Gemini API for AI analysis (subject to Google&apos;s Privacy Policy) and Google ML Kit for on-device document scanning (no personal data is transmitted for this function).
            </Text>

            <Text style={styles.termsHeading}>3. FREEWARE & API USAGE</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>3.1 Free to Use:</Text> The App is provided as &quot;Freeware&quot; at no cost to you.{'\n\n'}
                <Text style={styles.bold}>3.2 User-Provided API Key:</Text> To access optional AI-powered features, you must obtain and provide your own Google Gemini API key.{'\n\n'}
                <Text style={styles.bold}>3.3 API Costs:</Text> While the App itself is free, you are solely responsible for any costs, fees, or usage limits associated with your personal Google Gemini API key.
            </Text>

            <Text style={styles.termsHeading}>4. &quot;AS IS&quot; & NO WARRANTY</Text>
            <Text style={[styles.termsText, styles.bold]}>
                THE APPLICATION IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </Text>

            <Text style={styles.termsHeading}>5. FINANCIAL DISCLAIMER</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>5.1 Not Financial Advice:</Text> This App is not intended to provide professional financial, investment, or tax advice. The insights provided by the App and AI analysis are for informational purposes only.{'\n\n'}
                <Text style={styles.bold}>5.2 AI Accuracy:</Text> WealthSnap does not verify the accuracy of the financial data entered or the AI&apos;s interpretation. AI-generated limits, budgets, categories, or insights may be inaccurate, incomplete, or misleading. Check all AI outputs carefully.{'\n\n'}
                <Text style={styles.bold}>5.3 Illustrative Purposes:</Text> All calculations are for illustrative purposes and should not be used for tax, legal, or professional financial reporting.{'\n\n'}
                <Text style={styles.bold}>5.4 Responsibility:</Text> You are fully responsible for your own financial decisions. The developer is not liable for any financial losses incurred based on App usage.
            </Text>

            <Text style={styles.termsHeading}>6. LIMITATION OF LIABILITY</Text>
            <Text style={styles.termsText}>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, DATA, USE, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </Text>

            <Text style={styles.termsHeading}>7. INDEMNIFICATION</Text>
            <Text style={styles.termsText}>
                You agree to indemnify, defend, and hold harmless the developer from any and all <Text style={styles.bold}>claims, liabilities, damages, and costs</Text> (including attorney&apos;s fees) arising from your use of the App, your violation of these Terms, or your violation of any third-party rights.
            </Text>

            <Text style={styles.termsHeading}>8. USER DATA & SECURITY</Text>
            <Text style={styles.termsText}>
                <Text style={styles.bold}>8.1 Data Loss:</Text> Data is stored locally. There is no &quot;Cloud Sync.&quot; If you delete the App, lose your device, or forget your PIN, your data is gone permanently. Regular backups (via the in-app Backup feature) are your sole responsibility.{'\n\n'}
                <Text style={styles.bold}>8.2 No Password Recovery:</Text> There is NO &quot;Forgot Password&quot; or recovery mechanism for your custom PIN. The Developer cannot &quot;reset&quot; your PIN or recover your encrypted database. Creating a PIN is optional but highly recommended for privacy; however, forgetting it results in permanent data loss.
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
        </View>
    );
};

export default TermsContent;
