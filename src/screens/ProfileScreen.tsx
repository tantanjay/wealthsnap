import React, { useState, useCallback } from 'react';
import { Text, View, StyleSheet, ScrollView, Linking, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import appJson from '@app.json';
import BottomModal from '@components/common/BottomModal';
import SecurityCard from '@components/profile/SecurityCard';
import HelpCenterScreen from '@screens/onboarding/HelpCenterScreen';
import BudgetManagementModal from '@components/profile/BudgetManagementModal';
import DataManagementCard from '@components/profile/data/DataManagementCard';
import SupportModal from '@components/profile/settings/SupportModal';
import ProfileHeader from '@components/profile/ProfileHeader';
import QuickActionsCard from '@components/profile/QuickActionsCard';
import AppearanceCard from '@components/profile/AppearanceCard';
import DeveloperToolsCard from '@components/profile/DeveloperToolsCard';
import HelpSectionCard from '@components/profile/HelpSectionCard';
import AboutCard from '@components/profile/AboutCard';
import { Button } from '@components/index';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { ReminderManager } from '@components/reminders/ReminderManager';
import { RecurringRulesListModal } from '@components/profile/RecurringRulesListModal';
import { AssetsListModal } from '@components/profile/assets/AssetsListModal';
import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { RecurrenceRule } from '@types';
import { getAllRecurrenceRules, saveRecurrenceRule, deleteRecurrenceRule } from '@services/domain';
import { getUserProfile } from '@services/core/storageService';
import { CONFIG, ASYNC_KEYS } from '@constants/config';

const ProfileScreen = ({ navigation }: any) => {
    const { colors, setMode, mode } = useTheme();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();

    // Recurring Rules State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [currency, setCurrency] = useState('PHP');

    // Budget State
    // Budget State
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    // Assets State
    const [showAssetsModal, setShowAssetsModal] = useState(false);

    // Support Modal State
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showWhyFreeModal, setShowWhyFreeModal] = useState(false);
    const [showDevMessageModal, setShowDevMessageModal] = useState(false);
    const [showRemindersModal, setShowRemindersModal] = useState(false);

    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showManifestoModal, setShowManifestoModal] = useState(false);

    // Developer Mode State
    const [isDevMode, setIsDevMode] = useState(false);
    const [devTapCount, setDevTapCount] = useState(0);

    // Crash Simulation State
    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
        throw new Error('This is a simulated crash for testing purposes.');
    }

    useFocusEffect(
        useCallback(() => {
            checkCurrency();
            checkDevMode();
        }, [])
    );

    const checkDevMode = async () => {
        try {
            const enabled = await AsyncStorage.getItem(ASYNC_KEYS.DEVELOPER_MODE);
            setIsDevMode(enabled === 'true');
        } catch (error) {
            console.error('Failed to check dev mode', error);
        }
    };

    const checkCurrency = async () => {
        const profile = await getUserProfile();
        if (profile?.currency) {
            setCurrency(profile.currency);
        }
    }

    const handleManageRecurring = async () => {
        const rules = await getAllRecurrenceRules();
        setRecurrenceRules(rules);
        setShowRecurringModal(true);
    };

    const handleToggleRule = async (rule: RecurrenceRule) => {
        try {
            const updatedRule = { ...rule, isActive: !rule.isActive };
            await saveRecurrenceRule(updatedRule);

            // Refresh list
            const rules = await getAllRecurrenceRules();
            setRecurrenceRules(rules);
        } catch {
            showAlert('Error', 'Failed to update rule');
        }
    };

    const handleDeleteRule = (id: string) => {
        showAlert(
            "Delete Rule",
            "Stop this recurring transaction? Past transactions will remain.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteRecurrenceRule(id);
                        const rules = await getAllRecurrenceRules();
                        setRecurrenceRules(rules);
                    }
                }
            ]
        );
    };

    const handleDevTap = async () => {
        if (isDevMode) return;

        const newCount = devTapCount + 1;
        setDevTapCount(newCount);

        if (newCount >= 7) {
            try {
                await AsyncStorage.setItem(ASYNC_KEYS.DEVELOPER_MODE, 'true');
                setIsDevMode(true);
                ToastAndroid.show("You are now a tester!", ToastAndroid.SHORT);
            } catch (error) {
                console.error('Failed to enable dev mode', error);
            }
        } else if (newCount >= 4) {
            const remaining = 7 - newCount;
            ToastAndroid.show(`You are ${remaining} steps away from being a tester`, ToastAndroid.SHORT);
        }
    };



    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <ProfileHeader />

                {/* Quick Actions Card */}
                <QuickActionsCard
                    onAssetsPress={() => setShowAssetsModal(true)}
                    onRecurringPress={handleManageRecurring}
                    onBudgetPress={() => setShowBudgetModal(true)}
                    onRemindersPress={() => setShowRemindersModal(true)}
                />

                {/* Data Management */}
                <DataManagementCard navigation={navigation} />

                {/* Security */}
                <SecurityCard />

                {/* Appearance Card */}
                <AppearanceCard mode={mode} setMode={setMode} />

                {(CONFIG.SHOW_DEVELOPER_OPTIONS || isDevMode) && (
                    <DeveloperToolsCard
                        onShareLogs={async () => {
                            try {
                                const logs = await AsyncStorage.getItem(ASYNC_KEYS.CRASH_REPORT);
                                if (!logs) {
                                    showAlert('No Logs', 'No crash logs found.');
                                    return;
                                }

                                const path = FileSystem.documentDirectory + 'crash_report.json';
                                await FileSystem.writeAsStringAsync(path, logs);

                                if (await Sharing.isAvailableAsync()) {
                                    temporarilyDisableLock();
                                    await Sharing.shareAsync(path);
                                } else {
                                    showAlert('Error', 'Sharing is not available on this device');
                                }
                            } catch (error) {
                                console.error(error);
                                showAlert('Error', 'Failed to share logs');
                            }
                        }}
                        onSimulateCrash={() => setShouldCrash(true)}
                    />
                )}

                {/* Help & Documentation  */}
                <HelpSectionCard
                    onOpenHelp={() => setShowGuide(true)}
                    onOpenTerms={() => navigation.navigate('TermsAndPrivacy')}
                    onOpenFeedback={() => setShowFeedbackModal(true)}
                />

                {/* About Card */}
                <AboutCard
                    onDevTap={handleDevTap}
                    onWhyFree={() => setShowWhyFreeModal(true)}
                    onDevMessage={() => setShowDevMessageModal(true)}
                    onManifesto={() => setShowManifestoModal(true)}
                    onSupport={() => setShowSupportModal(true)}
                    version={appJson.expo.version}
                />

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Why Free Modal */}
            <BottomModal
                visible={showWhyFreeModal}
                onClose={() => setShowWhyFreeModal(false)}
                title="Why is WealthSnap free? 🎁"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 10, marginBottom: 20 }}>
                        Most &quot;free&quot; apps stay alive by selling your data or burying you in ads. WealthSnap takes a different path: <Text style={{ fontWeight: '700', color: colors.text }}>Architectural Integrity</Text>.
                    </Text>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            1. No Servers, No Costs
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            Because your data never leaves your device, I have zero server hosting or database costs. Since it costs me nothing to store your data, it costs you nothing to use the app.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            2. Sustainable AI (BYOK)
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            By using your own Gemini API key for AI features, you cover your own &quot;usage tax&quot;. This allows me to offer advanced intelligence without a subscription fee or venture capital funding.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            3. Built for the Developer
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            I built this tool for my own financial clarity. Sharing it with you costs me nothing but my time, and I believe everyone deserves a high-resolution view of their life without a price tag or a privacy trade-off.
                        </Text>
                    </View>

                    <Button
                        title="Got it!"
                        onPress={() => setShowWhyFreeModal(false)}
                        style={{ marginTop: 10, marginBottom: 20 }}
                    />
                </ScrollView>
            </BottomModal>

            {/* Developer Message Modal */}
            <BottomModal
                visible={showDevMessageModal}
                onClose={() => setShowDevMessageModal(false)}
                title="Hello there! 👋"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '500', marginBottom: 12 }}>
                        Thanks for using WealthSnap!
                    </Text>

                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16 }}>
                        I built this app because I wanted a higher resolution for my own financial life. For years, I relied on <Text style={{ fontWeight: '700', color: colors.text }}>Lista</Text>—a fantastic tool that I still genuinely admire for its simplicity. However, as my needs grew toward complex investment tracking and deep-tier financial logic, I realized I needed a private &quot;bunker&quot; for my data.
                    </Text>

                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16 }}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>WealthSnap</Text> was born from that need. What started as a personal script has evolved into a privacy-first platform designed for those who want full control over their records without the &quot;cloud-sync&quot; trade-off.
                    </Text>

                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                            A Note on the Build
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            <Text style={{ fontWeight: '700', color: colors.text }}>WealthSnap</Text> is a 100% independent, solo-developed project. There are no venture capitalists or support teams here—just one engineer and a keyboard.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 12 }}>
                            Because this is a personal mission, updates and support are provided on a &quot;best-effort&quot; basis between my professional life and family time. If this app brings you clarity, the mission is accomplished; if it needs a fix, I&apos;ll get to it as soon as life permits.
                        </Text>
                    </View>

                    <Button
                        title="Close"
                        onPress={() => setShowDevMessageModal(false)}
                        variant="outline"
                    />
                </ScrollView>
            </BottomModal>

            {/* Recurring Rules Modal */}
            <RecurringRulesListModal
                visible={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
                rules={recurrenceRules}
                onToggleRule={handleToggleRule}
                onDeleteRule={handleDeleteRule}
                currency={currency}
            />

            {/* Budget Management Modal */}
            <BudgetManagementModal
                visible={showBudgetModal}
                onClose={() => setShowBudgetModal(false)}
                currency={currency}
            />

            {/* Assets List Modal */}
            <AssetsListModal
                visible={showAssetsModal}
                onClose={() => setShowAssetsModal(false)}
            />

            {/* Reminders Modal */}
            <BottomModal
                visible={showRemindersModal}
                onClose={() => setShowRemindersModal(false)}
                title="Reminders ⏰"
                maxHeight="85%"
                style={{ height: '85%' }}
                contentStyle={{ flex: 1 }}
            >
                <ReminderManager onClose={() => setShowRemindersModal(false)} />
            </BottomModal>

            {/* Support Modal */}
            <SupportModal
                visible={showSupportModal}
                onClose={() => setShowSupportModal(false)}
            />

            {/* Help Center Modal */}
            <BottomModal
                visible={showGuide}
                onClose={() => setShowGuide(false)}
                maxHeight="90%"
                title=""
                style={{ padding: 0 }} // Remove default padding to let screen handle it
            >
                <View style={{ height: '100%' }}>
                    <HelpCenterScreen onFinish={() => setShowGuide(false)} mode="view" />
                </View>
            </BottomModal>

            {/* Feedback Modal */}
            <BottomModal
                visible={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                title="Provide Feedback 💬"
            >
                <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                        Since WealthSnap is an offline-first app, we don&apos;t track your usage or collect any data. This ensures your privacy, but it also means we don&apos;t automatically know when things go wrong.
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 15 }}>
                        Your feedback via Google Forms helps us understand bugs, quirks, and which updates you&apos;d like to see next. It&apos;s the best way to help improve the app while keeping it private!
                    </Text>

                    <Button
                        title="Take me to Google Form"
                        onPress={() => {
                            setShowFeedbackModal(false);
                            Linking.openURL('https://forms.gle/rS6kdufy6uBMLMjf6');
                        }}
                        style={{ marginTop: 24 }}
                    />
                    <Button
                        title="Maybe later"
                        onPress={() => setShowFeedbackModal(false)}
                        variant="outline"
                        style={{ marginTop: 12 }}
                    />
                </View>
            </BottomModal>

            {/* Manifesto Modal */}
            <BottomModal
                visible={showManifestoModal}
                onClose={() => setShowManifestoModal(false)}
                title="Vision, Philosophy & Goals"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: 20, marginTop: 5 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🔭 Vision</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            To provide absolute ownership of financial truth through a zero-knowledge, local-first architecture. WealthSnap envisions a world where privacy is the default and individual data is the ultimate tool for personal clarity.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🏛️ Philosophy & Standings</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            WealthSnap is a Reflection Tool, not an advisor or a trading platform. It does not provide tips or financial &quot;shoulds&quot;; it provides a high-precision mirror of your own data to help you see your reality without external noise.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🎯 Strategic Goals</Text>

                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginRight: 8 }}>1.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>The Skill Portfolio</Text>: Treat professional knowledge as a high-yield financial asset. WealthSnap tracks skills as a portfolio that generates dividends in earning potential.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginRight: 8 }}>2.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>The Health Portfolio</Text>: Manage the &quot;Physical Hardware&quot; required to run your &quot;Professional Software&quot; Health is the ultimate insurance for future earning power.
                            </Text>
                        </View>
                    </View>

                    <Button
                        title="Close"
                        onPress={() => setShowManifestoModal(false)}
                        variant="outline"
                        style={{ marginTop: 10, marginBottom: 20 }}
                    />
                </ScrollView>
            </BottomModal>
        </ScreenWrapper >

    );
};

const styles = StyleSheet.create({
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
});

export default ProfileScreen;
