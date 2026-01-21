import React, { useState, useCallback } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import BudgetManagementModal from '../components/profile/BudgetManagementModal';
import SupportModal from '../components/profile/settings/SupportModal';
import GeminiSettingsModal from '../components/profile/settings/GeminiSettingsModal';
import GeminiUsageModal from '../components/profile/settings/GeminiUsageModal';
import { getAIConfig, getAllRecurrenceRules, saveRecurrenceRule, deleteRecurrenceRule, getUserProfile } from '../services/storageService';
import { RecurrenceRule } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import OnboardingGuide from './Onboarding/OnboardingGuide';
import appJson from '../../app.json';
import SecurityCard from '../components/profile/SecurityCard';
import DataManagementCard from '../components/profile/data/DataManagementCard';
import { RecurringRulesListModal } from '../components/profile/RecurringRulesListModal';
import { useAlert } from '../context/AlertContext';


const ProfileScreen = ({ navigation }: any) => {
    const { colors, setMode, mode } = useTheme();
    const { showAlert } = useAlert();
    const [hasApiKey, setHasApiKey] = useState(false);

    // Recurring Rules State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [currency, setCurrency] = useState('USD');

    // Budget State
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    // Support Modal State
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showGeminiModal, setShowGeminiModal] = useState(false);
    const [showGeminiUsageModal, setShowGeminiUsageModal] = useState(false);


    useFocusEffect(
        useCallback(() => {
            checkApiKey();
            checkCurrency();
        }, [])
    );

    const checkCurrency = async () => {
        const profile = await getUserProfile();
        if (profile?.currency) {
            setCurrency(profile.currency);
        }
    }

    const checkApiKey = async () => {
        const config = await getAIConfig();
        if (config && config.apiKey) {
            setHasApiKey(true);
        }
    };

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

    const ThemeOption = ({ icon, title, value, current }: { icon: string, title: string, value: 'light' | 'dark' | 'system', current: string }) => (
        <TouchableOpacity
            style={[
                styles.themeButton,
                {
                    backgroundColor: current === value ? colors.primary : 'transparent',
                    borderColor: current === value ? colors.primary : colors.border,
                }
            ]}
            onPress={() => setMode(value)}
        >
            <Ionicons
                name={icon as any}
                size={18}
                color={current === value ? '#fff' : colors.text}
                style={{ marginRight: 6 }}
            />
            <Text style={{
                color: current === value ? '#fff' : colors.text,
                fontWeight: current === value ? '600' : '400'
            }}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const SettingItem = ({
        icon,
        title,
        subtitle,
        onPress,
        iconBg,
        iconColor,
        isLast = false
    }: {
        icon: string,
        title: string,
        subtitle?: string,
        onPress: () => void,
        iconBg?: string,
        iconColor?: string,
        isLast?: boolean
    }) => (
        <TouchableOpacity
            style={[
                styles.settingItem,
                { borderBottomColor: colors.border },
                isLast && { borderBottomWidth: 0 }
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconBg || colors.primary + '20' }]}>
                <Ionicons name={icon as any} size={22} color={iconColor || colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20, marginTop: 10 }}>
                    <Text style={{ color: colors.textSecondary }}>Settings & Preferences</Text>
                    <Text style={{ color: colors.text, fontSize: 28, fontWeight: 'bold' }}>Profile</Text>
                </View>

                {/* Appearance Card */}
                <Card style={{ marginBottom: 16 }}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="color-palette" size={22} color={colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
                    </View>
                    <View style={styles.themeContainer}>
                        <ThemeOption icon="sunny" title="Light" value="light" current={mode} />
                        <ThemeOption icon="moon" title="Dark" value="dark" current={mode} />
                        <ThemeOption icon="phone-portrait" title="System" value="system" current={mode} />
                    </View>
                </Card>

                {/* Quick Actions Card */}
                <Card style={{ marginBottom: 16 }}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.headerIcon, { backgroundColor: colors.accent + '20' }]}>
                            <Ionicons name="wallet" size={22} color={colors.accent} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Transactions</Text>
                    </View>
                    <SettingItem
                        icon="repeat"
                        title="Recurring Transactions"
                        subtitle="Manage automatic entries"
                        onPress={handleManageRecurring}
                        iconBg={colors.success + '20'}
                        iconColor={colors.success}
                    />
                    <SettingItem
                        icon="calculator"
                        title="Budget Management"
                        subtitle="Set spending limits"
                        onPress={() => setShowBudgetModal(true)}
                        iconBg={colors.warning + '20'}
                        iconColor={colors.warning}
                    />
                </Card>

                {/* Data Management */}
                <DataManagementCard navigation={navigation} />

                {/* Gemini AI Card - Enhanced */}
                <Card style={{ marginBottom: 16, backgroundColor: colors.primary, padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }]}>
                            <Ionicons name="sparkles" size={22} color={colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.white }]}>Gemini AI</Text>
                            <Text style={{ color: colors.white, opacity: 0.9, fontSize: 13, marginTop: 2 }}>
                                {hasApiKey ? "✓ API Key configured" : "Configure your API key"}
                            </Text>
                        </View>
                    </View>

                    <View style={{ gap: 8 }}>
                        <TouchableOpacity
                            style={styles.aiButton}
                            onPress={() => setShowGeminiModal(true)}
                        >
                            <Ionicons name="key" size={18} color={colors.primary} />
                            <Text style={[styles.aiButtonText, { color: colors.primary }]}>
                                {hasApiKey ? "Change API Key" : "Configure API Key"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.aiButton}
                            onPress={() => setShowGeminiUsageModal(true)}
                        >
                            <Ionicons name="bar-chart" size={18} color={colors.primary} />
                            <Text style={[styles.aiButtonText, { color: colors.primary }]}>View Usage Statistics</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Security */}
                <SecurityCard />

                {/* Help & Guide Card */}
                <Card style={{ marginBottom: 16, backgroundColor: colors.info, padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }]}>
                            <Ionicons name="book" size={22} color={colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.white }]}>Help & Guide</Text>
                            <Text style={{ color: colors.white, opacity: 0.9, fontSize: 13, marginTop: 2 }}>
                                Master your personal finance
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.aiButton}
                        onPress={() => setShowGuide(true)}
                    >
                        <Ionicons name="book-outline" size={18} color={colors.info} />
                        <Text style={[styles.aiButtonText, { color: colors.info }]}>View Onboarding Guide</Text>
                    </TouchableOpacity>
                </Card>

                {/* About Card */}
                <Card>
                    <View style={styles.cardHeader}>
                        <View style={[styles.headerIcon, { backgroundColor: colors.secondary + '20' }]}>
                            <Ionicons name="information-circle" size={22} color={colors.secondary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>About WealthSnap</Text>
                    </View>

                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 15 }}>
                        WealthSnap is a free, ad-free personal finance tracker with AI-powered receipt scanning. Your data stays private and secure on your device.
                    </Text>

                    <View style={{ backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: 12, borderRadius: 8, marginBottom: 15 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 }}>Why is WealthSnap free?</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                            WealthSnap was built as a passion project to provide a high-quality, private financial tool without the tracking found in modern apps. We don&apos;t have server costs because your data stays on your phone. If you use the AI features, you use your own API key, keeping the app sustainable and free for everyone.
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setShowSupportModal(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15 }}
                    >
                        <Ionicons name="heart" size={18} color={colors.error} />
                        <Text style={{ color: colors.error, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                            Support the Developer
                        </Text>
                    </TouchableOpacity>

                    <Text style={{ color: colors.gray500, fontSize: 12 }}>
                        Version {appJson.expo.version}
                    </Text>
                </Card>

                <View style={{ height: 40 }} />
            </ScrollView>

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

            {/* Support Modal */}
            <SupportModal
                visible={showSupportModal}
                onClose={() => setShowSupportModal(false)}
            />

            {/* Gemini Settings Modal */}
            <GeminiSettingsModal
                visible={showGeminiModal}
                onClose={() => setShowGeminiModal(false)}
                hasApiKey={hasApiKey}
                onApiKeySaved={checkApiKey}
            />

            {/* Gemini Usage Modal */}
            <GeminiUsageModal
                visible={showGeminiUsageModal}
                onClose={() => setShowGeminiUsageModal(false)}
            />

            {/* Guide Modal */}
            <Modal visible={showGuide} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGuide(false)}>
                <OnboardingGuide onFinish={() => setShowGuide(false)} mode="view" />
            </Modal>
        </ScreenWrapper>

    );
};

const styles = StyleSheet.create({
    themeContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    themeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
    },
    aiButton: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiButtonText: {
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 8,
    },
});

export default ProfileScreen;
