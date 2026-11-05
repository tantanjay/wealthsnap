import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { navigationRef } from '@navigation/navigationRef';
import { SEVERITY_ICON } from '@utils/severity';
import { type, space, radius, layout, severityColor } from '@styles/theme';
import { BackgroundTask, getBackgroundTasks, hideBackgroundTask, subscribeBackgroundTasks } from '@services/core/backgroundTaskService';

const useBackgroundTasks = () => {
    const [tasks, setTasks] = useState<BackgroundTask[]>(getBackgroundTasks);
    useEffect(() => subscribeBackgroundTasks(setTasks), []);
    return tasks;
};

// Running task or its result; tapping hides a running task until it finishes. Renders nothing when idle.
export const BackgroundTaskBanner: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
    const { ds, elevation } = useTheme();
    const visible = useBackgroundTasks().filter(t => !(t.status === 'running' && t.hidden));
    // A result is the freshest news, so it wins over a still-running task.
    const task = visible.find(t => t.status === 'done') ?? visible[0];
    if (!task) return null;
    const others = visible.length - 1;

    return (
        <Pressable
            onPress={() => task.status === 'running' && hideBackgroundTask(task.id)}
            style={[styles.card, elevation.sheet, styles.shadow, { backgroundColor: ds.group }, style]}
            accessibilityRole="button"
            accessibilityLiveRegion="polite"
            accessibilityHint={task.status === 'running' ? 'Hides this until the task finishes' : undefined}
        >
            {task.status === 'running' ? (
                <>
                    <ActivityIndicator size="small" color={ds.text2} />
                    <View style={styles.text}>
                        <Text style={[type.smallStrong, { color: ds.text }]} numberOfLines={1}>{task.label}</Text>
                        {!!task.detail && <Text style={[type.small, { color: ds.text2 }]} numberOfLines={1}>{task.detail}</Text>}
                    </View>
                </>
            ) : (
                <>
                    <Ionicons name={SEVERITY_ICON[task.tone]} size={18} color={severityColor(ds, task.tone)} />
                    <Text style={[type.small, styles.text, { color: ds.text }]} numberOfLines={2}>{task.message}</Text>
                </>
            )}
            {others > 0 && <Text style={[type.captionMedium, { color: ds.text2 }]}>+{others} more</Text>}
        </Pressable>
    );
};

// Tab screens get the banner docked in the tab bar; this floats it for screens stacked outside the tabs.
export const RootBackgroundTaskBanner: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [inTabs, setInTabs] = useState(false);

    useEffect(() => {
        const update = () => {
            const root = navigationRef.isReady() ? navigationRef.getRootState() : undefined;
            setInTabs(root?.routes[root.index]?.name === 'Main');
        };
        update();
        return navigationRef.addListener('state', update);
    }, []);

    if (inTabs) return null;
    return (
        <View pointerEvents="box-none" style={[styles.floating, { bottom: insets.bottom + space[2] }]}>
            <BackgroundTaskBanner />
        </View>
    );
};

const styles = StyleSheet.create({
    floating: {
        position: 'absolute',
        left: layout.groupInset,
        right: layout.groupInset,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        borderRadius: radius.md,
        paddingVertical: space[3],
        paddingHorizontal: space[4],
    },
    // The sheet shadow casts upward; a banner resting on content needs it below.
    shadow: {
        shadowOffset: { width: 0, height: 4 },
    },
    text: {
        flex: 1,
    },
});
