import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ViewStyle, DimensionValue, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';

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
}

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
    headerRight
}) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

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
                style={styles.overlay}
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
                        {
                            backgroundColor: colors.background,
                            maxHeight: maxHeight,
                            paddingBottom: Math.max(insets.bottom, 20)
                        },
                        style
                    ]}
                >
                    {/* Header */}
                    {(title || subtitle) && (
                        <View style={styles.header}>
                            <View style={styles.headerTextContainer}>
                                {title && (
                                    <Text style={[styles.title, { color: colors.text }]}>
                                        {title}
                                    </Text>
                                )}
                                {subtitle && (
                                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                        {subtitle}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {headerRight}
                                {dismissable && (
                                    <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Content Wrapper */}
                    <View style={[styles.content, contentStyle]}>
                        {children}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    content: {
        flexShrink: 1,
    }
});

export default BottomModal;
