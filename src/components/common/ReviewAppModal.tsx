import React, { FC } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { ScrollView } from 'react-native-gesture-handler';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface ReviewAppModalProps {
    isVisible: boolean;
    onRate: () => void;
    onLater: () => void;
    onDecline: () => void;
}

export const ReviewAppModal: FC<ReviewAppModalProps> = ({ isVisible, onRate, onLater, onDecline }) => {
    const { ds } = useTheme();

    return (
        <BottomModal
            visible={isVisible}
            onClose={onLater} // Default close behavior is "Later"
            title="Enjoying WealthSnap?"
            maxHeight="60%"
            footer={
                <>
                    <Pressable style={[styles.button, { backgroundColor: ds.accent }]} onPress={onRate} accessibilityRole="button">
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Rate WealthSnap</Text>
                    </Pressable>
                    <Pressable style={styles.textButton} onPress={onLater} accessibilityRole="button">
                        <Text style={[type.body, { color: ds.accent }]}>Remind me later</Text>
                    </Pressable>
                    <Pressable style={styles.textButton} onPress={onDecline} accessibilityRole="button">
                        <Text style={[type.small, { color: ds.text2 }]}>Do not show again</Text>
                    </Pressable>
                </>
            }
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Group padded>
                    <Text style={[type.body, { color: ds.text }]}>
                        If you enjoy using WealthSnap, would you mind taking a moment to rate it?
                        It won&apos;t take more than a minute. Thanks for your support!
                    </Text>
                    <Text style={[type.small, styles.thanks, { color: ds.text2 }]}>Thank you for using WealthSnap!</Text>
                </Group>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    thanks: {
        marginTop: space[3],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textButton: {
        height: 44,
        marginTop: space[1],
        alignItems: 'center',
        justifyContent: 'center',
    },
});
