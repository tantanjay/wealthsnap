import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { DOMAIN_ICONS, Domain, domainColor, domainSoftColor } from '@components/ds';
import { SheetScrollContext } from '@components/ds/Sheet';
import { SnapshotRowId } from '@services/core/storageService';

const ROW_HEIGHT = 56;

export interface OrderItemMeta {
    label: string;
    domain?: Domain;
}

export const SNAPSHOT_ROW_META: Record<SnapshotRowId, OrderItemMeta> = {
    cash: { label: 'Cash', domain: 'cash' },
    investments: { label: 'Investments', domain: 'invest' },
    loans: { label: 'Loans', domain: 'loans' },
    goals: { label: 'Goals', domain: 'goals' },
};

interface DragRowProps {
    meta: OrderItemMeta;
    index: number;
    count: number;
    onDrop: (from: number, to: number) => void;
}

const DragRow: React.FC<DragRowProps> = ({ meta, index, count, onDrop }) => {
    const { ds, elevation } = useTheme();
    const offset = useSharedValue(0);
    // A shared value, not state: re-rendering mid-drag would rebuild the gesture and cancel it.
    const lifted = useSharedValue(false);
    const sheet = useContext(SheetScrollContext);
    const lockScroll = (locked: boolean) => sheet?.setScrollLocked(locked);
    const shadow = elevation.sheet;
    const liftedShadowOpacity = shadow.shadowOpacity ?? 0;
    const liftedElevation = shadow.elevation ?? 0;

    // The sheet's ScrollView would otherwise claim the vertical touch and cancel the drag:
    // it waits for this gesture, and scrolling is switched off while the handle is held.
    let pan = Gesture.Pan()
        .activeOffsetY([-3, 3])
        .shouldCancelWhenOutside(false)
        .onTouchesDown(() => {
            runOnJS(lockScroll)(true);
        })
        .onStart(() => {
            lifted.value = true;
        })
        .onUpdate(e => {
            // Keep the row within the list.
            offset.value = Math.max(-index * ROW_HEIGHT, Math.min((count - 1 - index) * ROW_HEIGHT, e.translationY));
        })
        .onEnd((_e, success) => {
            if (!success) {
                offset.value = withSpring(0);
                return;
            }
            const to = Math.max(0, Math.min(count - 1, index + Math.round(offset.value / ROW_HEIGHT)));
            offset.value = 0;
            runOnJS(onDrop)(index, to);
        })
        .onFinalize(() => {
            lifted.value = false;
            runOnJS(lockScroll)(false);
        });
    if (sheet) pan = pan.blocksExternalGesture(sheet.scrollRef);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: offset.value }],
        // Every key is set in both states: Reanimated keeps the last value of a key that stops being returned.
        backgroundColor: lifted.value ? ds.raised : 'transparent',
        borderRadius: lifted.value ? radius.md : 0,
        zIndex: lifted.value ? 1 : 0,
        shadowOpacity: lifted.value ? liftedShadowOpacity : 0,
        elevation: lifted.value ? liftedElevation : 0,
    }));

    return (
        <Animated.View
            style={[
                styles.row,
                { borderBottomColor: ds.hairline, borderBottomWidth: index === count - 1 ? 0 : 1 },
                { shadowColor: shadow.shadowColor, shadowOffset: shadow.shadowOffset, shadowRadius: shadow.shadowRadius },
                animatedStyle,
            ]}
        >
            <GestureDetector gesture={pan}>
                <View style={styles.handle} accessibilityLabel={`Drag to move ${meta.label}`}>
                    <Ionicons name="reorder-two-outline" size={22} color={ds.text2} />
                </View>
            </GestureDetector>
            {meta.domain && (
                <View style={[styles.tile, { backgroundColor: domainSoftColor(ds, meta.domain) }]}>
                    <Ionicons name={DOMAIN_ICONS[meta.domain]} size={18} color={domainColor(ds, meta.domain)} />
                </View>
            )}
            <Text style={[type.body, styles.label, { color: ds.text }]}>{meta.label}</Text>
        </Animated.View>
    );
};

interface SnapshotOrderListProps<K extends string> {
    order: K[];
    meta: Record<K, OrderItemMeta>;
    onChange: (order: K[]) => void;
}

// Drag the handle to reorder rows: Home's Snapshot Overview rows, Insights' sections.
function SnapshotOrderList<K extends string>({ order, meta, onChange }: SnapshotOrderListProps<K>) {
    const handleDrop = (from: number, to: number) => {
        if (from === to) return;
        const next = [...order];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onChange(next);
    };

    // Used inside a Sheet, which provides the gesture root.
    return (
        <>
            {order.map((id, index) => (
                <DragRow key={id} meta={meta[id]} index={index} count={order.length} onDrop={handleDrop} />
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    row: {
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
    },
    // A thumb-sized grab area around the icon.
    handle: {
        width: 44,
        height: ROW_HEIGHT,
        marginHorizontal: -space[2],
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Same 32px domain tile as Row.
    tile: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },

    label: {
        flex: 1,
    },
});

export default SnapshotOrderList;
