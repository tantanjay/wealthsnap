import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TermsContent from '../../components/onboarding/TermsContent';

const TermsAndPrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const styles = StyleSheet.create({
        content: {
            flex: 1,
            padding: 20,
        },
        heroHeader: {
            alignItems: 'center',
            marginBottom: 24,
            paddingTop: 10,
        },
        iconContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
        },
        gradientBg: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 40,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 8,
        },
        description: {
            fontSize: 16,
            textAlign: 'center',
            opacity: 0.8,
            marginBottom: 20,
        },
        footer: {
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
        },
        button: {
            height: 56,
            borderRadius: 16,
        }
    });

    return (
        <ScreenWrapper scrollable={false}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroHeader}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={[colors.primary, colors.primary + 'CC']}
                            style={styles.gradientBg}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Ionicons name="shield-checkmark" size={40} color="#FFF" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Terms & Privacy
                    </Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Legal information and privacy policy
                    </Text>
                </View>

                <TermsContent />
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Close"
                    onPress={() => navigation.goBack()}
                    style={styles.button}
                />
            </View>
        </ScreenWrapper>
    );
};

export default TermsAndPrivacyScreen;
