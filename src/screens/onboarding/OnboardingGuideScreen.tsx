import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { SPACING } from '@styles/theme';

interface OnboardingGuideProps {
    onFinish: () => void;
    mode?: 'onboarding' | 'view'; // 'onboarding' blocks back button, 'view' allows exit
}

interface OrbitSatellite {
    icon: keyof typeof Ionicons.glyphMap;
    label?: string;
    color: string;
    x: number;
    y: number;
    dashed?: boolean;
}

interface OrbitConfig {
    hubIcon: keyof typeof Ionicons.glyphMap;
    hubColor: string;
    hubSize?: number;
    hubLabel?: string;
    satellites: OrbitSatellite[];
}

interface RecapItem {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    text: string;
}

// Design-time (base) dimensions — scaled at render time to fit the device width
const ORBIT_WIDTH = 260;
const ORBIT_HEIGHT = 230;
const HUB_X = 130;
const HUB_Y = 115;
const SATELLITE_SIZE = 58;
const ICON_CONTAINER_SIZE = 110;

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish, mode = 'onboarding' }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [currentSlide, setCurrentSlide] = useState(0);
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Scale the visuals to the available width so they don't overflow on small phones
    // or look tiny/oversized on larger ones.
    const availableWidth = screenWidth - (SPACING.lg + SPACING.md) * 2;
    const visualScale = Math.min(1.1, Math.max(0.65, availableWidth / ORBIT_WIDTH));

    // Compress vertical whitespace on short screens so the footer button never
    // requires scrolling to reach.
    const verticalScale = Math.min(1, Math.max(0.6, screenHeight / 750));

    const slides = [
        {
            id: 'security',
            title: 'Private by Design',
            description: 'Your financial data is encrypted and stored only on this device.\n\nNo cloud sync, no account required — nobody but you can ever see it.',
            color: '#4CAF50',
            isNotice: true,
            orbit: {
                hubIcon: 'shield-checkmark',
                hubColor: '#4CAF50',
                hubSize: 110,
                satellites: [
                    { icon: 'cloud-offline-outline', color: '#9E9E9E', x: 205, y: 45, dashed: true }
                ]
            } as OrbitConfig
        },
        {
            id: 'allinone',
            title: 'Your Whole Financial Life, One App',
            description: 'Spending, debts, investments, goals and budgets — tracked together, so nothing falls through the cracks.',
            color: '#1976D2',
            orbit: {
                hubIcon: 'speedometer-outline',
                hubColor: '#1976D2',
                hubSize: 88,
                hubLabel: 'Health score',
                satellites: [
                    { icon: 'trending-up-outline', label: 'Invest', color: '#00897B', x: 60, y: 40 },
                    { icon: 'card-outline', label: 'Debts', color: '#C2185B', x: 200, y: 40 },
                    { icon: 'flag-outline', label: 'Goals', color: '#FF8F00', x: 45, y: 150 },
                    { icon: 'wallet-outline', label: 'Budgets', color: '#7B1FA2', x: 215, y: 150 }
                ]
            } as OrbitConfig
        },
        {
            id: 'quickadd',
            title: 'Log It in Seconds',
            description: 'Snap a receipt, type it in, or set it to repeat automatically — the big "+" button is always one tap away.',
            color: '#1976D2',
            orbit: {
                hubIcon: 'add',
                hubColor: '#1976D2',
                hubSize: 96,
                satellites: [
                    { icon: 'camera-outline', label: 'Scan', color: '#EF6C00', x: 55, y: 55 },
                    { icon: 'calculator-outline', label: 'Type', color: '#00897B', x: 130, y: 30 },
                    { icon: 'repeat-outline', label: 'Repeat', color: '#7B1FA2', x: 205, y: 55 }
                ]
            } as OrbitConfig
        },
        {
            id: 'ready',
            icon: 'rocket-outline',
            title: "You're All Set",
            description: 'Take control of your wealth today.',
            color: colors.primary,
            isLast: true,
            recap: [
                { icon: 'shield-checkmark', color: '#4CAF50', text: 'Your data stays on your phone' },
                { icon: 'speedometer-outline', color: '#1976D2', text: 'Everything tracked in one place' },
                { icon: 'flash-outline', color: '#FF9800', text: 'Logging a transaction takes seconds' }
            ] as RecapItem[]
        }
    ];

    useEffect(() => {
        const backAction = () => {
            if (mode === 'onboarding') {
                return true; // Prevent going back
            }
            onFinish(); // Allow exit in view mode
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [mode, onFinish]);

    const slideTranslateX = useSharedValue(0);
    const SLIDE_DURATION = 220;

    // Slides the current content off-screen, swaps the index once it's clear,
    // then slides the new content in from the opposite edge.
    const goToSlide = (newIndex: number, direction: 1 | -1) => {
        slideTranslateX.value = withTiming(-direction * screenWidth, { duration: SLIDE_DURATION }, (finished) => {
            if (finished) {
                runOnJS(setCurrentSlide)(newIndex);
                slideTranslateX.value = direction * screenWidth;
                slideTranslateX.value = withTiming(0, { duration: SLIDE_DURATION });
            }
        });
    };

    const slideAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: slideTranslateX.value }],
    }));

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            goToSlide(currentSlide + 1, 1);
        } else {
            onFinish();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1, -1);
        }
    };

    // Swipe between slides. Requires real horizontal movement before activating
    // (and fails fast on vertical movement) so it doesn't steal taps from the
    // footer buttons. Doesn't fire on the last slide's forward swipe, so a
    // finish/exit only ever happens via the explicit button.
    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
            if (e.translationX < -50 && currentSlide < slides.length - 1) {
                runOnJS(handleNext)();
            } else if (e.translationX > 50 && currentSlide > 0) {
                runOnJS(handlePrev)();
            }
        });

    const renderOrbit = (orbit: OrbitConfig) => {
        const s = visualScale;
        const canvasWidth = ORBIT_WIDTH * s;
        const canvasHeight = ORBIT_HEIGHT * s;
        const hubX = HUB_X * s;
        const hubY = HUB_Y * s;
        const hubSize = (orbit.hubSize ?? 96) * s;
        const satelliteSize = SATELLITE_SIZE * s;
        const satelliteIconSize = Math.max(14, Math.round(20 * s));
        const hubLabelSize = Math.max(9, Math.round(11 * s));
        const satelliteLabelSize = Math.max(8, Math.round(9 * s));

        return (
            <View
                style={[
                    styles.orbitContainer,
                    { width: canvasWidth, height: canvasHeight, marginBottom: SPACING.md * verticalScale },
                ]}
            >
                <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill}>
                    {orbit.satellites.map((sat, index) => (
                        <Line
                            key={index}
                            x1={hubX}
                            y1={hubY}
                            x2={sat.x * s}
                            y2={sat.y * s}
                            stroke={colors.border}
                            strokeWidth={2}
                            strokeDasharray={sat.dashed ? '4,4' : undefined}
                        />
                    ))}
                </Svg>

                <View
                    style={[
                        styles.orbitHub,
                        {
                            width: hubSize,
                            height: hubSize,
                            borderRadius: hubSize / 2,
                            backgroundColor: orbit.hubColor + '20',
                            borderColor: orbit.hubColor,
                            left: hubX - hubSize / 2,
                            top: hubY - hubSize / 2,
                        },
                    ]}
                >
                    <Ionicons name={orbit.hubIcon} size={hubSize * 0.4} color={orbit.hubColor} />
                    {orbit.hubLabel && (
                        <Text style={[styles.orbitHubLabel, { color: orbit.hubColor, fontSize: hubLabelSize }]}>
                            {orbit.hubLabel}
                        </Text>
                    )}
                </View>

                {orbit.satellites.map((sat, index) => (
                    <View
                        key={index}
                        style={[
                            styles.orbitSatellite,
                            {
                                width: satelliteSize,
                                height: satelliteSize,
                                borderRadius: satelliteSize / 2,
                                backgroundColor: sat.color + '20',
                                left: sat.x * s - satelliteSize / 2,
                                top: sat.y * s - satelliteSize / 2,
                            },
                        ]}
                    >
                        <Ionicons name={sat.icon} size={satelliteIconSize} color={sat.color} />
                        {sat.label && (
                            <Text style={[styles.orbitSatelliteLabel, { color: sat.color, fontSize: satelliteLabelSize }]}>
                                {sat.label}
                            </Text>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderRecap = (items: RecapItem[]) => (
        <View style={styles.recapList}>
            {items.map((item, index) => (
                <View key={index} style={[styles.recapRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <View style={[styles.recapIconBadge, { backgroundColor: item.color + '20' }]}>
                        <Ionicons name={item.icon} size={14} color={item.color} />
                    </View>
                    <Text style={[styles.recapText, { color: colors.text }]}>{item.text}</Text>
                    <Ionicons name="checkmark" size={16} color="#4CAF50" />
                </View>
            ))}
        </View>
    );

    const renderSlide = (slide: typeof slides[0]) => {
        const iconContainerSize = ICON_CONTAINER_SIZE * visualScale;

        return (
            <View style={styles.slideContainer}>
                {slide.orbit ? (
                    renderOrbit(slide.orbit)
                ) : (
                    <View
                        style={[
                            styles.iconContainer,
                            {
                                width: iconContainerSize,
                                height: iconContainerSize,
                                borderRadius: iconContainerSize / 2,
                                backgroundColor: slide.color + '20',
                                marginBottom: SPACING.lg * verticalScale,
                            },
                        ]}
                    >
                        <Ionicons name={slide.icon as any} size={iconContainerSize * 0.4} color={slide.color} />
                    </View>
                )}

                <Text style={[styles.title, { color: colors.text, marginBottom: SPACING.md * verticalScale }]}>
                    {slide.title}
                </Text>

                {slide.isNotice && (
                    <View style={[styles.noticeBox, { marginBottom: SPACING.md * verticalScale }]}>
                        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                            IMPORTANT NOTICE
                        </Text>
                    </View>
                )}

                {slide.recap && renderRecap(slide.recap)}

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {slide.description}
                </Text>

                {/* Pagination Dots */}
                <View
                    style={[
                        styles.pagination,
                        { marginTop: SPACING.xxl * verticalScale, marginBottom: SPACING.xl * verticalScale },
                    ]}
                >
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: index === currentSlide ? colors.primary : colors.border,
                                    width: index === currentSlide ? 24 : 8
                                }
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'space-between',
            padding: SPACING.lg,
        },
        slideContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: SPACING.md,
        },
        iconContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SPACING.lg,
        },
        orbitContainer: {
            width: ORBIT_WIDTH,
            height: ORBIT_HEIGHT,
            marginBottom: SPACING.md,
        },
        orbitHub: {
            position: 'absolute',
            borderWidth: 3,
            alignItems: 'center',
            justifyContent: 'center',
        },
        orbitHubLabel: {
            fontSize: 11,
            fontWeight: 'bold',
            marginTop: 2,
        },
        orbitSatellite: {
            position: 'absolute',
            width: SATELLITE_SIZE,
            height: SATELLITE_SIZE,
            borderRadius: SATELLITE_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        orbitSatelliteLabel: {
            fontSize: 9,
            fontWeight: 'bold',
            marginTop: 1,
        },
        recapList: {
            width: '100%',
            marginBottom: SPACING.md,
        },
        recapRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 10,
            paddingVertical: SPACING.sm,
            paddingHorizontal: SPACING.sm,
            marginBottom: SPACING.xs,
        },
        recapIconBadge: {
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: SPACING.sm,
        },
        recapText: {
            flex: 1,
            fontSize: 13,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: SPACING.md,
        },
        description: {
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
        },
        noticeBox: {
            borderWidth: 1,
            borderColor: '#FFC107',
            backgroundColor: '#FFC10710',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 4,
            marginBottom: SPACING.md
        },
        noticeText: {
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: 1
        },
        pagination: {
            flexDirection: 'row',
            marginTop: SPACING.xxl,
            marginBottom: SPACING.xl,
        },
        dot: {
            height: 8,
            borderRadius: 4,
            marginHorizontal: 4,
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        skipButton: {
            padding: SPACING.md,
        },
        skipText: {
            color: colors.textSecondary,
            fontSize: 16,
        }
    });

    return (
        <View style={styles.container}>
            {/* Header / Skip */}
            <View style={{ alignItems: 'flex-end', paddingTop: SPACING.lg }}>
                {mode === 'view' && (
                    <TouchableOpacity onPress={onFinish} style={styles.skipButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content Used Key to force re-render animation if needed, but reliable update is enough */}
            <GestureDetector gesture={swipeGesture}>
                <Animated.View style={[{ flex: 1 }, slideAnimatedStyle]}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {renderSlide(slides[currentSlide])}
                    </ScrollView>
                </Animated.View>
            </GestureDetector>

            {/* Footer Controls */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
                <TouchableOpacity
                    onPress={handlePrev}
                    disabled={currentSlide === 0}
                    style={{ opacity: currentSlide === 0 ? 0 : 1, padding: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Button
                    title={currentSlide === slides.length - 1 ? (mode === 'onboarding' ? "Start App" : "Close") : "Next"}
                    onPress={handleNext}
                    style={{ width: 140 }}
                />
            </View>
        </View>
    );
};

export default OnboardingGuide;
