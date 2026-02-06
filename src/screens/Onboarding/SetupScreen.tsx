import React, { useState, useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, FlatList } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import RestoreModal from '@components/data/RestoreModal';
import BottomModal from '@components/common/BottomModal';
import PinCreationScreen from '@screens/security/PinCreationScreen';
import TermsContent from '@components/onboarding/TermsContent';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';
import { Button, Card } from '@components/index';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { UserProfile } from '@types';
import { generateUUID } from '@utils/uuid';
import { restoreFromBackup, generateDummyData } from '@services/integrations';
import { saveUserProfile, setOnboardingComplete, saveAcceptedTermsVersion, saveLastBackupDate } from '@services/core/storageService';
import { CURRENCIES, getCurrencyInfo } from '@utils/currencyData';
import { CONFIG } from '@constants/config';
import { SPACING } from '@styles/theme';

const { height } = Dimensions.get('window');

const SetupScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [step, setStep] = useState(0);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    // Currency Selection
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
                type: [
                    'application/zip',
                    'application/x-zip',
                    'application/x-zip-compressed',
                    'application/octet-stream',
                    '*/*'  // Fallback to allow any file if needed
                ],
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

            await saveLastBackupDate(new Date().toISOString());
            setHasRestored(true);
            showAlert('Success', 'Data restored successfully! Please set a new PIN for this device.', [
                {
                    text: 'Continue', onPress: async () => {
                        setStep(3); // Go to PIN creation
                    }
                }
            ], { cancelable: false });
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

    const handleRestoredFinish = useCallback(async () => {
        // Instead of finishing immediately, show the guide
        setStep(4);
    }, []);

    const handleFinish = useCallback(async () => {
        if (!name || name.trim().length < 4) {
            showAlert('Required', 'Please enter a valid name (at least 4 characters).');
            return;
        }

        const profile: UserProfile = {
            id: generateUUID(),
            name,
            currency,
            monthlySalary: new BigNumber(0),
            financialGoals: goals,
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveUserProfile(profile);
        // Mark backup as done (since they just started, we don't want to nag them immediately)
        await saveLastBackupDate(new Date().toISOString());

        // show guide
        setStep(4);
    }, [name, currency, goals, showAlert]);

    /**
     * Generates dummy data for testing/screenshots.
     * Only available if ENABLE_DUMMY_DATA is true.
     */
    const handlePopulateDemoData = async () => {
        try {
            setIsRestoring(true); // Reuse restoring state for loading indicator
            await generateDummyData();
            setIsRestoring(false);

            await saveLastBackupDate(new Date().toISOString());

            showAlert('Success', 'Demo data populated! Please set a PIN.', [
                {
                    text: 'Continue', onPress: () => {
                        setStep(3); // Go to PIN creation
                        setHasRestored(true); // Treat as restored so we skip profile creation
                    }
                }
            ], { cancelable: false });
        } catch {
            setIsRestoring(false);
            showAlert('Error', 'Failed to generate demo data.');
        }
    };

    const handleFinalizeOnboarding = async () => {
        await setOnboardingComplete();
        await saveAcceptedTermsVersion(CONFIG.TERMS_VERSION);
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
            justifyContent: 'center', // Center content vertically especially for PIN screen
        },
        stepTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 8,
            marginTop: 10,
        },
        stepDescription: {
            fontSize: 16,
            textAlign: 'center',
            opacity: 0.8,
        },
        heroHeader: {
            alignItems: 'center',
            marginBottom: 24,
            paddingTop: 10,
        },
        iconContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
        },
        gradientBg: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 40,
        },
        termsCard: {
            flex: 1,
            maxHeight: height * 0.5,
            borderWidth: 1,
            borderRadius: 16,
            marginBottom: 16,
            padding: 2, // Small padding for the inner scrollview to breathe
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        termsInnerScroll: {
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
            lineHeight: 20,
        },
        scrollIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            alignSelf: 'center',
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
                contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                nestedScrollEnabled={true}
            >
                {/* Step 0: Privacy Policy & Terms */}
                {step === 0 && (
                    <View style={styles.stepContainer}>
                        <View style={styles.heroHeader}>
                            <View style={styles.iconContainer}>
                                <LinearGradient
                                    colors={[colors.primary, colors.primary + 'CC']}
                                    style={styles.gradientBg}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <Ionicons name="shield-checkmark" size={40} color="#FFF" />
                            </View>
                            <Text style={[styles.stepTitle, { color: colors.text, textAlign: 'center', marginTop: 0 }]}>
                                Terms & Privacy
                            </Text>
                            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                                Please review and accept to continue
                            </Text>
                        </View>

                        <View style={[styles.termsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={styles.termsInnerScroll}
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
                                <TermsContent />
                            </ScrollView>
                        </View>

                        {!hasScrolledToBottom ? (
                            <View style={[styles.scrollIndicator, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="arrow-down-circle" size={18} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 13, marginLeft: 8, fontWeight: '500' }}>
                                    Scroll to the bottom to continue
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.scrollIndicator, { backgroundColor: colors.success + '15' }]}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.success || '#4CAF50'} />
                                <Text style={{ color: colors.success || '#4CAF50', fontSize: 13, marginLeft: 8, fontWeight: '500' }}>
                                    You&apos;ve reached the end
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.checkboxRow,
                                {
                                    opacity: hasScrolledToBottom ? 1 : 0.4,
                                    backgroundColor: hasAgreed ? colors.primary + '10' : 'transparent',
                                    borderRadius: 12,
                                    marginHorizontal: -4
                                }
                            ]}
                            onPress={() => hasScrolledToBottom && setHasAgreed(!hasAgreed)}
                            disabled={!hasScrolledToBottom}
                        >
                            <View style={[
                                styles.checkbox,
                                {
                                    borderColor: hasScrolledToBottom ? (hasAgreed ? colors.primary : colors.gray500) : colors.gray500,
                                    backgroundColor: hasAgreed ? colors.primary : 'transparent'
                                }
                            ]}>
                                {hasAgreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <Text style={[styles.checkboxLabel, { color: hasScrolledToBottom ? colors.text : colors.gray500 }]}>
                                I have read and agree to the <Text style={{ fontWeight: 'bold', color: colors.primary }}>Terms of Use</Text> and <Text style={{ fontWeight: 'bold', color: colors.primary }}>Privacy Policy</Text>
                            </Text>
                        </TouchableOpacity>

                        <Button
                            title="Continue"
                            onPress={() => setStep(1)}
                            disabled={!hasAgreed}
                            style={{
                                marginTop: 10,
                                height: 56,
                                borderRadius: 16,
                                shadowColor: colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: hasAgreed ? 0.3 : 0,
                                shadowRadius: 8,
                                elevation: hasAgreed ? 4 : 0,
                            }}
                        />
                    </View>
                )}

                {/* Step 1: Welcome / Restore */}
                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Welcome to WealthSnap! 🎉</Text>
                        <Text style={[styles.stepDescription, { color: colors.textSecondary, paddingBottom: 10 }]}>
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
                                    <Text style={styles.welcomeButtonSubtitle}>For your eyes only</Text>
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
                            <TouchableOpacity
                                onPress={() => setCurrencyModalVisible(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: colors.surface || colors.textSecondary + '20',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                                            {getCurrencyInfo(currency).symbol}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                                            {currency}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                            {getCurrencyInfo(currency).name}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
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

            {/* Currency Selection Modal */}
            <BottomModal
                visible={currencyModalVisible}
                onClose={() => setCurrencyModalVisible(false)}
                title="Select Currency"
                maxHeight="85%"
            >
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: colors.border
                    }}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={{ flex: 1, marginLeft: 8, fontSize: 16, color: colors.text }}
                            placeholder="Search currency..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={Object.values(CURRENCIES).filter(c =>
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.code.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        keyExtractor={item => item.code}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    paddingVertical: 12,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                                onPress={() => {
                                    setCurrency(item.code);
                                    setCurrencyModalVisible(false);
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: colors.primary + '10',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.symbol}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                                            {item.code}
                                        </Text>
                                    </View>
                                </View>
                                {currency === item.code && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                        style={{ height: '100%' }}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </BottomModal>

        </ScreenWrapper >
    );
};
export default SetupScreen;

// Should be inside the return, but SetupScreen is huge.
// Actually I need to put the modal inside the return block.
// Let me target the closing tag of ScreenWrapper and insert it before.
