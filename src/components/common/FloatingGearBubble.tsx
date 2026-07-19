import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { useFloatingGear } from '@context/FloatingGearContext';
import BottomModal from './BottomModal';

const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 8;
// Drop zone (top area) where dragging the bubble back re-docks the header buttons.
const DOCK_ZONE_HEIGHT = 140;
// How long the bubble stays blue after the menu closes before fading back to grey.
const COLOR_REVERT_DELAY_MS = 3000;

export default function FloatingGearBubble() {
    const { colors, mode } = useTheme();
    const insets = useSafeAreaInsets();
    const { isPrivacyEnabled, togglePrivacy, revealForScreenshot } = usePrivacy();
    const { showAlert } = useAlert();
    const { isDocked, pendingPosition, secondAction, requestDock } = useFloatingGear();

    const [menuVisible, setMenuVisible] = useState(false);
    const [isActiveColor, setIsActiveColor] = useState(false);
    const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    useEffect(() => {
        if (!isDocked && pendingPosition) {
            // Land where dropped, then settle to the nearest edge just like a
            // manual drag release does, instead of staying wherever it landed.
            const snapX = pendingPosition.x + BUBBLE_SIZE / 2 < screenWidth / 2
                ? EDGE_MARGIN
                : screenWidth - BUBBLE_SIZE - EDGE_MARGIN;
            const clampedY = Math.min(
                Math.max(pendingPosition.y, insets.top + EDGE_MARGIN),
                screenHeight - BUBBLE_SIZE - insets.bottom - EDGE_MARGIN
            );
            translateX.value = pendingPosition.x;
            translateY.value = clampedY;
            translateX.value = withSpring(snapX);
        }
    }, [isDocked, pendingPosition, screenWidth, screenHeight, insets.top, insets.bottom, translateX, translateY]);

    useEffect(() => {
        if (isDocked) {
            if (revertTimerRef.current) {
                clearTimeout(revertTimerRef.current);
                revertTimerRef.current = null;
            }
            setMenuVisible(false);
            setIsActiveColor(false);
        }
    }, [isDocked]);

    useEffect(() => {
        return () => {
            if (revertTimerRef.current) {
                clearTimeout(revertTimerRef.current);
            }
        };
    }, []);

    const openMenu = () => {
        if (revertTimerRef.current) {
            clearTimeout(revertTimerRef.current);
            revertTimerRef.current = null;
        }
        setIsActiveColor(true);
        setMenuVisible(true);
    };

    const closeMenu = () => {
        setMenuVisible(false);
        revertTimerRef.current = setTimeout(() => {
            setIsActiveColor(false);
        }, COLOR_REVERT_DELAY_MS);
    };

    // A plain Gesture.Pan() never reaches its "active" state (and so never
    // fires onEnd) for a quick tap with little movement, so taps need a
    // dedicated Tap gesture raced against the Pan gesture for drags.
    const tap = Gesture.Tap().onEnd(() => {
        runOnJS(openMenu)();
    });

    const pan = Gesture.Pan()
        .onStart(() => {
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((e) => {
            translateX.value = startX.value + e.translationX;
            translateY.value = startY.value + e.translationY;
        })
        .onEnd(() => {
            const inDockZone = translateY.value < DOCK_ZONE_HEIGHT && translateX.value > screenWidth * 0.5;
            if (inDockZone) {
                runOnJS(requestDock)();
                return;
            }

            const snapX = translateX.value + BUBBLE_SIZE / 2 < screenWidth / 2
                ? EDGE_MARGIN
                : screenWidth - BUBBLE_SIZE - EDGE_MARGIN;
            const clampedY = Math.min(
                Math.max(translateY.value, insets.top + EDGE_MARGIN),
                screenHeight - BUBBLE_SIZE - insets.bottom - EDGE_MARGIN
            );
            translateX.value = withSpring(snapX);
            translateY.value = withSpring(clampedY);
        });

    const composed = Gesture.Race(pan, tap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    if (isDocked) {
        return null;
    }

    const bubbleBg = isActiveColor ? colors.primary : colors.surface;
    const iconColor = isActiveColor ? '#FFFFFF' : colors.text;
    const ringColor = mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';

    const handleTogglePrivacy = () => {
        togglePrivacy();
        closeMenu();
    };

    const handleSecondAction = () => {
        secondAction?.onPress();
        closeMenu();
    };

    const handleRevealForScreenshot = () => {
        showAlert(
            'Allow Screenshot?',
            'This will briefly allow a screenshot with real numbers visible, then screenshot protection resumes automatically.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    onPress: () => {
                        revealForScreenshot();
                        closeMenu();
                    },
                },
            ]
        );
    };

    return (
        <>
            <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
                <GestureDetector gesture={composed}>
                    <Animated.View
                        style={[
                            styles.bubble,
                            { backgroundColor: bubbleBg, borderColor: ringColor },
                            animatedStyle,
                        ]}
                    >
                        <Ionicons name="settings-outline" size={24} color={iconColor} />
                    </Animated.View>
                </GestureDetector>
            </View>

            <BottomModal visible={menuVisible} onClose={closeMenu} title="Quick Actions">
                <TouchableOpacity
                    style={[styles.menuRow, { borderBottomColor: colors.border }]}
                    onPress={handleTogglePrivacy}
                >
                    <Ionicons name={isPrivacyEnabled ? 'eye-off' : 'eye'} size={20} color={colors.text} />
                    <Text style={[styles.menuLabel, { color: colors.text }]}>
                        {isPrivacyEnabled ? 'Show Balances' : 'Hide Balances'}
                    </Text>
                </TouchableOpacity>

                {secondAction && (
                    <TouchableOpacity
                        style={[styles.menuRow, { borderBottomColor: colors.border }]}
                        onPress={handleSecondAction}
                    >
                        <Ionicons name={secondAction.icon as any} size={20} color={colors.text} />
                        <Text style={[styles.menuLabel, { color: colors.text }]}>{secondAction.label}</Text>
                    </TouchableOpacity>
                )}

                {!isPrivacyEnabled && (
                    <TouchableOpacity style={styles.menuRow} onPress={handleRevealForScreenshot}>
                        <Ionicons name="camera-outline" size={20} color={colors.text} />
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Reveal for Screenshot</Text>
                    </TouchableOpacity>
                )}
            </BottomModal>
        </>
    );
}

const styles = StyleSheet.create({
    bubble: {
        position: 'absolute',
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_SIZE / 2,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 10,
        zIndex: 999,
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
});
