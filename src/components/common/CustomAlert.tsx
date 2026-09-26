import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { SEVERITY_ICON, getSeverityColor } from '@utils/severity';

const { width, height } = Dimensions.get('window');

export const CustomAlert: React.FC = () => {
    const { colors } = useTheme();
    const { alertState, hideAlert } = useAlert();
    const { visible, title, message, details, buttons, options, severity } = alertState;
    const severityColor = getSeverityColor(colors, severity);
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
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleBackgroundPress}
            >
                <View
                    style={[
                        styles.alertContainer,
                        { backgroundColor: colors.surface, maxHeight: height * 0.6 }
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.contentContainer}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <View style={styles.messageRow}>
                            <Ionicons name={severityIcon} size={24} color={severityColor} style={styles.severityIcon} />
                            {message ? (
                                <Text style={[styles.message, styles.messageText, { color: colors.textSecondary }]}>
                                    {message}
                                </Text>
                            ) : null}
                        </View>
                        {details && (
                            <View style={[styles.detailsContainer, { borderColor: colors.border }]}>
                                <ScrollView
                                    style={styles.detailsScroll}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                                        {details}
                                    </Text>
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={[styles.buttonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        {buttons?.map((button, index) => {
                            const isLast = index === (buttons.length || 0) - 1;
                            const isCancel = button.style === 'cancel';
                            const isDestructive = button.style === 'destructive';

                            // Default text color based on style
                            let textColor = colors.primary;
                            if (isCancel) textColor = colors.textSecondary;
                            if (isDestructive) textColor = colors.error;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        !isLast && styles.buttonBorder,
                                        !isLast && { borderRightColor: colors.border }
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
                                    <Text style={[styles.buttonText, { color: textColor, fontWeight: isCancel ? '400' : '600' }]}>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: Math.min(width * 0.85, 340),
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    severityIcon: {
        flexShrink: 0,
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
    },
    messageText: {
        flexShrink: 1,
        textAlign: 'left',
    },
    detailsContainer: {
        marginTop: 12,
        borderWidth: 1,
        borderRadius: 8,
        width: '100%',
        maxHeight: 200,
    },
    detailsScroll: {
        padding: 10,
    },
    detailsText: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: 'monospace',
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 0.5,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonBorder: {
        borderRightWidth: 0.5,
    },
    buttonText: {
        fontSize: 17,
    },
});

