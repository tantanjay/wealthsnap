import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { radius, layout } from '@styles/theme';

export interface GroupProps {
    children: React.ReactNode;
    // Adds the 14px side margin, for parents that don't already pad by `layout.groupInset`.
    inset?: boolean;
    // Vertical padding for non-row content (charts, form fields, text). Row lists leave it off.
    padded?: boolean;
    style?: StyleProp<ViewStyle>;
}

// The white grouped section surface on the canvas (docs/DESIGN.md, Group).
const Group: React.FC<GroupProps> = ({ children, inset, padded, style }) => {
    const { ds } = useTheme();

    return (
        <View
            style={[
                styles.group,
                { backgroundColor: ds.group },
                inset && styles.inset,
                padded && styles.padded,
                style,
            ]}
        >
            {/* Pulls the content down 1px so a last row's hairline is clipped even without `last`. */}
            {padded ? children : <View style={styles.clipLastHairline}>{children}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    group: {
        borderRadius: radius.group,
        paddingHorizontal: layout.groupPadding,
        overflow: 'hidden',
    },
    inset: {
        marginHorizontal: layout.groupInset,
    },
    padded: {
        paddingVertical: layout.groupPadding,
    },
    clipLastHairline: {
        marginBottom: -1,
    },
});

export default Group;
