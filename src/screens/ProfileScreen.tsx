import React, { useState, useCallback } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
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

    const ThemeOption = ({ title, value, current }: { title: string, value: 'light' | 'dark' | 'system', current: string }) => (
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
            <Text style={{
                color: current === value ? '#fff' : colors.text,
                fontWeight: current === value ? '600' : '400'
            }}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Profile & Settings</Text>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 15 }}>Appearance</Text>
                <View style={styles.themeContainer}>
                    <ThemeOption title="Light" value="light" current={mode} />
                    <ThemeOption title="Dark" value="dark" current={mode} />
                    <ThemeOption title="System" value="system" current={mode} />
                </View>
            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Transactions</Text>
                <Button variant="outline" title="Manage Recurring" onPress={handleManageRecurring} style={{ marginBottom: 10 }} />
                <Button variant="outline" title="Manage Budgets" onPress={() => setShowBudgetModal(true)} />
            </Card>

            <DataManagementCard navigation={navigation} />

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Gemini AI Settings</Text>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>
                    {hasApiKey
                        ? "✅ Custom API Key is configured."
                        : "Use your own API key for smart insights."}
                </Text>
                <Button
                    variant="outline"
                    title={hasApiKey ? "Change API Key" : "Configure API Key"}
                    onPress={() => setShowGeminiModal(true)}
                    style={{ marginBottom: 10 }}
                />
                <Button
                    variant="outline"
                    title="View Usage"
                    onPress={() => setShowGeminiUsageModal(true)}
                />
            </Card>

            <SecurityCard />

            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <View style={{
                        width: 40, height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.primary + '20', // 20% opacity primary
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 12
                    }}>
                        <Ionicons name="book" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Help & Guide</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Master your personal finance</Text>
                    </View>
                </View>

                <Button variant="primary" title="View Onboarding Guide" onPress={() => setShowGuide(true)} />

            </Card>

            <Card>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>About</Text>
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
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}
                >
                    <Ionicons name="heart-outline" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                        Support Developer
                    </Text>
                </TouchableOpacity>

                <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 15 }}>
                    Version {appJson.expo.version}
                </Text>
            </Card>

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
        </ScreenWrapper >

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
    }
});

export default ProfileScreen;
