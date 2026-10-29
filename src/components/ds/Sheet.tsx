import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, DimensionValue, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { type, space, radius, layout } from '@styles/theme';

export interface SheetProps {
    visible: boolean;
    onClose: () => void;
    // Either a title (+ optional subtitle) or a custom header such as a Hero.
    title?: string;
    subtitle?: string;
    header?: React.ReactNode;
    children: React.ReactNode;
    // Footer region (`group` band, hairline top), normally the one primary button.
    footer?: React.ReactNode;
    maxHeight?: DimensionValue;
    dismissable?: boolean;
    closeOnLock?: boolean;
    // Turn off when the body brings its own virtualized list.
    scroll?: boolean;
}

// Lets a drag handle inside the sheet hold off its scrolling (SnapshotOrderList).
export interface SheetScrollControl {
    scrollRef: React.RefObject<ScrollView | null>;
    setScrollLocked: (locked: boolean) => void;
}

export const SheetScrollContext = createContext<SheetScrollControl | null>(null);

// Canvas-toned bottom sheet; its content sits in Groups. Lock/keyboard handling mirrors common/BottomModal.
// Never open another modal on top of a Sheet; use a collapsible section instead.
const Sheet: React.FC<SheetProps> = ({
    visible,
    onClose,
    title,
    subtitle,
    header,
    children,
    footer,
    maxHeight = '88%',
    dismissable = true,
    closeOnLock = true,
    scroll = true,
}) => {
    const { ds, elevation } = useTheme();
    const insets = useSafeAreaInsets();
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [scrollLocked, setScrollLocked] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const scrollControl = useMemo(() => ({ scrollRef, setScrollLocked }), []);

    let isLocked = false;
    try {
        const security = useSecurity();
        isLocked = security.isLocked;
    } catch {
        // Used outside SecurityProvider
    }

    useEffect(() => {
        if (visible && closeOnLock && isLocked) {
            onClose();
        }
    }, [visible, closeOnLock, isLocked, onClose]);

    // maxHeight is measured against the space above the keyboard, so relax it while typing
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleClose = () => {
        if (dismissable) {
            onClose();
        }
    };

    const bodyPadding = { paddingBottom: footer ? space[4] : Math.max(insets.bottom, space[4]) };
    const body = (
        <>
            {header}
            {!header && title ? (
                <View style={styles.titleRow}>
                    <Text style={[type.title, styles.title, { color: ds.text }]}>{title}</Text>
                    {dismissable ? (
                        <Pressable onPress={handleClose} hitSlop={space[2]} accessibilityLabel="Close">
                            <Ionicons name="close" size={22} color={ds.text2} />
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
            {!header && subtitle ? <Text style={[type.small, styles.subtitle, { color: ds.text2 }]}>{subtitle}</Text> : null}
            {children}
        </>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            {/* A Modal renders outside the app's gesture root on Android, so it needs its own. */}
            <GestureHandlerRootView style={styles.root}>
            <SheetScrollContext.Provider value={scrollControl}>
            <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'android' ? -insets.bottom : 0}
                style={[styles.overlay, { backgroundColor: ds.scrim }]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Close" />

                <View
                    style={[
                        styles.sheet,
                        elevation.sheet,
                        { backgroundColor: ds.canvas, maxHeight: keyboardVisible ? '95%' : maxHeight },
                    ]}
                >
                    <View style={[styles.grabber, { backgroundColor: ds.hairline }]} />

                    {scroll ? (
                        <ScrollView
                            ref={scrollRef}
                            scrollEnabled={!scrollLocked}
                            style={styles.bodyScroll}
                            contentContainerStyle={[styles.body, bodyPadding]}
                            keyboardShouldPersistTaps="handled"
                        >
                            {body}
                        </ScrollView>
                    ) : (
                        <View style={[styles.bodyScroll, styles.body, bodyPadding]}>{body}</View>
                    )}

                    {footer ? (
                        <View
                            style={[
                                styles.footer,
                                {
                                    backgroundColor: ds.group,
                                    borderTopColor: ds.hairline,
                                    paddingBottom: Math.max(insets.bottom, space[6]),
                                },
                            ]}
                        >
                            {footer}
                        </View>
                    ) : null}
                </View>
            </KeyboardAvoidingView>
            </SheetScrollContext.Provider>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        width: '100%',
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        paddingTop: space[3],
    },
    grabber: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: space[4],
    },
    bodyScroll: {
        flexShrink: 1,
    },
    body: {
        paddingHorizontal: layout.groupInset,
    },
    // Title and subtitle line up with group content, like a grouped SectionHeader.
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.groupPadding,
    },
    title: {
        flex: 1,
        marginRight: space[3],
    },
    subtitle: {
        marginTop: 2,
        marginBottom: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    footer: {
        paddingTop: space[3],
        paddingHorizontal: layout.groupInset,
        borderTopWidth: 1,
    },
});

export default Sheet;
