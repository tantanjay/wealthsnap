import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from '@navigation/AppNavigator';
import BottomModal from '@components/common/BottomModal';
import { SecurityProvider, useSecurity } from '@context/SecurityContext';
import { PrivacyProvider } from '@context/PrivacyContext';
import { AlertProvider } from '@context/AlertContext';
import { ThemeProvider } from '@context/ThemeContext';
import { FloatingGearProvider } from '@context/FloatingGearContext';
import { GlobalErrorBoundary } from '@components/common/GlobalErrorBoundary';
import { PrivacyGuard } from '@components/common/PrivacyGuard';
import { CustomAlert } from '@components/common/CustomAlert';
import FloatingGearBubble from '@components/common/FloatingGearBubble';

import { ReminderCatchupModal } from '@components/reminders/ReminderCatchupModal';
import { Reminder } from '@types';
import { getDatabase } from '@services/database/databaseService';
import { getPendingReminders } from '@services/domain/reminderService';
import { syncMonthlySummaries } from '@services/domain/monthlySummaryService';
import { isOnboardingComplete, getAcceptedTermsVersion, getLastBackupDate, saveLastBackupDate } from '@services/core/storageService';
import { initNotifications, requestPermissions, registerBackgroundFetchAsync } from '@services/background';
import { CONFIG } from '@constants/config';
import BackupReminderModal from '@components/data/BackupReminderModal';
import BackupRestoreModal from '@components/data/BackupRestoreModal';
import { createBackup, BackupProgress } from '@services/integrations/backupService';
import * as Sharing from 'expo-sharing';

// Standard JS date math is safer since I don't know dependencies.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;


export default function App() {
  const [loading, setLoading] = useState(true);

  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | 'LegalAcceptance'>('Onboarding');

  useEffect(() => {
    initNotifications();
    registerBackgroundFetchAsync();

    const checkOnboarding = async () => {
      try {
        console.log('[App] Starting database initialization...');
        // Ensure database is initialized and migrations are run
        await getDatabase();
        console.log('[App] Database initialized.');

        // Fire-and-forget: keep monthly summaries up to date. Cheap after the first run,
        // since already-finalized past months are skipped.
        syncMonthlySummaries().catch(err => console.error('[App] Monthly summary sync failed:', err));

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
    checkOnboarding();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <GlobalErrorBoundary>
          <SecurityProvider>
            <PrivacyProvider>
              <AlertProvider>
                <PrivacyGuard />
                <SafeAreaProvider>
                  <StatusBar style="auto" />
                  <FloatingGearProvider>
                    <AppContent initialRoute={initialRoute} />
                  </FloatingGearProvider>
                </SafeAreaProvider>
              </AlertProvider>
            </PrivacyProvider>
          </SecurityProvider>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Inner component to access contexts (Security, etc)
const AppContent = ({ initialRoute }: { initialRoute: 'Onboarding' | 'Main' | 'LegalAcceptance' }) => {
  const security = useSecurity(); // Now available
  // Safety check for security context availability (though it should be available given the provider above)
  const isLocked = security ? security.isLocked : false;

  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showCatchup, setShowCatchup] = useState(false);

  // Backup Reminder State
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);

  useEffect(() => {
    const checkBackupsAndReminders = async () => {
      // 1. Check Reminders (ONLY if not locked)
      if (!isLocked) {
        const pending = await getPendingReminders();
        if (pending.length > 0) {
          setPendingReminders(pending);
          setShowCatchup(true);
          return;
        }
      }

      // 2. Check Backups (Less critical, can also wait for unlock)
      if (!isLocked) {
        const lastBackup = await getLastBackupDate();
        if (!lastBackup) {
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
      }
    };

    // Run on mount (if unlocked) or whenever lock state changes to UNLOCKED
    if (!isLocked) {
      checkBackupsAndReminders();
    }

    // Foreground check
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !isLocked) {
        checkBackupsAndReminders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLocked]); // Re-run when lock state changes

  return (
    <>
      <AppNavigator initialRoute={initialRoute} />
      <FloatingGearBubble />
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
          await saveLastBackupDate(new Date().toISOString());
          setShowBackupReminder(false);
        }}
      />

      <BackupRestoreModal
        visible={showBackupModal}
        mode="backup"
        onClose={() => setShowBackupModal(false)}
        onSubmit={async (password) => {
          try {
            setIsBackupProcessing(true);
            const uri = await createBackup(password, setBackupProgress);
            setIsBackupProcessing(false);
            setBackupProgress(null);
            setShowBackupModal(false);

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri);
            }
          } catch (error) {
            setIsBackupProcessing(false);
            setBackupProgress(null);
            console.error(error);
            alert('Backup Failed: ' + (error as Error).message);
          }
        }}
        isProcessing={isBackupProcessing}
        progress={backupProgress}
      />
    </>
  );
};
