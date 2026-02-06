import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';


interface ReviewAppModalProps {
    // No props needed as it manages its own visibility via global hook logic calling it, 
    // but typically modals are controlled by a parent. 
    // However, the prompt might be triggered from a Layout or Home directly.
    // For now, let's assume it takes visibilty props or we use the hook inside usage context.
    // Based on plan: "Render <ReviewAppModal /> in HomeScreen", so it needs access to the hook's state.
    isVisible: boolean;
    onRate: () => void;
    onLater: () => void;
    onDecline: () => void;
}

export const ReviewAppModal: FC<ReviewAppModalProps> = ({ isVisible, onRate, onLater, onDecline }) => {
    return (
        <BottomModal
            visible={isVisible}
            onClose={onLater} // Default close behavior is "Later"
            title="Enjoying WealthSnap?"
            maxHeight="60%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="heart" size={48} color="#ff6b6b" />
                    </View>

                    <Text style={styles.description}>
                        If you enjoy using WealthSnap, would you mind taking a moment to rate it?
                        It won't take more than a minute. Thanks for your support!
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.rateButton]}
                            onPress={onRate}
                        >
                            <Text style={styles.rateButtonText}>Rate WealthSnap</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.laterButton]}
                            onPress={onLater}
                        >
                            <Text style={styles.laterButtonText}>Remind Me Later</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.declineButton]}
                            onPress={onDecline}
                        >
                            <Text style={styles.declineButtonText}>Do Not Show Again</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center' }}>Thank you for using WealthSnap!</Text>
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#fff0f0',
        borderRadius: 50,
    },
    description: {
        fontSize: 16,
        color: '#444',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rateButton: {
        backgroundColor: '#007AFF',
    },
    rateButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    laterButton: {
        backgroundColor: '#F2F2F7',
    },
    laterButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    declineButton: {
        backgroundColor: 'transparent',
        paddingVertical: 10,
    },
    declineButtonText: {
        color: '#8E8E93',
        fontSize: 14,
        fontWeight: '500',
    },
});
