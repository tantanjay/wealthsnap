import { createNavigationContainerRef } from '@react-navigation/native';

// Module-level ref so components rendered outside NavigationContainer
// can still trigger navigation.
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
