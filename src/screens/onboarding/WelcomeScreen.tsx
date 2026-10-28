import React from 'react';
import { Text, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'shield-checkmark-outline', text: 'Private by design' },
    { icon: 'speedometer-outline', text: 'Your whole financial life, one app' },
    { icon: 'flash-outline', text: 'Log a transaction in seconds' },
];

const WelcomeScreen = ({ navigation }: any) => {
    const { ds, theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();

    // Compress spacing/icon sizes on short screens so "Get started" never
    // crowds the bottom system bar and content never overflows.
    const scale = Math.min(1, Math.max(0.65, screenHeight / 750));
    const heroSize = 96 * scale;

    return (
        <View style={[styles.container, { backgroundColor: ds.bg }]}>
            <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
            <View style={[styles.content, { paddingTop: insets.top + space[6] * scale }]}>
                <View
                    style={[
                        styles.hero,
                        {
                            backgroundColor: ds.accentSoft,
                            width: heroSize,
                            height: heroSize,
                            marginBottom: space[4] * scale,
                        },
                    ]}
                >
                    <Ionicons name="wallet-outline" size={44 * scale} color={ds.accent} />
                </View>

                <Text style={[type.display, styles.center, { color: ds.text, marginBottom: space[2] * scale }]}>
                    WealthSnap
                </Text>

                <Text style={[type.body, styles.center, { color: ds.text2, marginBottom: space[7] * scale }]}>
                    Master your finances with smart insights and secure tracking.
                </Text>

                <View style={styles.features}>
                    {FEATURES.map((f, i) => (
                        <View
                            key={f.text}
                            style={[
                                styles.featureRow,
                                {
                                    borderBottomColor: ds.hairline,
                                    borderBottomWidth: i === FEATURES.length - 1 ? 0 : 1,
                                    paddingVertical: space[3] * scale,
                                },
                            ]}
                        >
                            <Ionicons name={f.icon} size={20} color={ds.text2} />
                            <Text style={[type.body, styles.featureText, { color: ds.text }]}>{f.text}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] * scale }]}>
                <Pressable
                    onPress={() => navigation.navigate('Setup')}
                    style={[styles.button, { backgroundColor: ds.accent }]}
                    accessibilityRole="button"
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Get started</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: space[5],
    },
    hero: {
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        textAlign: 'center',
    },
    features: {
        width: '100%',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    featureText: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: space[5],
        paddingTop: space[4],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default WelcomeScreen;
