import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { isOnboardingComplete } from './src/services/storageService';
import { SecurityProvider } from './src/context/SecurityContext';
import { PrivacyProvider } from './src/context/PrivacyContext';
import { MigrationScreen } from './src/screens/MigrationScreen';
import * as ScreenCapture from 'expo-screen-capture';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main'>('Onboarding');
  const [isAppActive, setIsAppActive] = useState(true);

  useEffect(() => {
    // enhance privacy by preventing screen capture (Android: blank in switcher, iOS: no screenshots/recording)
    ScreenCapture.preventScreenCaptureAsync().catch(err => console.log('Screen capture prevention failed:', err));

    // Privacy Overlay Listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      setIsAppActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleMigrationComplete = async () => {
    console.log('[App] Migration complete, checking onboarding...');
    setMigrating(false);
    await checkOnboarding();
  };

  const checkOnboarding = async () => {
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
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <AppNavigator initialRoute={initialRoute} />
            {/* Privacy Overlay: Covers the screen when app is in background/switcher */}
            {!isAppActive && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', zIndex: 99999 }]} pointerEvents="none" />
            )}
          </SafeAreaProvider>
        </PrivacyProvider>
      </SecurityProvider>
    </ThemeProvider>
  );
}
