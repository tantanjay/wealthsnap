import React, { useState, useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, StyleSheet, Dimensions, FlatList } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import BackupRestoreModal from '@components/data/BackupRestoreModal';
import BottomModal from '@components/common/BottomModal';
import PinCreationScreen from '@screens/security/PinCreationScreen';
import TermsContent from '@components/onboarding/TermsContent';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { UserProfile } from '@types';
import { generateUUID } from '@utils/uuid';
import { restoreFromBackup, generateDummyData, BackupProgress } from '@services/integrations';
import { saveUserProfile, setOnboardingComplete, saveAcceptedTermsVersion, saveLastBackupDate } from '@services/core/storageService';
import { CURRENCIES, getCurrencyInfo } from '@utils/currencyData';
import { CONFIG } from '@constants/config';
import { type, space, radius, fontFamily } from '@styles/theme';

const { height } = Dimensions.get('window');

const SetupScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
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
    const [restoreProgress, setRestoreProgress] = useState<BackupProgress | null>(null);

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
            await restoreFromBackup(restoreFileUri, password, setRestoreProgress);
            setIsRestoring(false);
            setRestoreProgress(null);
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
            setRestoreProgress(null);
            const msg = (error as Error).message;
            if (msg === 'INVALID_PASSWORD') {
                showAlert('Error', 'Incorrect password.');
            } else if (msg === 'RESTORE_FAILED_ROLLED_BACK' || msg === 'RESTORE_FAILED_ROLLBACK_FAILED') {
                showAlert('Restore Failed', 'The restore failed partway through. Please try again.');
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

    const isGoalSelected = (goal: string) => goals.includes(goal);

    return (
        <ScreenWrapper
            scrollable={false}
            noPadding={step === 4}
            style={[{ backgroundColor: ds.bg }, step !== 4 && { paddingHorizontal: space[5] }]}
        >
            {step === 4 ? (
                // Rendered outside the ScrollView below: it manages its own full-screen
                // layout/safe-area insets, and nesting it in a ScrollView let its footer
                // button drift below the fold on short screens, needing a manual scroll.
                <OnboardingGuide onFinish={handleFinalizeOnboarding} mode="onboarding" />
            ) : (
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: space[7], flexGrow: 1 }}
                nestedScrollEnabled={true}
            >
                {/* Step 0: Privacy Policy & Terms */}
                {step === 0 && (
                    <View style={styles.stepContainer}>
                        <View style={styles.heroHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: ds.accentSoft }]}>
                                <Ionicons name="shield-checkmark-outline" size={36} color={ds.accent} />
                            </View>
                            <Text style={[type.title, styles.center, { color: ds.text }]}>
                                Terms & Privacy
                            </Text>
                            <Text style={[type.small, styles.center, { color: ds.text2 }]}>
                                Please review and accept to continue
                            </Text>
                        </View>

                        <View style={[styles.termsCard, { backgroundColor: ds.inset }]}>
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
                                <TermsContent />
                            </ScrollView>
                        </View>

                        {!hasScrolledToBottom ? (
                            <View style={styles.scrollIndicator}>
                                <Ionicons name="arrow-down-circle-outline" size={18} color={ds.text2} />
                                <Text style={[type.smallMedium, { color: ds.text2 }]}>
                                    Scroll to the bottom to continue
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.scrollIndicator}>
                                <Ionicons name="checkmark-circle-outline" size={18} color={ds.success} />
                                <Text style={[type.smallMedium, { color: ds.success }]}>
                                    You&apos;ve reached the end
                                </Text>
                            </View>
                        )}

                        <Pressable
                            style={[styles.checkboxRow, { opacity: hasScrolledToBottom ? 1 : 0.4 }]}
                            onPress={() => hasScrolledToBottom && setHasAgreed(!hasAgreed)}
                            disabled={!hasScrolledToBottom}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: hasAgreed, disabled: !hasScrolledToBottom }}
                        >
                            <View style={[
                                styles.checkbox,
                                {
                                    borderColor: hasAgreed ? ds.accent : ds.text3,
                                    backgroundColor: hasAgreed ? ds.accent : 'transparent',
                                }
                            ]}>
                                {hasAgreed && <Ionicons name="checkmark" size={16} color={ds.onAccent} />}
                            </View>
                            <Text style={[type.small, styles.flex, { color: ds.text }]}>
                                I have read and agree to the <Text style={{ fontFamily: fontFamily.medium, color: ds.accent }}>Terms of Use</Text> and <Text style={{ fontFamily: fontFamily.medium, color: ds.accent }}>Privacy Policy</Text>
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setStep(1)}
                            disabled={!hasAgreed}
                            style={[styles.button, { backgroundColor: hasAgreed ? ds.accent : ds.inset }]}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !hasAgreed }}
                        >
                            <Text style={[type.bodyStrong, { color: hasAgreed ? ds.onAccent : ds.text3 }]}>Continue</Text>
                        </Pressable>
                    </View>
                )}

                {/* Step 1: Welcome / Restore */}
                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <Text style={[type.title, { color: ds.text }]}>Welcome to WealthSnap! 🎉</Text>
                        <Text style={[type.small, styles.description, { color: ds.text2 }]}>
                            Start your journey to financial freedom
                        </Text>

                        <Row
                            icon="person-add-outline"
                            title="New user"
                            subtitle="Create your profile"
                            chevron
                            onPress={() => setStep(2)}
                        />
                        <Row
                            icon="cloud-download-outline"
                            leading={isRestoring ? <ActivityIndicator size="small" color={ds.accent} /> : undefined}
                            title={isRestoring ? 'Restoring...' : 'Restore from backup'}
                            subtitle="Import your previous data"
                            chevron={!isRestoring}
                            onPress={isRestoring ? undefined : handleRestoreFromBackup}
                            last={!CONFIG.ENABLE_DUMMY_DATA}
                            style={{ opacity: isRestoring ? 0.6 : 1 }}
                        />
                        {CONFIG.ENABLE_DUMMY_DATA && (
                            <Row
                                icon="construct-outline"
                                leading={isRestoring ? <ActivityIndicator size="small" color={ds.accent} /> : undefined}
                                title="Populate demo data"
                                subtitle="For your eyes only"
                                chevron={!isRestoring}
                                onPress={isRestoring ? undefined : handlePopulateDemoData}
                                last
                            />
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

                {/* Step 2: Profile Setup (Existing Logic) */}
                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <Text style={[type.title, { color: ds.text }]}>Let&apos;s get started!</Text>
                        <Text style={[type.small, styles.description, { color: ds.text2 }]}>
                            Setup your financial profile
                        </Text>

                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Preferred name</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="person-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={[type.body, styles.fieldInput, { color: ds.text }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="John Doe"
                                placeholderTextColor={ds.text3}
                            />
                        </View>

                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Currency</Text>
                        <Pressable
                            onPress={() => setCurrencyModalVisible(true)}
                            style={[styles.field, { backgroundColor: ds.inset }]}
                            accessibilityRole="button"
                        >
                            <Text style={[type.bodyStrong, styles.currencySymbol, { color: ds.text2 }]}>
                                {getCurrencyInfo(currency).symbol}
                            </Text>
                            <View style={styles.flex}>
                                <Text style={[type.body, { color: ds.text }]}>{currency}</Text>
                                <Text style={[type.small, { color: ds.text2 }]}>{getCurrencyInfo(currency).name}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={16} color={ds.text3} />
                        </Pressable>

                        <SectionHeader title="Financial goals" />
                        <View style={styles.chips}>
                            {availableGoals.map(goal => (
                                <Pressable
                                    key={goal}
                                    onPress={() => toggleGoal(goal)}
                                    style={[styles.chip, isGoalSelected(goal) && { backgroundColor: ds.inset }]}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: isGoalSelected(goal) }}
                                >
                                    <Text style={[type.smallMedium, { color: isGoalSelected(goal) ? ds.text : ds.text2 }]}>
                                        {goal}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            onPress={() => {
                                if (name.trim().length < 4) {
                                    showAlert('Invalid Name', 'Name must be at least 4 characters long.');
                                    return;
                                }
                                setStep(3);
                            }}
                            style={[styles.button, styles.profileButton, { backgroundColor: ds.accent }]}
                            accessibilityRole="button"
                        >
                            <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Continue</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
            )}

            {/* Restore Modal */}
            <BackupRestoreModal
                visible={showRestoreModal}
                mode="restore"
                onClose={() => setShowRestoreModal(false)}
                onSubmit={confirmRestore}
                isProcessing={isRestoring}
                progress={restoreProgress}
            />

            {/* Currency Selection Modal */}
            <BottomModal
                visible={currencyModalVisible}
                onClose={() => setCurrencyModalVisible(false)}
                title="Select currency"
                maxHeight="85%"
            >
                <View style={currencyStyles.body}>
                    <View style={[currencyStyles.search, { backgroundColor: ds.inset }]}>
                        <Ionicons name="search-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={[type.body, currencyStyles.searchInput, { color: ds.text }]}
                            placeholder="Search currency..."
                            placeholderTextColor={ds.text3}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={space[2]} accessibilityLabel="Clear search">
                                <Ionicons name="close-circle" size={18} color={ds.text3} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <FlatList
                        data={Object.values(CURRENCIES).filter(c =>
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.code.toLowerCase().includes(searchQuery.toLowerCase())
                        )}
                        keyExtractor={item => item.code}
                        renderItem={({ item }) => {
                            const selected = currency === item.code;
                            return (
                                <Row
                                    title={item.name}
                                    subtitle={`${item.code} · ${item.symbol}`}
                                    leading={
                                        <View style={[currencyStyles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
                                            {selected && <View style={[currencyStyles.radioDot, { backgroundColor: ds.accent }]} />}
                                        </View>
                                    }
                                    onPress={() => {
                                        setCurrency(item.code);
                                        setCurrencyModalVisible(false);
                                    }}
                                />
                            );
                        }}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </BottomModal>

        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    stepContainer: {
        flex: 1,
        paddingBottom: space[5],
        justifyContent: 'center', // Center content vertically especially for PIN screen
    },
    center: {
        textAlign: 'center',
    },
    flex: {
        flex: 1,
    },
    description: {
        marginTop: space[1],
        marginBottom: space[4],
    },
    heroHeader: {
        alignItems: 'center',
        gap: space[2],
        marginBottom: space[6],
        paddingTop: space[2],
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[2],
    },
    termsCard: {
        flex: 1,
        maxHeight: height * 0.5,
        borderRadius: radius.md,
        marginBottom: space[3],
        overflow: 'hidden',
    },
    scrollIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
        marginBottom: space[3],
        paddingVertical: space[2],
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginBottom: space[4],
        paddingVertical: space[3],
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        marginTop: space[4],
        marginBottom: space[2],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldInput: {
        flex: 1,
        padding: 0,
    },
    currencySymbol: {
        minWidth: 18,
        textAlign: 'center',
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[2],
        marginTop: space[2],
    },
    chip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileButton: {
        marginTop: space[6],
        marginBottom: space[7],
    },
});

const currencyStyles = StyleSheet.create({
    body: {
        flexShrink: 1,
    },
    search: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
        marginBottom: space[1],
    },
    searchInput: {
        flex: 1,
        padding: 0,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: radius.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
});

export default SetupScreen;
