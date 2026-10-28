import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import BottomModal from '@components/common/BottomModal';
import { Row, SectionHeader } from '@components/ds';
import SecurityCard from '@components/profile/SecurityCard';
import BudgetManagementModal from '@components/profile/BudgetManagementModal';
import MonthlySummaryModal from '@components/insights/modals/MonthlySummaryModal';
import ProfileHeader from '@components/profile/ProfileHeader';
import QuickActionsCard from '@components/profile/QuickActionsCard';
import AppearanceCard from '@components/profile/AppearanceCard';
import DeveloperToolsCard from '@components/profile/DeveloperToolsCard';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { ReminderManager } from '@components/reminders/ReminderManager';
import { RecurringRulesListModal } from '@components/profile/RecurringRulesListModal';
import { AssetsListModal } from '@components/profile/assets/AssetsListModal';
import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { space } from '@styles/theme';
import { RecurrenceRule, UserProfile } from '@types';
import { getAllRecurrenceRules, saveRecurrenceRule, deleteRecurrenceRule } from '@services/domain/recurrenceService';
import { getUserProfile } from '@services/core/storageService';
import { getAutoBackupSettings, runAutoBackupIfDue } from '@services/integrations/autoBackupService';
import { CONFIG, ASYNC_KEYS } from '@constants/config';

// Account and app settings only; help and about content lives in the Learn tab.
const ProfileScreen = ({ navigation }: any) => {
    const { ds, setMode, mode } = useTheme();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [autoBackupLabel, setAutoBackupLabel] = useState<string | undefined>(undefined);

    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showAssetsModal, setShowAssetsModal] = useState(false);
    const [showRemindersModal, setShowRemindersModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    // Bumped when a Money setup modal closes so its row counts refresh.
    const [setupRefresh, setSetupRefresh] = useState(0);

    const [isDevMode, setIsDevMode] = useState(false);
    const [isRunningAutoBackup, setIsRunningAutoBackup] = useState(false);

    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
        throw new Error('This is a simulated crash for testing purposes.');
    }

    const currency = profile?.currency || 'PHP';

    const loadAutoBackupLabel = async () => {
        const settings = await getAutoBackupSettings();
        if (!settings.enabled) {
            setAutoBackupLabel('Off');
        } else if (settings.lastRunAt) {
            const d = new Date(settings.lastRunAt);
            setAutoBackupLabel(`Last run ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`);
        } else {
            setAutoBackupLabel('On · not run yet');
        }
    };

    useFocusEffect(
        useCallback(() => {
            getUserProfile().then(setProfile);
            loadAutoBackupLabel();
            // Developer mode is switched on from Learn (tap "About WealthSnap" 7 times).
            AsyncStorage.getItem(ASYNC_KEYS.DEVELOPER_MODE)
                .then(enabled => setIsDevMode(enabled === 'true'))
                .catch(error => console.error('Failed to check dev mode', error));
        }, [])
    );

    // Excludes any rule whose transactionTemplate carries a savingsGoalId - a goal's
    // auto-contribution rule is managed exclusively through the goal's own pause toggle
    // (SavingsGoalOptionsModal), so isPaused and the rule's isActive can never drift apart.
    // Surfacing it here too would let a user flip isActive directly and desync the two.
    const getManagedRecurrenceRules = async (): Promise<RecurrenceRule[]> => {
        const rules = await getAllRecurrenceRules();
        return rules.filter(r => !r.transactionTemplate?.savingsGoalId);
    };

    const handleManageRecurring = async () => {
        const rules = await getManagedRecurrenceRules();
        setRecurrenceRules(rules);
        setShowRecurringModal(true);
    };

    const handleToggleRule = async (rule: RecurrenceRule) => {
        try {
            const updatedRule = { ...rule, isActive: !rule.isActive };
            await saveRecurrenceRule(updatedRule);

            // Refresh list
            const rules = await getManagedRecurrenceRules();
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
                        const rules = await getManagedRecurrenceRules();
                        setRecurrenceRules(rules);
                    }
                }
            ]
        );
    };

    const handleRunAutoBackupNow = async () => {
        setIsRunningAutoBackup(true);
        try {
            const result = await runAutoBackupIfDue({ force: true });
            if (result.status === 'success') {
                showAlert('Auto Backup', 'Backup completed successfully.');
            } else if (result.status === 'skipped') {
                showAlert('Auto Backup Skipped', result.reason);
            } else {
                showAlert('Auto Backup Failed', result.message);
            }
        } finally {
            setIsRunningAutoBackup(false);
            loadAutoBackupLabel();
        }
    };

    const handleShareLogs = async () => {
        try {
            const logs = await AsyncStorage.getItem(ASYNC_KEYS.CRASH_REPORT);
            if (!logs) {
                showAlert('No Logs', 'No crash logs found.');
                return;
            }

            const logFile = new File(Paths.document, 'crash_report.json');
            logFile.write(logs);

            if (await Sharing.isAvailableAsync()) {
                temporarilyDisableLock();
                await Sharing.shareAsync(logFile.uri);
            } else {
                showAlert('Error', 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to share logs');
        }
    };

    const closeSetupModal = (close: () => void) => () => {
        close();
        setSetupRefresh(n => n + 1);
    };

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <ProfileHeader profile={profile} />

                <QuickActionsCard
                    onAssetsPress={() => setShowAssetsModal(true)}
                    onRecurringPress={handleManageRecurring}
                    onBudgetPress={() => setShowBudgetModal(true)}
                    onRemindersPress={() => setShowRemindersModal(true)}
                    refreshSignal={setupRefresh}
                />

                <SectionHeader title="Data" />
                <Row
                    icon="cloud-upload-outline"
                    title="Auto backup"
                    subtitle={autoBackupLabel}
                    chevron
                    onPress={() => navigation.navigate('AutoBackup')}
                />
                <Row
                    icon="swap-vertical-outline"
                    title="Import / export"
                    subtitle="Backup files, CSV, Excel and device sync"
                    chevron
                    onPress={() => navigation.navigate('ImportExport')}
                />
                <Row
                    icon="document-text-outline"
                    title="Monthly summary"
                    subtitle="A written recap of each month"
                    chevron
                    onPress={() => setShowSummaryModal(true)}
                    last
                />

                <SecurityCard />

                <AppearanceCard mode={mode} setMode={setMode} />

                {(CONFIG.SHOW_DEVELOPER_OPTIONS || isDevMode) && (
                    <DeveloperToolsCard
                        onShareLogs={handleShareLogs}
                        onSimulateCrash={() => setShouldCrash(true)}
                        onRunAutoBackup={handleRunAutoBackupNow}
                        isRunningAutoBackup={isRunningAutoBackup}
                    />
                )}
            </ScrollView>

            <RecurringRulesListModal
                visible={showRecurringModal}
                onClose={closeSetupModal(() => setShowRecurringModal(false))}
                rules={recurrenceRules}
                onToggleRule={handleToggleRule}
                onDeleteRule={handleDeleteRule}
                currency={currency}
            />

            <BudgetManagementModal
                visible={showBudgetModal}
                onClose={closeSetupModal(() => setShowBudgetModal(false))}
                currency={currency}
            />

            <AssetsListModal
                visible={showAssetsModal}
                onClose={() => setShowAssetsModal(false)}
            />

            <MonthlySummaryModal visible={showSummaryModal} onClose={() => setShowSummaryModal(false)} />

            <BottomModal
                visible={showRemindersModal}
                onClose={closeSetupModal(() => setShowRemindersModal(false))}
                title="Reminders"
                maxHeight="85%"
                style={{ height: '85%' }}
                contentStyle={{ flex: 1 }}
            >
                <ReminderManager onClose={closeSetupModal(() => setShowRemindersModal(false))} />
            </BottomModal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
});

export default ProfileScreen;
