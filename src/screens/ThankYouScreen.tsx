import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { Button } from '@components/index';
import { Ionicons } from '@expo/vector-icons';
import { StyledDonorName } from '@components/thankyou/StyledDonorName';
import { DONORS, NAME_STYLES } from '@constants/thankyou';
import BottomModal from '@components/common/BottomModal';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

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
    const targetX = Math.random() * width - 150;
    const targetY = Math.random() * height - 50;

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
    }, [startX, startY, targetX, targetY]);

    useEffect(() => {
        // Fade out slightly then back in whenever the name changes
        opacity.value = 0;
        opacity.value = withTiming(0.35, { duration: 1000 });
    }, [name]);

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
    const { colors } = useTheme();
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
                backgroundColor: colors.background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom
            }
        ]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, zIndex: 10 }]}>
                <Ionicons
                    name="chevron-back"
                    size={24}
                    color={colors.text}
                    onPress={() => navigation.goBack()}
                />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Back</Text>
            </View>

            {/* Floating Background */}
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 0, overflow: 'hidden' }]} pointerEvents="none">
                {activeDonors.map((donor, index) => (
                    <FloatingName key={index} name={donor} styleConfig={getStyleForName(donor)} />
                ))}
            </View>

            {/* Center Content */}
            <View style={styles.centerContent} pointerEvents="box-none">
                <View style={[styles.bigIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="heart" size={80} color={colors.primary} />
                </View>
                <Text style={[styles.bigTitle, { color: colors.text }]}>
                    Thank You!
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    WealthSnap is a gift to the community, sustained by these legendary individuals.
                </Text>

                <View style={styles.buttonWrapper}>
                    <Button
                        title="View Supporters"
                        onPress={() => setShowList(true)}
                        style={styles.button}
                    />
                </View>
            </View>

            {/* Bottom Modal for List */}
            <BottomModal
                visible={showList}
                onClose={() => setShowList(false)}
                title="Legendary Supporters"
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
                        contentContainerStyle={{ paddingVertical: 20 }}
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        zIndex: 5,
    },
    bigIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    bigTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        lineHeight: 26,
        textAlign: 'center',
        marginBottom: 40,
    },
    buttonWrapper: {
        width: '100%',
        marginTop: 20,
    },
    button: {
        width: '100%',
    },
    donorItem: {
        marginBottom: 10,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default ThankYouScreen;
