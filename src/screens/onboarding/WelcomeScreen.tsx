import React from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';

const FeatureItem = ({ icon, text, color, scale }: { icon: string; text: string; color: string; scale: number }) => (
    <View style={[styles.featureItem, { padding: 16 * scale, borderRadius: 16 * scale }]}>
        <View
            style={[
                styles.iconContainer,
                {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    width: 40 * scale,
                    height: 40 * scale,
                    borderRadius: 20 * scale,
                    marginRight: 16 * scale,
                },
            ]}
        >
            <MaterialCommunityIcons name={icon as any} size={22 * scale} color={color} />
        </View>
        <Text style={[styles.featureText, { fontSize: Math.max(14, 18 * scale) }]}>{text}</Text>
    </View>
);

const WelcomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();

    // Compress spacing/icon sizes on short screens so "Get Started" never
    // crowds the bottom system bar and content never overflows.
    const scale = Math.min(1, Math.max(0.65, screenHeight / 750));

    return (
        <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={[styles.content, { paddingTop: insets.top + 24 * scale }]}>
                <View
                    style={[
                        styles.heroIconContainer,
                        {
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            width: 96 * scale,
                            height: 96 * scale,
                            borderRadius: 48 * scale,
                            marginBottom: 16 * scale,
                        },
                    ]}
                >
                    <MaterialCommunityIcons name="wallet-outline" size={44 * scale} color={colors.white} />
                </View>

                <Text style={[styles.title, { fontSize: Math.max(24, 30 * scale), marginBottom: 6 * scale }]}>
                    WealthSnap
                </Text>

                <Text style={[styles.subtitle, { marginBottom: 28 * scale }]}>
                    Master your finances with smart insights and secure tracking.
                </Text>

                <View style={[styles.featuresContainer, { gap: 12 * scale }]}>
                    <FeatureItem icon="shield-check" text="Private by design" color={colors.white} scale={scale} />
                    <FeatureItem icon="speedometer" text="Your whole financial life, one app" color={colors.white} scale={scale} />
                    <FeatureItem icon="lightning-bolt" text="Log a transaction in seconds" color={colors.white} scale={scale} />
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 * scale }]}>
                <Button
                    title="Get Started"
                    onPress={() => navigation.navigate('Setup')}
                    variant="outline"
                    style={{ backgroundColor: colors.white, borderWidth: 0, width: '100%' }}
                />
            </View>
        </LinearGradient>
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
        paddingHorizontal: 30,
        paddingTop: 60,
    },
    heroIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 26,
    },
    featuresContainer: {
        width: '100%',
        gap: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        borderRadius: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
    }
});

export default WelcomeScreen;
