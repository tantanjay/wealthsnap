import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { SEVERITY_ICON } from '@utils/severity';
import { type, space, radius, severityColor as toSeverityColor } from '@styles/theme';

const { width, height } = Dimensions.get('window');

export const CustomAlert: React.FC = () => {
    const { ds, elevation } = useTheme();
    const { alertState, hideAlert } = useAlert();
    const { visible, title, message, details, buttons, options, severity } = alertState;
    const severityColor = toSeverityColor(ds, severity);
    const severityIcon = SEVERITY_ICON[severity];

    // Safety check for SecurityContext
    let isLocked = false;
    try {
        const security = useSecurity();
        isLocked = security.isLocked;
    } catch {
        // Context might not be available if used outside SecurityProvider
    }

    // Auto-close alert when app is locked
    useEffect(() => {
        if (visible && isLocked) {
            // Find the safe action to trigger (cancel button or last button)
            const cancelButton = buttons?.find(btn => btn.style === 'cancel');
            const safeButton = cancelButton || buttons?.[buttons.length - 1];

            // Trigger the safe button's action if it exists
            if (safeButton?.onPress) {
                safeButton.onPress();
            }

            hideAlert();
        }
    }, [visible, isLocked, hideAlert, buttons]);

    if (!visible) return null;

    const handleBackgroundPress = () => {
        if (options?.cancelable) {
            hideAlert();
            options.onDismiss?.();
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleBackgroundPress}
        >
            <TouchableOpacity
                style={[styles.overlay, { backgroundColor: ds.scrim }]}
                activeOpacity={1}
                onPress={handleBackgroundPress}
            >
                <View
                    style={[
                        styles.alertContainer,
                        elevation.sheet,
                        { backgroundColor: ds.sheet, maxHeight: height * 0.6 }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.contentContainer}>
                        <Text style={[type.bodyStrong, styles.title, { color: ds.text }]}>{title}</Text>
                        <View style={styles.messageRow}>
                            <Ionicons name={severityIcon} size={20} color={severityColor} style={styles.severityIcon} />
                            {message ? (
                                <Text style={[type.small, styles.messageText, { color: ds.text2 }]}>
                                    {message}
                                </Text>
                            ) : null}
                        </View>
                        {details && (
                            <View style={[styles.detailsContainer, { backgroundColor: ds.inset }]}>
                                <ScrollView
                                    style={styles.detailsScroll}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    <Text style={[type.caption, { color: ds.text2 }]}>
                                        {details}
                                    </Text>
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={[styles.buttonContainer, { backgroundColor: ds.inset, borderTopColor: ds.hairline }]}>
                        {buttons?.map((button, index) => {
                            const isLast = index === (buttons.length || 0) - 1;
                            const isCancel = button.style === 'cancel';
                            const isDestructive = button.style === 'destructive';

                            // Default text color based on style
                            let textColor = ds.accent;
                            if (isCancel) textColor = ds.text2;
                            if (isDestructive) textColor = ds.danger;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        !isLast && styles.buttonBorder,
                                        !isLast && { borderRightColor: ds.hairline }
                                    ]}
                                    onPress={() => {
                                        // Execute callback then close
                                        if (button.onPress) {
                                            button.onPress();
                                        } else {
                                            hideAlert();
                                        }

                                        hideAlert();
                                    }}
                                >
                                    <Text style={[isCancel ? type.body : type.bodyStrong, { color: textColor }]}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: Math.min(width * 0.85, 340),
        borderRadius: radius.lg,
        overflow: 'hidden',
    },
    contentContainer: {
        padding: space[5],
        alignItems: 'center',
    },
    title: {
        textAlign: 'center',
        marginBottom: space[2],
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    severityIcon: {
        flexShrink: 0,
    },
    messageText: {
        flexShrink: 1,
        textAlign: 'left',
    },
    detailsContainer: {
        marginTop: space[3],
        borderRadius: radius.sm,
        width: '100%',
        maxHeight: 200,
    },
    detailsScroll: {
        padding: space[3],
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    button: {
        flex: 1,
        minHeight: 48,
        paddingVertical: space[3],
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonBorder: {
        borderRightWidth: StyleSheet.hairlineWidth,
    },
});
