import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useSecurity } from '../../context/SecurityContext';

const { width } = Dimensions.get('window');

export const CustomAlert: React.FC = () => {
    const { colors } = useTheme();
    const { alertState, hideAlert } = useAlert();
    const { visible, title, message, buttons, options } = alertState;

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
                <View style={[styles.alertContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.contentContainer}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        {message && (
                            <Text style={[styles.message, { color: colors.textSecondary }]}>
                                {message}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
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

                                        // If allow dismiss is not false (default behavior is to dismiss)
                                        // But we probably want to enforce closing unless the callback returned false?
                                        // For simplicity, let's just close it.
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
        width: Math.min(width * 0.8, 320),
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
    message: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
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
