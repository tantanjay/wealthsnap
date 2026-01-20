import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Button, Card } from '../../components';
import { saveUserProfile, setOnboardingComplete } from '../../services/storageService';
import { UserProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../styles/theme';
import PinCreationScreen from '../PinCreationScreen';
import * as DocumentPicker from 'expo-document-picker';
import { restoreFromBackup } from '../../services/backupService';
import RestoreModal from '../../components/profile/data/RestoreModal';
import { CONFIG } from '../../constants/config';
import { generateDummyData } from '../../services/dummyDataService';
import OnboardingGuide from './OnboardingGuide';
import { useAlert } from '../../context/AlertContext';


const { height } = Dimensions.get('window');

const SetupScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [step, setStep] = useState(0);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    const [isRestoring, setIsRestoring] = useState(false);
    const [hasRestored, setHasRestored] = useState(false);

    // Restore State
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreFileUri, setRestoreFileUri] = useState<string | null>(null);

    // Profile State
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('PHP');
    const [goals, setGoals] = useState<string[]>([]);

    const availableGoals = ['Save Money', 'Invest More', 'Reduce Debt', 'Track Spending', 'Retire Early'];

    const toggleGoal = (goal: string) => {
        if (goals.includes(goal)) setGoals(goals.filter(g => g !== goal));
        else setGoals([...goals, goal]);
    };

    const handleRestoreFromBackup = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/zip',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                setRestoreFileUri(result.assets[0].uri);
                setShowRestoreModal(true);
            }
        } catch {
            showAlert('Error', 'Failed to pick file');
        }
    };

    /**
     * Decrypts and restores the backup.
     * If successful, prompts user to secure the device with a PIN.
     */
    const confirmRestore = async (password: string) => {
        if (!restoreFileUri) return;
        if (!password) {
            showAlert('Error', 'Password is required.');
            return;
        }

        try {
            setIsRestoring(true);
            await restoreFromBackup(restoreFileUri, password);
            setIsRestoring(false);
            setShowRestoreModal(false);

            setHasRestored(true);
            showAlert('Success', 'Data restored successfully! Please set a new PIN for this device.', [
                {
                    text: 'Continue', onPress: async () => {
                        setStep(3); // Go to PIN creation
                    }
                }
            ]);
        } catch (error) {
            setIsRestoring(false);
            const msg = (error as Error).message;
            if (msg === 'INVALID_PASSWORD') {
                showAlert('Error', 'Incorrect password.');
            } else {
                showAlert('Error', 'Failed to restore: ' + msg);
            }
        }
    };

    const handleRestoredFinish = async () => {
        // Instead of finishing immediately, show the guide
        setStep(4);
    };

    const handleFinish = async () => {
        if (!name || name.trim().length < 4) {
            showAlert('Required', 'Please enter a valid name (at least 4 characters).');
            return;
        }

        const profile: UserProfile = {
            id: Date.now().toString(),
            name,
            currency,
            monthlySalary: 0,
            financialGoals: goals,
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveUserProfile(profile);
        // show guide
        setStep(4);
    };

    /**
     * Generates dummy data for testing/screenshots.
     * Only available if ENABLE_DUMMY_DATA is true.
     */
    const handlePopulateDemoData = async () => {
        try {
            setIsRestoring(true); // Reuse restoring state for loading indicator
            await generateDummyData();
            setIsRestoring(false);

            showAlert('Success', 'Demo data populated! Please set a PIN.', [
                {
                    text: 'Continue', onPress: () => {
                        setStep(3); // Go to PIN creation
                        setHasRestored(true); // Treat as restored so we skip profile creation
                    }
                }
            ]);
        } catch {
            setIsRestoring(false);
            showAlert('Error', 'Failed to generate demo data.');
        }
    };

    const handleFinalizeOnboarding = async () => {
        await setOnboardingComplete();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            })
        );
    };

    const styles = StyleSheet.create({
        content: {
            flex: 1,
        },
        stepContainer: {
            flex: 1,
            paddingBottom: 20,
        },
        stepTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 8,
            marginTop: 10,
        },
        stepDescription: {
            fontSize: 16,
            marginBottom: 20,
        },
        termsCard: {
            height: height * 0.6, // Dynamic height: 60% of screen height
            borderWidth: 1,
            borderRadius: 12,
            marginBottom: 20,
            padding: 16,
        },
        termsHeading: {
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 16,
            marginBottom: 8,
        },
        termsText: {
            fontSize: 14,
            marginBottom: 8,
            lineHeight: 20,
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
            padding: 10,
        },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            marginRight: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkboxLabel: {
            flex: 1,
            fontSize: 14,
        },
        welcomeButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        welcomeButtonTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#FFF',
        },
        welcomeButtonSubtitle: {
            fontSize: 14,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 2,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
            marginTop: 16,
        },
        input: {
            fontSize: 16,
            borderBottomWidth: 1,
            padding: 8,
        },
        optionRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 8,
        },
        optionButton: {
            borderWidth: 1,
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 16,
            marginRight: 8,
            marginBottom: 8,
        },
        optionText: {
            fontSize: 14,
            fontWeight: '600',
        },
    });

    return (
        <ScreenWrapper scrollable={false}>
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                nestedScrollEnabled={true}
            >
                {/* Step 0: Privacy Policy & Terms */}
                {step === 0 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Terms of Use & Privacy 📋</Text>
                        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                            Please read and accept before continuing
                        </Text>

                        <View style={[styles.termsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <ScrollView
                                style={{ flex: 1 }}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
                                onScroll={(event) => {
                                    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                                    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                                    if (isCloseToBottom && !hasScrolledToBottom) {
                                        setHasScrolledToBottom(true);
                                    }
                                }}
                                scrollEventThrottle={16}
                            >
                                <Text style={[styles.termsHeading, { color: colors.primary, marginTop: 0 }]}>1. ACCEPTANCE OF TERMS</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    By downloading, installing, or using WealthSnap (&quot;the App&quot;), you agree to be bound by these Terms of Use and Privacy Policy. If you do not agree to these terms, do not use the App. Your continued use of the App following any modifications to these terms constitutes acceptance of those changes.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>2. PRIVACY POLICY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>2.1 Data Encryption & Storage:</Text> All personal data is stored exclusively on your local device. Sensitive keys (Encryption Key, API Key) and your PIN are stored in hardware-backed secure storage (SecureStore) and are never exposed in plain text. Detailed financial data is encrypted at rest.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>2.2 No Data Collection:</Text> We do not collect, sell, share, or transfer any of your personal data to third parties. Your privacy is protected by virtue of the App&apos;s local-only storage architecture.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>2.3 Analytics:</Text> This App does not include any analytics, tracking, or telemetry services. No usage data is collected or transmitted.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>3. FREEWARE & API USAGE</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>3.1 Free to Use:</Text> The App is provided as &quot;Freeware&quot; at no cost to you.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>3.2 User-Provided API Key:</Text> To access optional AI-powered features, you must obtain and provide your own Google Gemini API key.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>3.3 API Costs:</Text> While the App itself is free, you are solely responsible for any costs, fees, or usage limits associated with your personal Google Gemini API key.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>4. &quot;AS IS&quot; & NO WARRANTY</Text>
                                <Text style={[styles.termsText, { color: colors.text, fontWeight: 'bold' }]}>
                                    THE APPLICATION IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>5. FINANCIAL DISCLAIMER</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>5.1 Not Financial Advice:</Text> This App is not intended to provide professional financial, investment, or tax advice. The insights provided by the App and AI analysis are for informational purposes only.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>5.2 AI Accuracy:</Text> WealthSnap does not verify the accuracy of the financial data entered or the AI&apos;s interpretation. AI-generated limits, budgets, categories, or insights may be inaccurate, incomplete, or misleading. Check all AI outputs carefully.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>5.3 Illustrative Purposes:</Text> All calculations are for illustrative purposes and should not be used for tax, legal, or professional financial reporting.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>5.4 Responsibility:</Text> You are fully responsible for your own financial decisions. The developer is not liable for any financial losses incurred based on App usage.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>6. LIMITATION OF LIABILITY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, DATA, USE, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>7. INDEMNIFICATION</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    You agree to indemnify, defend, and hold harmless the developer from any and all claims, liabilities, damages, and costs (including attorney&apos;s fees) arising from your use of the App, your violation of these Terms, or your violation of any third-party rights.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>8. USER DATA & SECURITY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>8.1 Data Loss:</Text> Data is stored locally. There is no &quot;Cloud Sync.&quot; If you delete the App, lose your device, or forget your PIN, your data is gone permanently. Regular backups (via the in-app Backup feature) are your sole responsibility.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>8.2 No Password Recovery:</Text> There is NO &quot;Forgot Password&quot; or recovery mechanism for your custom PIN. The Developer cannot &quot;reset&quot; your PIN or recover your encrypted database. Creating a PIN is optional but highly recommended for privacy; however, forgetting it results in permanent data loss.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>9. CHILDREN&apos;S PRIVACY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    Our Services do not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13. In the case we discover that a child under 13 has provided us with personal information, we immediately delete this from our records.
                                </Text>
                            </ScrollView>
                        </View>

                        {!hasScrolledToBottom && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 10 }}>
                                <Ionicons name="arrow-down" size={16} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 6, fontStyle: 'italic' }}>
                                    Please scroll to the bottom to continue
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.checkboxRow, { opacity: hasScrolledToBottom ? 1 : 0.4 }]}
                            onPress={() => hasScrolledToBottom && setHasAgreed(!hasAgreed)}
                            disabled={!hasScrolledToBottom}
                        >
                            <View style={[
                                styles.checkbox,
                                { borderColor: hasScrolledToBottom ? colors.primary : colors.gray500 },
                                hasAgreed && { backgroundColor: colors.primary }
                            ]}>
                                {hasAgreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <Text style={[styles.checkboxLabel, { color: hasScrolledToBottom ? colors.text : colors.gray500 }]}>
                                I have read and agree to the Terms of Use and Privacy Policy
                            </Text>
                        </TouchableOpacity>

                        <Button
                            title="Continue"
                            onPress={() => setStep(1)}
                            disabled={!hasAgreed}
                            style={{ opacity: hasAgreed ? 1 : 0.6 }}
                        />
                    </View>
                )}

                {/* Step 1: Welcome / Restore */}
                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Welcome to WealthSnap! 🎉</Text>
                        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                            Start your journey to financial freedom
                        </Text>

                        <TouchableOpacity
                            style={[styles.welcomeButton, { backgroundColor: colors.primary }]}
                            onPress={() => setStep(2)}
                        >
                            <Ionicons name="person-add" size={24} color="#FFF" />
                            <View style={{ marginLeft: SPACING.md }}>
                                <Text style={styles.welcomeButtonTitle}>New User</Text>
                                <Text style={styles.welcomeButtonSubtitle}>Create your profile</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#FFF" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.welcomeButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: isRestoring ? 0.6 : 1 }]}
                            onPress={handleRestoreFromBackup}
                            disabled={isRestoring}
                        >
                            {isRestoring ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="cloud-download" size={24} color={colors.primary} />
                            )}
                            <View style={{ marginLeft: SPACING.md }}>
                                <Text style={[styles.welcomeButtonTitle, { color: colors.text }]}>{isRestoring ? 'Restoring...' : 'Restore from Backup'}</Text>
                                <Text style={[styles.welcomeButtonSubtitle, { color: colors.textSecondary }]}>Import your previous data</Text>
                            </View>
                            {!isRestoring && <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>

                        {CONFIG.ENABLE_DUMMY_DATA && (
                            <TouchableOpacity
                                style={[styles.welcomeButton, { backgroundColor: '#FF9800', marginTop: 10 }]}
                                onPress={handlePopulateDemoData}
                                disabled={isRestoring}
                            >
                                {isRestoring ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="construct" size={24} color="#FFF" />
                                )}
                                <View style={{ marginLeft: SPACING.md }}>
                                    <Text style={styles.welcomeButtonTitle}>Populate Demo Data</Text>
                                    <Text style={styles.welcomeButtonSubtitle}>For screenshots only</Text>
                                </View>
                                {!isRestoring && <Ionicons name="chevron-forward" size={24} color="#FFF" style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Step 3: PIN Setup */}
                {step === 3 && (
                    <View style={styles.stepContainer}>
                        <PinCreationScreen
                            onSuccess={hasRestored ? handleRestoredFinish : handleFinish}
                        />
                    </View>
                )}

                {/* Step 4: Onboarding Guide */}
                {step === 4 && (
                    <OnboardingGuide onFinish={handleFinalizeOnboarding} mode="onboarding" />
                )}

                {/* Step 2: Profile Setup (Existing Logic) */}
                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Let&apos;s Get Started!</Text>
                        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                            Setup your financial profile
                        </Text>

                        <Card>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Preferred Name</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                                value={name}
                                onChangeText={setName}
                                placeholder="John Doe"
                                placeholderTextColor={colors.gray500}
                            />
                        </Card>

                        <Card>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Currency</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {['PHP', 'USD', 'EUR', 'GBP', 'JPY'].map(curr => (
                                    <TouchableOpacity
                                        key={curr}
                                        onPress={() => setCurrency(curr)}
                                        style={{
                                            backgroundColor: currency === curr ? colors.primary : 'transparent',
                                            paddingVertical: 8,
                                            paddingHorizontal: 16,
                                            borderRadius: 8,
                                            marginRight: 8,
                                            marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: currency === curr ? colors.primary : colors.border,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: currency === curr ? colors.white : colors.text,
                                                fontWeight: '600'
                                            }}
                                        >
                                            {curr}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Card>

                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginVertical: 10 }}>Financial Goals</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {availableGoals.map(goal => (
                                <Text
                                    key={goal}
                                    onPress={() => toggleGoal(goal)}
                                    style={{
                                        color: goals.includes(goal) ? colors.white : colors.text,
                                        backgroundColor: goals.includes(goal) ? colors.primary : 'transparent',
                                        padding: 10,
                                        borderRadius: 20,
                                        marginRight: 8,
                                        marginBottom: 8,
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: goals.includes(goal) ? colors.primary : colors.border
                                    }}
                                >
                                    {goal}
                                </Text>
                            ))}
                        </View>

                        <Button
                            title="Continue"
                            onPress={() => {
                                if (name.trim().length < 4) {
                                    showAlert('Invalid Name', 'Name must be at least 4 characters long.');
                                    return;
                                }
                                setStep(3);
                            }}
                            style={{ marginTop: 20, marginBottom: 40 }}
                        />
                    </View>
                )}
            </ScrollView>

            {/* Restore Modal */}
            <RestoreModal
                visible={showRestoreModal}
                onClose={() => setShowRestoreModal(false)}
                onRestore={confirmRestore}
                isProcessing={isRestoring}
            />
        </ScreenWrapper >
    );
};
export default SetupScreen;
