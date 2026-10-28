import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { IconName } from '@components/ds';
import { type, space, radius } from '@styles/theme';

// Filled icon when active, its -outline variant otherwise.
const TAB_ICONS: Record<string, IconName> = {
    Home: 'home',
    Insights: 'stats-chart',
    Record: 'add',
    Profile: 'person',
    Learn: 'school',
};

const FAB_SIZE = 48;
const FAB_RAISE = 18;

// Refined Minimal bottom tab bar (docs/DESIGN.md, "Bottom tab bar"); Record is the raised center action.
const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
    const { ds, elevation } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.bar, { backgroundColor: ds.bg, borderTopColor: ds.hairline, paddingBottom: Math.max(insets.bottom, space[2]) }]}>
            {state.routes.map((route, index) => {
                const focused = state.index === index;
                const color = focused ? ds.accent : ds.text2;
                const icon = TAB_ICONS[route.name] ?? 'ellipse';
                const isRecord = route.name === 'Record';

                const onPress = () => {
                    // Emitted so screens can intercept a re-tap (Record reopens its menu).
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        accessibilityRole="button"
                        accessibilityState={focused ? { selected: true } : {}}
                        accessibilityLabel={route.name}
                        style={styles.item}
                    >
                        {isRecord ? (
                            <View style={[styles.fab, { backgroundColor: ds.accent }, elevation.fab]}>
                                <Ionicons name={icon} size={24} color={ds.onAccent} />
                            </View>
                        ) : (
                            <Ionicons name={focused ? icon : (`${icon}-outline` as IconName)} size={24} color={color} />
                        )}
                        <Text style={[type.captionMedium, { color }]} numberOfLines={1}>{route.name}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderTopWidth: 1,
        paddingTop: space[2],
    },
    item: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -FAB_RAISE,
    },
});

export default BottomTabBar;
