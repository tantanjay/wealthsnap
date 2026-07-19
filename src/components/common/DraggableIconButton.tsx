import React, { useRef } from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';

import { useFloatingGear } from '@context/FloatingGearContext';

interface DraggableIconButtonProps {
    children: React.ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

// How far the button must move before it pops loose into the floating gear.
const DETACH_THRESHOLD = 48;

/**
 * Icon button that can be long-pressed and dragged out of its row. Doing so
 * hides both header buttons and hands off to the global floating gear bubble.
 */
export default function DraggableIconButton({ children, onPress, style }: DraggableIconButtonProps) {
    const { requestUndock } = useFloatingGear();
    const viewRef = useRef<View>(null);

    const homeWindowX = useSharedValue(0);
    const homeWindowY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const measureHome = () => {
        viewRef.current?.measureInWindow((x, y) => {
            homeWindowX.value = x;
            homeWindowY.value = y;
        });
    };

    // A plain Gesture.Pan() never reaches its "active" state (and so never
    // fires onEnd) for a quick tap with little movement, so taps need a
    // dedicated Tap gesture raced against the Pan gesture for drags.
    const tap = Gesture.Tap().onEnd(() => {
        runOnJS(onPress)();
    });

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = e.translationX;
            translateY.value = e.translationY;
        })
        .onEnd((e) => {
            const distance = Math.hypot(e.translationX, e.translationY);

            if (distance > DETACH_THRESHOLD) {
                const dropX = homeWindowX.value + e.translationX;
                const dropY = homeWindowY.value + e.translationY;
                translateX.value = 0;
                translateY.value = 0;
                runOnJS(requestUndock)(dropX, dropY);
            } else {
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        });

    const composed = Gesture.Race(pan, tap);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View ref={viewRef} onLayout={measureHome} style={[style, animatedStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
}
