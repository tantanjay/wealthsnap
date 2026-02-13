import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from '@navigation/AppNavigator';
import BottomModal from '@components/common/BottomModal';
import { SecurityProvider } from '@context/SecurityContext';
import { PrivacyProvider } from '@context/PrivacyContext';
import { AlertProvider } from '@context/AlertContext';
import { ThemeProvider } from '@context/ThemeContext';
import { GlobalErrorBoundary } from '@components/common/GlobalErrorBoundary';
import { PrivacyGuard } from '@components/common/PrivacyGuard';
import { CustomAlert } from '@components/common/CustomAlert';

import { ReminderCatchupModal } from '@components/reminders/ReminderCatchupModal';
import { Reminder } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { getPendingReminders } from '@services/domain/reminderService';
import { isOnboardingComplete, getAcceptedTermsVersion, getLastBackupDate, saveLastBackupDate } from '@services/core/storageService';
import { initNotifications, requestPermissions, registerBackgroundFetchAsync } from '@services/background';
import { CONFIG } from '@constants/config';
import BackupReminderModal from '@components/data/BackupReminderModal';
import BackupModal from '@components/data/BackupModal';
import { createBackup } from '@services/integrations/backupService';
import * as Sharing from 'expo-sharing';

// Standard JS date math is safer since I don't know dependencies.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;


export default function App() {
  const [loading, setLoading] = useState(true);

  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | 'LegalAcceptance'>('Onboarding');
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showCatchup, setShowCatchup] = useState(false);

  // Backup Reminder State
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);

  useEffect(() => {
    initNotifications();
    registerBackgroundFetchAsync();

    const checkCatchup = async () => {
      const pending = await getPendingReminders();
      if (pending.length > 0) {
        setPendingReminders(pending);
        setShowCatchup(true);
      }
    };

    const checkBackupStatus = async () => {
      const lastBackup = await getLastBackupDate();
      if (!lastBackup) {
        // First run or never backed up. Initialize to NOW so we don't bug them for 7 days.
        await saveLastBackupDate(new Date().toISOString());
        return;
      }

      const now = new Date();
      const last = new Date(lastBackup);
      const diffTime = Math.abs(now.getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 7) {
        setShowBackupReminder(true);
      }
    };

    const checkOnboarding = async () => {
      try {
        console.log('[App] Starting database initialization...');
        // Ensure database is initialized and migrations are run
        await getDatabase();
        console.log('[App] Database initialized.');

        // Request notification permission once on launch
        console.log('[App] Requesting permissions...');
        await requestPermissions();
        console.log('[App] Permissions requested.');

      } catch (error) {
        console.error('[App] Database initialization failed:', error);
      }

      console.log('[App] Checking onboarding status...');
      const completed = await isOnboardingComplete();
      console.log('[App] Onboarding complete:', completed);

      const acceptedVersion = await getAcceptedTermsVersion();
      console.log('[App] Terms version:', acceptedVersion);

      if (!completed) {
        setInitialRoute('Onboarding');
      } else if (acceptedVersion < CONFIG.TERMS_VERSION) {
        setInitialRoute('LegalAcceptance');
      } else {
        setInitialRoute('Main');
      }

      setLoading(false);
    };

    // Initial checks
    checkCatchup();
    checkBackupStatus();
    checkOnboarding();

    // Foreground check
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkCatchup();
        checkBackupStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Then show loading while checking onboarding
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Finally show the app
  return (
    <ThemeProvider>
      <GlobalErrorBoundary>
        <SecurityProvider>
          <PrivacyProvider>
            <AlertProvider>
              <PrivacyGuard />
              <SafeAreaProvider>
                <StatusBar style="auto" />
                <AppNavigator initialRoute={initialRoute} />
                <CustomAlert />
                <BottomModal
                  visible={showCatchup}
                  onClose={() => setShowCatchup(false)}
                  title="Reminder Catch-up"
                  maxHeight="85%"
                  style={{ height: '85%' }}
                  contentStyle={{ flex: 1 }}
                >
                  {showCatchup && (
                    <ReminderCatchupModal
                      pendingReminders={pendingReminders}
                      onClose={() => setShowCatchup(false)}
                    />
                  )}
                </BottomModal>

                <BackupReminderModal
                  visible={showBackupReminder}
                  onClose={() => setShowBackupReminder(false)}
                  onCreateBackup={() => {
                    setShowBackupReminder(false);
                    setShowBackupModal(true);
                  }}
                  onRemindLater={async () => {
                    // Reset timer
                    await saveLastBackupDate(new Date().toISOString());
                    setShowBackupReminder(false);
                  }}
                />

                <BackupModal
                  visible={showBackupModal}
                  onClose={() => setShowBackupModal(false)}
                  onBackup={async (password) => {
                    try {
                      setIsBackupProcessing(true);
                      const uri = await createBackup(password);
                      setIsBackupProcessing(false);
                      setShowBackupModal(false);

                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri);
                      }
                    } catch (error) {
                      setIsBackupProcessing(false);
                      console.error(error);
                      // Ideally show alert but we are outside normal context. 
                      alert('Backup Failed: ' + (error as Error).message);
                    }
                  }}
                  isProcessing={isBackupProcessing}
                />
              </SafeAreaProvider>
            </AlertProvider>
          </PrivacyProvider>
        </SecurityProvider>
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
}
