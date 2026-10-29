import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type, space, layout } from '@styles/theme';
import DropdownMenu, { DropdownAnchor, DropdownOption } from './DropdownMenu';

export interface SectionHeaderMenu {
    options: DropdownOption<string>[];
    value: string;
    onSelect: (key: string) => void;
}

export interface SectionHeaderProps {
    title: string;
    // Optional text action on the right ("See all").
    actionLabel?: string;
    onAction?: () => void;
    // A view picker instead: the action shows the current option + "⌄" and opens a dropdown under it.
    menu?: SectionHeaderMenu;
    // Sits on the canvas above a Group: text lines up with the group's inner content.
    grouped?: boolean;
    style?: StyleProp<ViewStyle>;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction, menu, grouped, style }) => {
    const { ds } = useTheme();
    const triggerRef = useRef<View>(null);
    const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);

    const openMenu = () => {
        triggerRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
    };

    const label = menu ? `${menu.options.find(o => o.key === menu.value)?.label ?? ''} ⌄` : actionLabel;

    return (
        <View style={[styles.container, grouped && styles.grouped, style]}>
            <Text style={[type.smallStrong, { color: ds.text }]}>{title}</Text>
            {label ? (
                <Pressable ref={triggerRef} onPress={menu ? openMenu : onAction} disabled={!menu && !onAction} hitSlop={space[2]}>
                    <Text style={[type.smallMedium, { color: ds.accent }]}>{label}</Text>
                </Pressable>
            ) : null}
            {menu && (
                <DropdownMenu
                    anchor={anchor}
                    options={menu.options}
                    value={menu.value}
                    onSelect={menu.onSelect}
                    onClose={() => setAnchor(null)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: space[6],
        marginBottom: space[1],
    },
    grouped: {
        paddingHorizontal: layout.groupPadding,
        marginBottom: space[2],
    },
});

export default SectionHeader;
