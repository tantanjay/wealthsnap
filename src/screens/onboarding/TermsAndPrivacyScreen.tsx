import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TermsContent from '@components/onboarding/TermsContent';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

const TermsAndPrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: ds.accentSoft }]}>
                        <Ionicons name="shield-checkmark-outline" size={36} color={ds.accent} />
                    </View>
                    <Text style={[type.title, styles.center, { color: ds.text }]}>
                        Terms & Privacy
                    </Text>
                    <Text style={[type.small, styles.center, { color: ds.text2 }]}>
                        Legal information and privacy policy
                    </Text>
                </View>

                <TermsContent />
            </ScrollView>

            <View
                style={[
                    styles.footer,
                    {
                        paddingBottom: Math.max(insets.bottom, space[5]),
                        borderTopColor: ds.hairline,
                        backgroundColor: ds.inset,
                    },
                ]}
            >
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={[styles.button, { backgroundColor: ds.accent }]}
                    accessibilityRole="button"
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Close</Text>
                </Pressable>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingVertical: space[5],
    },
    heroHeader: {
        alignItems: 'center',
        gap: space[2],
        paddingHorizontal: space[5],
        paddingTop: space[2],
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[2],
    },
    center: {
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: space[5],
        paddingTop: space[4],
        borderTopWidth: 1,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TermsAndPrivacyScreen;
