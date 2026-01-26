import { registerRootComponent } from 'expo';
import './src/services/background/backgroundTasks'; // Register background tasks (notifications, etc)
import { setupNotificationListeners } from './src/services/background';

// Ensure notification listeners are set up immediately
setupNotificationListeners();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
