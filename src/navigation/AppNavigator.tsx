import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import WelcomeScreen from '@screens/onboarding/WelcomeScreen';
import SetupScreen from '@screens/onboarding/SetupScreen';
import TermsAndPrivacyScreen from '@screens/onboarding/TermsAndPrivacyScreen';
import LegalAcceptanceScreen from '@screens/onboarding/LegalAcceptanceScreen';
import ProfileScreen from '@screens/ProfileScreen';
import InsightsScreen from '@screens/InsightsScreen';
import FinancialHealthScreen from '@screens/FinancialHealthScreen';
import HomeScreen from '@screens/HomeScreen';
import InvestmentScreen from '@screens/InvestmentScreen';
import HistoryScreen from '@screens/HistoryScreen';
import RecordScreen from '@screens/RecordScreen';
import { useTheme } from '@context/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();

const HomeStackNavigator = () => {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeMain" component={HomeScreen} />
            <HomeStack.Screen name="FinancialHealth" component={FinancialHealthScreen} />
            <HomeStack.Screen name="Insights" component={InsightsScreen} />
        </HomeStack.Navigator>
    );
};

const MainTabs = () => {
    const { colors } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Investment') iconName = focused ? 'trending-up' : 'trending-up-outline';
                    else if (route.name === 'Record') iconName = focused ? 'add-circle' : 'add-circle-outline';
                    else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeStackNavigator} />
            <Tab.Screen name="Investment" component={InvestmentScreen} />
            <Tab.Screen name="Record" component={RecordScreen} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

const AppNavigator = ({ initialRoute }: { initialRoute: 'Onboarding' | 'Main' | 'LegalAcceptance' }) => {
    const { colors } = useTheme();
    const navigationTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            primary: colors.primary,
        },
    };

    return (
        <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                <Stack.Screen name="Onboarding" component={WelcomeScreen} />
                <Stack.Screen name="Setup" component={SetupScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="TermsAndPrivacy" component={TermsAndPrivacyScreen} />
                <Stack.Screen name="LegalAcceptance" component={LegalAcceptanceScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
export default AppNavigator;
