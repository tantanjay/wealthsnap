import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
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
import { PrivacyMode, usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { useFloatingGear } from '@context/FloatingGearContext';
import { Row, Sheet, IconName } from '@components/ds';
import MonthlySummaryModal from '@components/insights/modals/MonthlySummaryModal';

const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 8;
// Drop zone (top area) where dragging the bubble back re-docks the header buttons.
const DOCK_ZONE_HEIGHT = 140;
// How long the bubble stays blue after the menu closes before fading back to grey.
const COLOR_REVERT_DELAY_MS = 3000;

const PRIVACY_LABEL: Record<PrivacyMode, string> = { open: 'Open', discreet: 'Discreet', hidden: 'Hidden' };
// The gear's privacy row steps through the modes in this order (Home settings picks one directly).
const NEXT_PRIVACY_MODE: Record<PrivacyMode, PrivacyMode> = { open: 'discreet', discreet: 'hidden', hidden: 'open' };

export default function FloatingGearBubble() {
    const { colors, mode } = useTheme();
    const insets = useSafeAreaInsets();
    const { mode: privacyMode, setMode: setPrivacyMode, revealForScreenshot } = usePrivacy();
    const { showAlert } = useAlert();
    const { isDocked, pendingPosition, secondAction, requestDock, updatePosition } = useFloatingGear();

    const [menuVisible, setMenuVisible] = useState(false);
    const [summaryModalVisible, setSummaryModalVisible] = useState(false);
    const [isActiveColor, setIsActiveColor] = useState(false);
    const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    useEffect(() => {
        if (isDocked) return;

        if (pendingPosition) {
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
        } else {
            // Restored floating from a previous app session - there's no drop
            // point to remember, so land in a sensible default spot instead of
            // the origin corner.
            translateX.value = screenWidth - BUBBLE_SIZE - EDGE_MARGIN;
            translateY.value = Math.min(
                insets.top + EDGE_MARGIN + 120,
                screenHeight - BUBBLE_SIZE - insets.bottom - EDGE_MARGIN
            );
        }
    }, [isDocked, pendingPosition, screenWidth, screenHeight, insets.top, insets.bottom, translateX, translateY]);

    useEffect(() => {
        if (isDocked) {
            if (revertTimerRef.current) {
                clearTimeout(revertTimerRef.current);
                revertTimerRef.current = null;
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets menu UI state when the bubble docks; see FIXES.md
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

    /* eslint-disable react-hooks/refs, react-hooks/immutability --
       Gesture worklets: reading/writing a Reanimated shared value's `.value`
       (and touching a ref via a runOnJS-called handler) is the standard,
       required way to drive these gestures - there's no alternative API.
       The analyzer can't tell a worklet callback from render code. See
       FIXES.md's "OK to bypass" section. */

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
            // Remember where the bubble actually settled so a later rotation (which re-runs
            // the landing effect below) recomputes from here, not the original detach point.
            runOnJS(updatePosition)(snapX, clampedY);
        });
    /* eslint-enable react-hooks/refs, react-hooks/immutability */

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

    // Stays open so the row can be tapped again to keep cycling.
    const handleCyclePrivacy = () => setPrivacyMode(NEXT_PRIVACY_MODE[privacyMode]);

    const handleSecondAction = () => {
        secondAction?.onPress();
        closeMenu();
    };

    const handleOpenMonthlySummary = () => {
        closeMenu();
        setSummaryModalVisible(true);
    };

    // Closes the sheet first: nothing opens on top of a sheet.
    const handleRevealForScreenshot = () => {
        closeMenu();
        showAlert(
            'Allow Screenshot?',
            'This will briefly allow a screenshot with real numbers visible, then screenshot protection resumes automatically.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    onPress: revealForScreenshot,
                },
            ]
        );
    };

    return (
        <>
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
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

            <Sheet visible={menuVisible} onClose={closeMenu} title="Quick actions">
                <Row
                    icon={privacyMode === 'open' ? 'eye-outline' : 'eye-off-outline'}
                    title="Privacy"
                    subtitle={`Tap for ${PRIVACY_LABEL[NEXT_PRIVACY_MODE[privacyMode]]}`}
                    value={PRIVACY_LABEL[privacyMode]}
                    onPress={handleCyclePrivacy}
                />
                {secondAction && (
                    <Row icon={secondAction.icon as IconName} title={secondAction.label} onPress={handleSecondAction} />
                )}
                <Row
                    icon="document-text-outline"
                    title="Monthly summary"
                    onPress={handleOpenMonthlySummary}
                    last={privacyMode !== 'open'}
                />
                {privacyMode === 'open' && (
                    <Row icon="camera-outline" title="Reveal for screenshot" onPress={handleRevealForScreenshot} last />
                )}
            </Sheet>

            <MonthlySummaryModal visible={summaryModalVisible} onClose={() => setSummaryModalVisible(false)} />
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
});
