import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { StyledDonorName } from '@components/thankyou/StyledDonorName';
import { DONORS, NAME_STYLES } from '@constants/thankyou';
import { FlashList } from '@shopify/flash-list';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import BottomModal from '@components/common/BottomModal';
import { type, space, radius, layout } from '@styles/theme';

const stylesKeys = Object.keys(NAME_STYLES);

const getStyleForName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % stylesKeys.length;
    return NAME_STYLES[stylesKeys[index] as keyof typeof NAME_STYLES];
};

const { width, height } = Dimensions.get('window');

const FloatingName = ({ name, styleConfig }: { name: string, styleConfig: any }) => {
    // Start somewhere randomly on screen
    const [startX] = useState(() => Math.random() * width);
    const [startY] = useState(() => Math.random() * height);

    // Choose a random target to drift to
    const [targetX] = useState(() => Math.random() * width - 150);
    const [targetY] = useState(() => Math.random() * height - 50);

    const translateX = useSharedValue(startX);
    const translateY = useSharedValue(startY);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const durationX = 15000 + Math.random() * 10000;
        const durationY = 15000 + Math.random() * 10000;

        translateX.value = withRepeat(
            withSequence(
                withTiming(targetX, { duration: durationX, easing: Easing.inOut(Easing.sin) }),
                withTiming(startX, { duration: durationX, easing: Easing.inOut(Easing.sin) })
            ),
            -1, // infinite
            true // reverse
        );

        translateY.value = withRepeat(
            withSequence(
                withTiming(targetY, { duration: durationY, easing: Easing.inOut(Easing.sin) }),
                withTiming(startY, { duration: durationY, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
    }, [startX, startY, targetX, targetY, translateX, translateY]);

    useEffect(() => {
        // Fade out slightly then back in whenever the name changes
        opacity.value = 0;
        opacity.value = withTiming(0.35, { duration: 1000 });
    }, [name, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value }
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{ position: 'absolute' }, animatedStyle]} pointerEvents="none">
            <View style={{ transform: [{ scale: 0.6 }] }}>
                <StyledDonorName name={name} styleConfig={styleConfig} />
            </View>
        </Animated.View>
    );
};

const ThankYouScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
    const [showList, setShowList] = useState(false);

    const TARGET_DENSITY = 18; // Max names on screen at once

    const [activeDonors, setActiveDonors] = useState<string[]>(() => {
        const initial = [];
        for (let i = 0; i < TARGET_DENSITY; i++) {
            if (DONORS.length > 0) {
                initial.push(DONORS[i % DONORS.length]);
            }
        }
        return initial;
    });

    const donorIndex = useRef(DONORS.length > 0 ? TARGET_DENSITY % DONORS.length : 0);

    useEffect(() => {
        if (DONORS.length > TARGET_DENSITY) {
            // Rotate a single name every 2 seconds
            const interval = setInterval(() => {
                setActiveDonors(prev => {
                    const next = [...prev];
                    const slotToReplace = Math.floor(Math.random() * TARGET_DENSITY);
                    next[slotToReplace] = DONORS[donorIndex.current];
                    donorIndex.current = (donorIndex.current + 1) % DONORS.length;
                    return next;
                });
            }, 2000);
            return () => clearInterval(interval);
        }
    }, []);

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: ds.canvas,
                paddingTop: insets.top,
                paddingBottom: insets.bottom
            }
        ]}>
            {/* Header */}
            <Pressable
                style={styles.header}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Back"
            >
                <Ionicons name="chevron-back" size={24} color={ds.text2} />
                <Text style={[type.body, { color: ds.text }]}>Back</Text>
            </Pressable>

            {/* Floating Background */}
            <View style={[StyleSheet.absoluteFill, { zIndex: 0, overflow: 'hidden' }]} pointerEvents="none">
                {activeDonors.map((donor, index) => (
                    <FloatingName
                        key={index}
                        name={donor}
                        styleConfig={getStyleForName(donor)}
                    />
                ))}
            </View>

            {/* Center Content */}
            <View style={styles.centerContent} pointerEvents="box-none">
                <View style={[styles.bigIconContainer, { backgroundColor: ds.accentSoft }]}>
                    <Ionicons name="heart-outline" size={56} color={ds.accent} />
                </View>
                <Text style={[type.title, styles.center, { color: ds.text }]}>
                    Thank you!
                </Text>
                <Text style={[type.body, styles.center, styles.subtitle, { color: ds.text2 }]}>
                    Special thanks to the supporter whose generosity and encouragement are deeply appreciated.
                </Text>

                <Pressable
                    onPress={() => setShowList(true)}
                    style={[styles.button, { backgroundColor: ds.accent }]}
                    accessibilityRole="button"
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>View supporters</Text>
                </Pressable>
            </View>

            {/* Bottom Modal for List */}
            <BottomModal
                visible={showList}
                onClose={() => setShowList(false)}
                title="Our supporters"
                maxHeight="85%"
            >
                <View style={{ height: height * 0.6, width: '100%' }}>
                    <FlashList
                        data={DONORS}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.donorItem}>
                                <StyledDonorName name={item} styleConfig={getStyleForName(item)} />
                            </View>
                        )}
                        // @ts-ignore: estimatedItemSize is required for FlashList performance despite the TS error
                        estimatedItemSize={80}
                        contentContainerStyle={{ paddingVertical: space[5] }}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </BottomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: space[2],
        paddingHorizontal: space[4],
        paddingVertical: space[4],
        zIndex: 10,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: layout.groupInset,
        zIndex: 5,
    },
    center: {
        textAlign: 'center',
    },
    bigIconContainer: {
        width: 112,
        height: 112,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[6],
    },
    subtitle: {
        marginTop: space[3],
        marginBottom: space[7],
    },
    button: {
        width: '100%',
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: space[5],
    },
    donorItem: {
        marginBottom: space[2],
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ThankYouScreen;
