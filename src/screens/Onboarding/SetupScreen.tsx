import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Button, Card } from '../../components';
import { saveUserProfile, setOnboardingComplete } from '../../services/storageService';
import { UserProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../styles/theme';

const SetupScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [step, setStep] = useState(0);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // Profile State
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [salary, setSalary] = useState('');
    const [goals, setGoals] = useState<string[]>([]);

    const availableGoals = ['Save Money', 'Invest More', 'Reduce Debt', 'Track Spending', 'Retire Early'];

    const toggleGoal = (goal: string) => {
        if (goals.includes(goal)) setGoals(goals.filter(g => g !== goal));
        else setGoals([...goals, goal]);
    };

    const handleRestoreFromBackup = async () => {
        setIsRestoring(true);
        // Placeholder for restore functionality
        setTimeout(() => {
            setIsRestoring(false);
            Alert.alert("Restore Feature", "Backup restoration will be implemented in a future update.");
        }, 1500);
    };

    const handleFinish = async () => {
        if (!name) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        const profile: UserProfile = {
            id: Date.now().toString(),
            name,
            currency,
            monthlySalary: parseFloat(salary) || 0,
            financialGoals: goals,
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveUserProfile(profile);
        await setOnboardingComplete();
        navigation.replace('Main');
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
            height: 400, // Fixed height for scrolling terms
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
        <ScreenWrapper>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Step 0: Privacy Policy & Terms */}
                {step === 0 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Terms of Use & Privacy 📋</Text>
                        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                            Please read and accept before continuing
                        </Text>

                        <View style={[styles.termsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                                <Text style={[styles.termsHeading, { color: colors.primary, marginTop: 0 }]}>1. ACCEPTANCE OF TERMS</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    By downloading, installing, or using WealthSnap ("the App"), you agree to be bound by these Terms of Use and Privacy Policy. If you do not agree to these terms, do not use the App. Your continued use of the App following any modifications to these terms constitutes acceptance of those changes.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>2. PRIVACY POLICY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>2.1 Data Encryption & Storage:</Text> All personal data including but not limited to financial transactions, income logs, investment portfolios, budget goals, and user profiles is stored exclusively on your local device and is protected by industry-standard encryption. The App does not collect, transmit, or store any personal information on external servers.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>2.2 No Data Collection:</Text> We do not collect, sell, share, or transfer any of your personal data to third parties. Your privacy is protected by virtue of the App's local-only storage architecture.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>2.3 Analytics:</Text> This App does not include any analytics, tracking, or telemetry services. No usage data is collected or transmitted.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>3. API KEY REQUIREMENTS</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>3.1 User-Provided API Key:</Text> The App requires a Google Gemini API key to perform AI-powered financial insights and receipt analysis. You must obtain and provide your own API key from Google AI Studio.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>3.2 API Key Storage:</Text> Your API key is stored locally on your device and is only used to communicate directly with Google's Gemini API services.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>3.3 API Costs:</Text> You are solely responsible for any costs, fees, or charges incurred through your use of the Google Gemini API.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>4. THIRD-PARTY SERVICES</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>4.1 Google Gemini API:</Text> When you use AI features, data is transmitted directly from your device to Google's Gemini API servers for processing. This transmission is subject to Google's privacy policy and terms of service.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>5. FINANCIAL DISCLAIMER</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>5.1 Not Financial Advice:</Text> This App is not intended to provide professional financial, investment, or tax advice. The insights provided by the App and AI analysis are for informational purposes only.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>5.2 Consult Professionals:</Text> Always consult with qualified financial advisors or tax professionals before making significant financial decisions.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>5.3 AI Limitations:</Text> AI-generated financial analysis may contain inaccuracies. Do not rely solely on this App for critical financial decisions.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>6. LIMITATION OF LIABILITY</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, DATA, USE, OR GOODWILL.
                                </Text>

                                <Text style={[styles.termsHeading, { color: colors.primary }]}>7. USER RESPONSIBILITIES</Text>
                                <Text style={[styles.termsText, { color: colors.text }]}>
                                    <Text style={{ fontWeight: 'bold' }}>7.1 Data Backup:</Text> You are solely responsible for backing up your data. The developer cannot recover lost data.{'\n\n'}
                                    <Text style={{ fontWeight: 'bold' }}>7.2 Security:</Text> You are responsible for maintaining the security of your device and API keys.
                                </Text>
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setHasAgreed(!hasAgreed)}
                        >
                            <View style={[
                                styles.checkbox,
                                { borderColor: colors.primary },
                                hasAgreed && { backgroundColor: colors.primary }
                            ]}>
                                {hasAgreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <Text style={[styles.checkboxLabel, { color: colors.text }]}>
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
                    </View>
                )}

                {/* Step 2: Profile Setup (Existing Logic) */}
                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Let's Get Started!</Text>
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

                        <Card>
                            <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Monthly Salary (Estimate)</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                                value={salary}
                                onChangeText={setSalary}
                                keyboardType="numeric"
                                placeholder="5000"
                                placeholderTextColor={colors.gray500}
                            />
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

                        <Button title="Complete Setup" onPress={handleFinish} style={{ marginTop: 20, marginBottom: 40 }} />
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};
export default SetupScreen;
