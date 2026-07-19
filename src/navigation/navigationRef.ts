import { createNavigationContainerRef } from '@react-navigation/native';

// Module-level ref so components rendered outside NavigationContainer
// (e.g. FloatingGearBubble, which lives above the SafeAreaProvider in App.tsx)
// can still trigger navigation.
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
