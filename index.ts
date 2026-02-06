import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import '@services/background/backgroundTasks'; // Register background tasks (notifications, etc)
import { setupNotificationListeners } from '@services/background';
import { initReminderCategories } from '@services/domain/reminderService';

// Ensure notification listeners are set up immediately
// We pass initReminderCategories to be called within setupNotificationListeners
setupNotificationListeners(initReminderCategories);

import App from '@app';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
