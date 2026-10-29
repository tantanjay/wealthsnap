import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

import { Group, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, fontFamily } from '@styles/theme';

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
    hubSize?: number;
    hubLabel?: string;
    satellites: OrbitSatellite[];
}

interface RecapItem {
    icon: keyof typeof Ionicons.glyphMap;
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
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
    const [currentSlide, setCurrentSlide] = useState(0);
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Scale the visuals to the available width so they don't overflow on small phones
    // or look tiny/oversized on larger ones.
    const availableWidth = screenWidth - (space[5] + space[4]) * 2;
    const visualScale = Math.min(1.1, Math.max(0.65, availableWidth / ORBIT_WIDTH));

    // Compress vertical whitespace on short screens so the footer button never
    // requires scrolling to reach.
    const verticalScale = Math.min(1, Math.max(0.6, screenHeight / 750));

    const slides = [
        {
            id: 'security',
            title: 'Private by design',
            description: 'Your financial data is encrypted and stored only on this device.\n\nNo cloud sync, no account required — nobody but you can ever see it.',
            isNotice: true,
            orbit: {
                hubIcon: 'shield-checkmark-outline',
                hubSize: 110,
                satellites: [
                    { icon: 'cloud-offline-outline', color: ds.text3, x: 205, y: 45, dashed: true }
                ]
            } as OrbitConfig
        },
        {
            id: 'allinone',
            title: 'Your whole financial life, one app',
            description: 'Spending, debts, investments, goals and budgets — tracked together, so nothing falls through the cracks.',
            orbit: {
                hubIcon: 'speedometer-outline',
                hubSize: 88,
                hubLabel: 'Health score',
                satellites: [
                    { icon: 'trending-up-outline', label: 'Invest', color: ds.domainInvest, x: 60, y: 40 },
                    { icon: 'card-outline', label: 'Debts', color: ds.domainLoans, x: 200, y: 40 },
                    { icon: 'flag-outline', label: 'Goals', color: ds.domainGoals, x: 45, y: 150 },
                    { icon: 'wallet-outline', label: 'Budgets', color: ds.domainCash, x: 215, y: 150 }
                ]
            } as OrbitConfig
        },
        {
            id: 'quickadd',
            title: 'Log it in seconds',
            description: 'Snap a receipt, type it in, or set it to repeat automatically — the big "+" button is always one tap away.',
            orbit: {
                hubIcon: 'add',
                hubSize: 96,
                satellites: [
                    { icon: 'camera-outline', label: 'Scan', color: ds.text2, x: 55, y: 55 },
                    { icon: 'calculator-outline', label: 'Type', color: ds.text2, x: 130, y: 30 },
                    { icon: 'repeat-outline', label: 'Repeat', color: ds.text2, x: 205, y: 55 }
                ]
            } as OrbitConfig
        },
        {
            id: 'ready',
            icon: 'rocket-outline',
            title: "You're all set",
            description: 'Take control of your wealth today.',
            isLast: true,
            recap: [
                { icon: 'shield-checkmark-outline', text: 'Your data stays on your phone' },
                { icon: 'speedometer-outline', text: 'Everything tracked in one place' },
                { icon: 'flash-outline', text: 'Logging a transaction takes seconds' }
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
                    { width: canvasWidth, height: canvasHeight, marginBottom: space[4] * verticalScale },
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
                            stroke={ds.hairline}
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
                            backgroundColor: ds.accentSoft,
                            borderColor: ds.accent,
                            left: hubX - hubSize / 2,
                            top: hubY - hubSize / 2,
                        },
                    ]}
                >
                    <Ionicons name={orbit.hubIcon} size={hubSize * 0.4} color={ds.accent} />
                    {orbit.hubLabel && (
                        <Text style={[styles.orbitHubLabel, { color: ds.accent, fontSize: hubLabelSize }]}>
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
                                backgroundColor: ds.group,
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
        <Group style={styles.recapList}>
            {items.map((item, index) => (
                <Row
                    key={index}
                    icon={item.icon}
                    title={item.text}
                    trailing={<Ionicons name="checkmark" size={16} color={ds.success} />}
                    last={index === items.length - 1}
                />
            ))}
        </Group>
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
                                backgroundColor: ds.accentSoft,
                                marginBottom: space[6] * verticalScale,
                            },
                        ]}
                    >
                        <Ionicons name={slide.icon as any} size={iconContainerSize * 0.4} color={ds.accent} />
                    </View>
                )}

                <Text style={[type.title, styles.center, { color: ds.text, marginBottom: space[4] * verticalScale }]}>
                    {slide.title}
                </Text>

                {slide.isNotice && (
                    <View style={[styles.noticeBox, { backgroundColor: ds.group, marginBottom: space[4] * verticalScale }]}>
                        <Ionicons name="alert-circle-outline" size={14} color={ds.warning} />
                        <Text style={[type.captionMedium, { color: ds.warning }]}>
                            Important notice
                        </Text>
                    </View>
                )}

                {slide.recap && renderRecap(slide.recap)}

                <Text style={[type.body, styles.center, { color: ds.text2 }]}>
                    {slide.description}
                </Text>

                {/* Pagination Dots */}
                <View
                    style={[
                        styles.pagination,
                        { marginTop: space[7] * 1.5 * verticalScale, marginBottom: space[7] * verticalScale },
                    ]}
                >
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: index === currentSlide ? ds.accent : ds.hairline,
                                    width: index === currentSlide ? 24 : 8
                                }
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    const isLastSlide = currentSlide === slides.length - 1;

    return (
        <View style={[styles.container, { backgroundColor: ds.canvas }]}>
            {/* Header / Skip */}
            <View style={styles.header}>
                {mode === 'view' && (
                    <Pressable onPress={onFinish} style={styles.iconButton} hitSlop={space[2]} accessibilityLabel="Close guide">
                        <Ionicons name="close" size={24} color={ds.text2} />
                    </Pressable>
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
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[6]) }]}>
                <Pressable
                    onPress={handlePrev}
                    disabled={currentSlide === 0}
                    style={[styles.iconButton, { opacity: currentSlide === 0 ? 0 : 1 }]}
                    accessibilityLabel="Previous slide"
                >
                    <Ionicons name="arrow-back" size={24} color={ds.text2} />
                </Pressable>

                <Pressable
                    onPress={handleNext}
                    style={[styles.button, { backgroundColor: ds.accent }]}
                    accessibilityRole="button"
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>
                        {isLastSlide ? (mode === 'onboarding' ? 'Start app' : 'Close') : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        padding: space[5],
    },
    header: {
        alignItems: 'flex-end',
        paddingTop: space[6],
    },
    slideContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space[4],
    },
    center: {
        textAlign: 'center',
    },
    iconContainer: {
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitContainer: {
        width: ORBIT_WIDTH,
        height: ORBIT_HEIGHT,
    },
    orbitHub: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitHubLabel: {
        fontFamily: fontFamily.semibold,
        marginTop: 2,
    },
    orbitSatellite: {
        position: 'absolute',
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitSatelliteLabel: {
        fontFamily: fontFamily.semibold,
        marginTop: 1,
    },
    recapList: {
        width: '100%',
        marginBottom: space[4],
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        paddingHorizontal: space[2],
        paddingVertical: space[1],
        borderRadius: radius.sm,
    },
    pagination: {
        flexDirection: 'row',
        gap: space[2],
    },
    dot: {
        height: 8,
        borderRadius: radius.full,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        padding: space[3],
    },
    button: {
        width: 140,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default OnboardingGuide;
