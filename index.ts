import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import '@services/background/backgroundTasks'; // Register background tasks (notifications, etc)
import { setupNotificationListeners } from '@services/background';

// Ensure notification listeners are set up immediately
setupNotificationListeners();

import App from '@app';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
