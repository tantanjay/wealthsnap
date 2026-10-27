import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { Domain, domainColor } from '@components/ds';
import { SnapshotRowId } from '@services/core/storageService';

const ROW_HEIGHT = 56;

export const SNAPSHOT_ROW_META: Record<SnapshotRowId, { label: string; domain: Domain }> = {
    cash: { label: 'Cash', domain: 'cash' },
    investments: { label: 'Investments', domain: 'invest' },
    loans: { label: 'Loans', domain: 'loans' },
    goals: { label: 'Goals', domain: 'goals' },
};

interface DragRowProps {
    id: SnapshotRowId;
    index: number;
    count: number;
    onDrop: (from: number, to: number) => void;
}

const DragRow: React.FC<DragRowProps> = ({ id, index, count, onDrop }) => {
    const { ds, elevation } = useTheme();
    const offset = useSharedValue(0);
    const [dragging, setDragging] = useState(false);
    const meta = SNAPSHOT_ROW_META[id];

    const pan = Gesture.Pan()
        .onStart(() => {
            runOnJS(setDragging)(true);
        })
        .onUpdate(e => {
            // Keep the row within the list.
            offset.value = Math.max(-index * ROW_HEIGHT, Math.min((count - 1 - index) * ROW_HEIGHT, e.translationY));
        })
        .onEnd(() => {
            const to = Math.max(0, Math.min(count - 1, index + Math.round(offset.value / ROW_HEIGHT)));
            offset.value = 0;
            runOnJS(onDrop)(index, to);
        })
        .onFinalize(() => {
            runOnJS(setDragging)(false);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: offset.value }],
    }));

    return (
        <Animated.View
            style={[
                styles.row,
                { borderBottomColor: ds.hairline, borderBottomWidth: index === count - 1 ? 0 : 1 },
                dragging && [styles.lifted, elevation.sheet, { backgroundColor: ds.sheet }],
                animatedStyle,
            ]}
        >
            <GestureDetector gesture={pan}>
                <View hitSlop={space[2]} accessibilityLabel={`Drag to move ${meta.label}`}>
                    <Ionicons name="reorder-two-outline" size={20} color={ds.text2} />
                </View>
            </GestureDetector>
            <View style={[styles.dot, { backgroundColor: domainColor(ds, meta.domain) }]} />
            <Text style={[type.body, styles.label, { color: ds.text }]}>{meta.label}</Text>
        </Animated.View>
    );
};

interface SnapshotOrderListProps {
    order: SnapshotRowId[];
    onChange: (order: SnapshotRowId[]) => void;
}

// Drag the handle to reorder the Snapshot Overview rows.
const SnapshotOrderList: React.FC<SnapshotOrderListProps> = ({ order, onChange }) => {
    const handleDrop = (from: number, to: number) => {
        if (from === to) return;
        const next = [...order];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange(next);
    };

    // Sheet renders in its own Modal, which needs its own gesture root on Android.
    return (
        <GestureHandlerRootView>
            {order.map((id, index) => (
                <DragRow key={id} id={id} index={index} count={order.length} onDrop={handleDrop} />
            ))}
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    row: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    lifted: {
        zIndex: 1,
        borderRadius: radius.md,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    label: {
        flex: 1,
    },
});

export default SnapshotOrderList;
