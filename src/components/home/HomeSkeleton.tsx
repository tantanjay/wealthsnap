import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Skeleton } from '@components/common/Skeleton';
import { Group } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { space, radius, layout } from '@styles/theme';

// Placeholders in each Home view's shape while it first loads, so slow phones see the layout coming.

const TAB_WIDTHS = [64, 52, 64, 48, 48];

const SkeletonHero: React.FC<{ sparkline?: boolean }> = ({ sparkline }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.hero, { backgroundColor: ds.heroPanel }]}>
            <Skeleton width={90} height={14} />
            <Skeleton width={190} height={32} borderRadius={radius.sm} style={styles.heroValue} />
            <Skeleton width={120} height={14} />
            {sparkline && <Skeleton width="100%" height={56} borderRadius={radius.md} style={styles.sparkline} />}
            <View style={styles.stats}>
                {[0, 1].map(i => (
                    <View key={i} style={styles.stat}>
                        <Skeleton width={60} height={12} />
                        <Skeleton width={90} height={18} style={styles.statValue} />
                    </View>
                ))}
            </View>
        </View>
    );
};

// A section header plus a group of rows; `progress` adds the bar goal rows carry.
const SkeletonRows: React.FC<{ count: number; progress?: boolean; headerWidth?: number }> = ({ count, progress, headerWidth = 80 }) => {
    const { ds } = useTheme();
    return (
        <>
            <Skeleton width={headerWidth} height={14} style={styles.sectionHeader} />
            <Group>
                {Array.from({ length: count }, (_, i) => (
                    <View key={i} style={[styles.row, i < count - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ds.hairline }]}>
                        <Skeleton width={32} height={32} borderRadius={radius.full} />
                        <View style={styles.rowText}>
                            <Skeleton width="55%" height={14} />
                            <Skeleton width="35%" height={12} style={styles.rowSubtitle} />
                            {progress && <Skeleton width="100%" height={6} borderRadius={radius.full} style={styles.progress} />}
                        </View>
                        <Skeleton width={64} height={14} />
                    </View>
                ))}
            </Group>
        </>
    );
};

export const HomeSkeleton: React.FC = () => {
    const { ds } = useTheme();
    return (
        <View accessibilityLabel="Loading" accessibilityRole="progressbar">
            <View style={[styles.tabs, { borderBottomColor: ds.hairline }]}>
                {TAB_WIDTHS.map((w, i) => <Skeleton key={i} width={w} height={14} borderRadius={radius.sm} />)}
            </View>
            <View style={styles.page}>
                <SkeletonHero sparkline />
                <SkeletonRows count={4} />
            </View>
        </View>
    );
};

export const HoldingsSkeleton: React.FC = () => (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <SkeletonHero />
        <Skeleton width="100%" height={8} borderRadius={radius.full} style={styles.allocation} />
        <SkeletonRows count={4} />
    </View>
);

export const GoalsSkeleton: React.FC = () => (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <SkeletonHero />
        <SkeletonRows count={3} progress />
    </View>
);

export const LoansSkeleton: React.FC = () => (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <Skeleton width="100%" height={32} borderRadius={radius.md} style={styles.segment} />
        <SkeletonHero />
        <SkeletonRows count={3} />
    </View>
);

export const LedgerSkeleton: React.FC = () => (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
        <SkeletonRows count={3} headerWidth={110} />
        <SkeletonRows count={2} headerWidth={90} />
    </View>
);

const styles = StyleSheet.create({
    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: space[3],
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    page: {
        paddingHorizontal: layout.groupInset,
    },
    hero: {
        marginTop: space[3],
        borderRadius: radius.group,
        padding: space[4],
    },
    heroValue: {
        marginTop: space[2],
        marginBottom: space[2],
    },
    sparkline: {
        marginTop: space[4],
    },
    stats: {
        flexDirection: 'row',
        gap: space[4],
        marginTop: space[4],
    },
    stat: {
        flex: 1,
    },
    statValue: {
        marginTop: space[1],
    },
    allocation: {
        marginTop: space[4],
    },
    segment: {
        marginTop: space[3],
    },
    sectionHeader: {
        marginTop: space[6],
        marginBottom: space[2],
        marginLeft: layout.groupPadding,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        minHeight: 56,
        paddingVertical: space[3],
    },
    rowText: {
        flex: 1,
    },
    rowSubtitle: {
        marginTop: space[1],
    },
    progress: {
        marginTop: space[2],
    },
});
