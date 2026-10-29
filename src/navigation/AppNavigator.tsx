import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { navigationRef } from '@navigation/navigationRef';
import BottomTabBar from '@navigation/BottomTabBar';

import WelcomeScreen from '@screens/onboarding/WelcomeScreen';
import SetupScreen from '@screens/onboarding/SetupScreen';
import TermsAndPrivacyScreen from '@screens/onboarding/TermsAndPrivacyScreen';
import LegalAcceptanceScreen from '@screens/onboarding/LegalAcceptanceScreen';
import ProfileScreen from '@screens/ProfileScreen';
import InsightScreen from '@screens/InsightScreen';
import HomeScreen from '@screens/HomeScreen';
import RecordScreen from '@screens/RecordScreen';
import LearnScreen from '@screens/LearnScreen';
import AutoBackupScreen from '@screens/AutoBackupScreen';
import ImportExportScreen from '@screens/ImportExportScreen';
import ThankYouScreen from '@screens/ThankYouScreen';
import ChatScreen from '@screens/ChatScreen';
import LiveSyncScreen from '@screens/LiveSyncScreen';
import { useTheme } from '@context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
    <Tab.Navigator tabBar={props => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Insights" component={InsightScreen} />
        <Tab.Screen name="Record" component={RecordScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="Learn" component={LearnScreen} />
    </Tab.Navigator>
);

const AppNavigator = ({ initialRoute }: { initialRoute: 'Onboarding' | 'Main' | 'LegalAcceptance' }) => {
    const { ds, theme } = useTheme();
    const navigationTheme = {
        ...DefaultTheme,
        dark: theme.mode === 'dark',
        colors: {
            ...DefaultTheme.colors,
            background: ds.canvas,
            card: ds.canvas,
            text: ds.text,
            border: ds.hairline,
            primary: ds.accent,
            notification: ds.danger,
        },
    };

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                <Stack.Screen name="Onboarding" component={WelcomeScreen} />
                <Stack.Screen name="Setup" component={SetupScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="TermsAndPrivacy" component={TermsAndPrivacyScreen} />
                <Stack.Screen name="LegalAcceptance" component={LegalAcceptanceScreen} />
                <Stack.Screen name="ThankYou" component={ThankYouScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="LiveSync" component={LiveSyncScreen} />
                <Stack.Screen name="AutoBackup" component={AutoBackupScreen} />
                <Stack.Screen name="ImportExport" component={ImportExportScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
export default AppNavigator;
