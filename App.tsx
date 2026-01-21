import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { isOnboardingComplete } from './src/services/storageService';
import { SecurityProvider } from './src/context/SecurityContext';
import { PrivacyProvider } from './src/context/PrivacyContext';
import { MigrationScreen } from './src/screens/MigrationScreen';
import { PrivacyGuard } from './src/components/common/PrivacyGuard';
import { AlertProvider } from './src/context/AlertContext';
import { CustomAlert } from './src/components/common/CustomAlert';

import { getDatabase } from './src/services/database/databaseService';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main'>('Onboarding');

  const handleMigrationComplete = async () => {
    console.log('[App] Migration complete, checking onboarding...');
    setMigrating(false);
    await checkOnboarding();
  };

  const checkOnboarding = async () => {
    try {
      // Ensure database is initialized and migrations are run
      await getDatabase();
    } catch (error) {
      console.error('[App] Database initialization failed:', error);
    }

    const completed = await isOnboardingComplete();
    setInitialRoute(completed ? 'Main' : 'Onboarding');
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
      <SecurityProvider>
        <PrivacyProvider>
          <AlertProvider>
            <PrivacyGuard />
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <AppNavigator initialRoute={initialRoute} />
              <CustomAlert />
            </SafeAreaProvider>
          </AlertProvider>
        </PrivacyProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}
