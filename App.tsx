import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { isOnboardingComplete, getAcceptedTermsVersion } from './src/services/storageService';
import { SecurityProvider } from './src/context/SecurityContext';
import { PrivacyProvider } from './src/context/PrivacyContext';
import { CONFIG } from './src/constants/config';
import { MigrationScreen } from './src/screens/onboarding/MigrationScreen';
import { PrivacyGuard } from './src/components/common/PrivacyGuard';
import { AlertProvider } from './src/context/AlertContext';
import { CustomAlert } from './src/components/common/CustomAlert';
import { Reminder } from './src/types';
import { getPendingReminders } from './src/services/reminderService';
import BottomModal from './src/components/common/BottomModal';
import { ReminderCatchupModal } from './src/components/reminders/ReminderCatchupModal';
import { GlobalErrorBoundary } from './src/components/common/GlobalErrorBoundary';


import { getDatabase } from './src/services/database/databaseService';

import { initNotifications, requestPermissions } from './src/services/notificationService';
import { registerBackgroundFetchAsync } from './src/services/backgroundService';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | 'LegalAcceptance'>('Onboarding');
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showCatchup, setShowCatchup] = useState(false);

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

    // Initial check
    checkCatchup();

    // Foreground check
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkCatchup();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleMigrationComplete = async () => {
    setMigrating(false);
    await checkOnboarding();
  };

  const checkOnboarding = async () => {
    try {
      // Ensure database is initialized and migrations are run
      await getDatabase();

      // Request notification permission once on launch
      await requestPermissions();

    } catch (error) {
      console.error('[App] Database initialization failed:', error);
    }

    const completed = await isOnboardingComplete();
    const acceptedVersion = await getAcceptedTermsVersion();

    if (!completed) {
      setInitialRoute('Onboarding');
    } else if (acceptedVersion < CONFIG.TERMS_VERSION) {
      setInitialRoute('LegalAcceptance');
    } else {
      setInitialRoute('Main');
    }

    setLoading(false);
  };

  // Show migration screen first
  if (migrating) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <MigrationScreen onComplete={handleMigrationComplete} />
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

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
              </SafeAreaProvider>
            </AlertProvider>
          </PrivacyProvider>
        </SecurityProvider>
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
}
