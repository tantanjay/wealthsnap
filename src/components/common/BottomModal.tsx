import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ViewStyle, DimensionValue, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { type, space, radius } from '@styles/theme';

interface BottomModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    maxHeight?: DimensionValue;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    dismissable?: boolean;
    closeOnLock?: boolean;
    headerRight?: React.ReactNode;
    footer?: React.ReactNode;
}

// Older sheet API, drawn with the Refined Minimal sheet recipe (docs/DESIGN.md, Bottom sheet) so it matches ds/Sheet.
const BottomModal: React.FC<BottomModalProps> = ({
    visible,
    onClose,
    title,
    subtitle,
    children,
    maxHeight = '70%',
    style,
    contentStyle,
    dismissable = true,
    closeOnLock = true,
    headerRight,
    footer
}) => {
    const { ds, elevation } = useTheme();
    const insets = useSafeAreaInsets();
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Safety check for SecurityContext
    let isLocked = false;
    try {
        const security = useSecurity();
        isLocked = security.isLocked;
    } catch {
        // Context might not be available if used outside SecurityProvider
        // verify generic usage safe
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'android' ? -insets.bottom : 0}
                style={[styles.overlay, { backgroundColor: ds.scrim }]}
            >
                {/* Backdrop - handles closing */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleClose}
                    style={styles.backdrop}
                />

                {/* Modal Content */}
                <View
                    style={[
                        styles.container,
                        elevation.sheet,
                        {
                            backgroundColor: ds.sheet,
                            maxHeight: keyboardVisible ? '95%' : maxHeight,
                            paddingBottom: footer ? 0 : Math.max(insets.bottom, space[5])
                        },
                        style
                    ]}
                >
                    <View style={[styles.grabber, { backgroundColor: ds.hairline }]} />

                    {/* Header */}
                    {(title || subtitle) && (
                        <View style={styles.header}>
                            <View style={styles.headerTextContainer}>
                                {title && (
                                    <Text style={[type.title, { color: ds.text }]}>
                                        {title}
                                    </Text>
                                )}
                                {subtitle && (
                                    <Text style={[type.small, styles.subtitle, { color: ds.text2 }]}>
                                        {subtitle}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {headerRight}
                                {dismissable && (
                                    <TouchableOpacity onPress={handleClose} hitSlop={space[2]} accessibilityLabel="Close">
                                        <Ionicons name="close" size={22} color={ds.text2} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Content Wrapper */}
                    <View style={[styles.content, contentStyle]}>
                        {children}
                    </View>

                    {/* Footer - distinct region for action buttons, never a continuation of the body */}
                    {footer && (
                        <View
                            style={[
                                styles.footer,
                                {
                                    backgroundColor: ds.inset,
                                    borderTopColor: ds.hairline,
                                    paddingBottom: Math.max(insets.bottom, space[6])
                                }
                            ]}
                        >
                            {footer}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    container: {
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        paddingTop: space[3],
        paddingHorizontal: space[5],
        width: '100%',
    },
    grabber: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: space[4],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: space[4],
    },
    headerTextContainer: {
        flex: 1,
        marginRight: space[3],
    },
    subtitle: {
        marginTop: 2,
    },
    content: {
        flexShrink: 1,
    },
    footer: {
        marginHorizontal: -space[5],
        marginTop: space[4],
        paddingHorizontal: space[5],
        paddingTop: space[3],
        borderTopWidth: 1,
    },
});

export default BottomModal;
