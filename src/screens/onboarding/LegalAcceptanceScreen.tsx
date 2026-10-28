import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, BackHandler, Dimensions } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TermsContent from '@components/onboarding/TermsContent';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, fontFamily } from '@styles/theme';
import { saveAcceptedTermsVersion } from '@services/core/storageService';
import { CONFIG } from '@constants/config';

const { height } = Dimensions.get('window');

const LegalAcceptanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
    const [hasAgreed, setHasAgreed] = useState(false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    // Block back button on Android
    useEffect(() => {
        const backAction = () => {
            // Screen is mandatory, exit app on back button
            BackHandler.exitApp();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    const handleAccept = async () => {
        await saveAcceptedTermsVersion(CONFIG.TERMS_VERSION);
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            })
        );
    };

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, space[5]) }]}>
                <View style={styles.heroHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: ds.accentSoft }]}>
                        <Ionicons name="document-text-outline" size={32} color={ds.accent} />
                    </View>
                    <Text style={[type.title, styles.center, { color: ds.text }]}>
                        Terms updated
                    </Text>
                    <Text style={[type.small, styles.center, { color: ds.text2 }]}>
                        We&apos;ve updated our Terms of Use and Privacy Policy. Please review and accept them to continue using WealthSnap.
                    </Text>
                </View>

                <View style={[styles.termsCard, { backgroundColor: ds.inset }]}>
                    <ScrollView
                        style={{ flex: 1 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        onScroll={(event) => {
                            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                            if (isCloseToBottom && !hasScrolledToBottom) {
                                setHasScrolledToBottom(true);
                            }
                        }}
                        scrollEventThrottle={16}
                    >
                        <TermsContent />
                    </ScrollView>
                </View>

                {!hasScrolledToBottom ? (
                    <View style={styles.scrollIndicator}>
                        <Ionicons name="arrow-down-circle-outline" size={18} color={ds.text2} />
                        <Text style={[type.smallMedium, { color: ds.text2 }]}>
                            Scroll to the bottom to continue
                        </Text>
                    </View>
                ) : (
                    <View style={styles.scrollIndicator}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={ds.success} />
                        <Text style={[type.smallMedium, { color: ds.success }]}>
                            You&apos;ve read the updates
                        </Text>
                    </View>
                )}

                <Pressable
                    style={[styles.checkboxRow, { opacity: hasScrolledToBottom ? 1 : 0.4 }]}
                    onPress={() => hasScrolledToBottom && setHasAgreed(!hasAgreed)}
                    disabled={!hasScrolledToBottom}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: hasAgreed, disabled: !hasScrolledToBottom }}
                >
                    <View style={[
                        styles.checkbox,
                        {
                            borderColor: hasAgreed ? ds.accent : ds.text3,
                            backgroundColor: hasAgreed ? ds.accent : 'transparent',
                        }
                    ]}>
                        {hasAgreed && <Ionicons name="checkmark" size={16} color={ds.onAccent} />}
                    </View>
                    <Text style={[type.small, styles.checkboxLabel, { color: ds.text }]}>
                        I have read and agree to the <Text style={{ fontFamily: fontFamily.medium, color: ds.accent }}>Terms of Use</Text> and <Text style={{ fontFamily: fontFamily.medium, color: ds.accent }}>Privacy Policy</Text>
                    </Text>
                </Pressable>

                <Pressable
                    onPress={handleAccept}
                    disabled={!hasAgreed}
                    style={[styles.button, { backgroundColor: hasAgreed ? ds.accent : ds.inset }]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !hasAgreed }}
                >
                    <Text style={[type.bodyStrong, { color: hasAgreed ? ds.onAccent : ds.text3 }]}>Accept & continue</Text>
                </Pressable>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: space[5],
        paddingTop: space[5],
    },
    heroHeader: {
        alignItems: 'center',
        gap: space[2],
        marginBottom: space[5],
        paddingTop: space[2],
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[1],
    },
    center: {
        textAlign: 'center',
    },
    termsCard: {
        flex: 1,
        maxHeight: height * 0.65,
        borderRadius: radius.md,
        marginBottom: space[3],
        overflow: 'hidden',
    },
    scrollIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
        marginBottom: space[3],
        paddingVertical: space[2],
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginBottom: space[4],
        paddingVertical: space[3],
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxLabel: {
        flex: 1,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default LegalAcceptanceScreen;
