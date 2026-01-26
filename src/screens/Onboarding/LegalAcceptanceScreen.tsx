import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TermsContent from '../../components/onboarding/TermsContent';
import { Button } from '../../components';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { saveAcceptedTermsVersion } from '../../services/core/storageService';
import { CONFIG } from '../../constants/config';

const { height } = Dimensions.get('window');

const LegalAcceptanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { colors } = useTheme();
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

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: 20,
        },
        heroHeader: {
            alignItems: 'center',
            marginBottom: 20,
            paddingTop: 10,
        },
        iconContainer: {
            width: 70,
            height: 70,
            borderRadius: 35,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
        },
        gradientBg: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 35,
        },
        title: {
            fontSize: 22,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 8,
        },
        description: {
            fontSize: 15,
            textAlign: 'center',
            opacity: 0.8,
            lineHeight: 22,
        },
        termsCard: {
            flex: 1,
            maxHeight: height * 0.65,
            borderWidth: 1,
            borderRadius: 16,
            marginBottom: 16,
            padding: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        termsInnerScroll: {
            padding: 16,
        },
        scrollIndicator: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            alignSelf: 'center',
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            padding: 12,
        },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            marginRight: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkboxLabel: {
            flex: 1,
            fontSize: 14,
            lineHeight: 20,
        },
        button: {
            height: 56,
            borderRadius: 16,
        }
    });

    return (
        <ScreenWrapper scrollable={false} noPadding>
            <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.heroHeader}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={[colors.primary, colors.primary + 'CC']}
                            style={styles.gradientBg}
                        />
                        <Ionicons name="document-text" size={36} color="#FFF" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Terms Updated
                    </Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        We&apos;ve updated our Terms of Use and Privacy Policy. Please review and accept them to continue using WealthSnap.
                    </Text>
                </View>

                <View style={[styles.termsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.termsInnerScroll}
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
                    <View style={[styles.scrollIndicator, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="arrow-down-circle" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 13, marginLeft: 8, fontWeight: '500' }}>
                            Scroll to the bottom to continue
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.scrollIndicator, { backgroundColor: colors.success + '15' }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success || '#4CAF50'} />
                        <Text style={{ color: colors.success || '#4CAF50', fontSize: 13, marginLeft: 8, fontWeight: '500' }}>
                            You&apos;ve read the updates
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.checkboxRow,
                        {
                            opacity: hasScrolledToBottom ? 1 : 0.4,
                            backgroundColor: hasAgreed ? colors.primary + '10' : 'transparent',
                            borderRadius: 12,
                        }
                    ]}
                    onPress={() => hasScrolledToBottom && setHasAgreed(!hasAgreed)}
                    disabled={!hasScrolledToBottom}
                >
                    <View style={[
                        styles.checkbox,
                        {
                            borderColor: hasScrolledToBottom ? (hasAgreed ? colors.primary : colors.gray500) : colors.gray500,
                            backgroundColor: hasAgreed ? colors.primary : 'transparent'
                        }
                    ]}>
                        {hasAgreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: hasScrolledToBottom ? colors.text : colors.gray500 }]}>
                        I have read and agree to the <Text style={{ fontWeight: 'bold', color: colors.primary }}>Terms of Use</Text> and <Text style={{ fontWeight: 'bold', color: colors.primary }}>Privacy Policy</Text>
                    </Text>
                </TouchableOpacity>

                <Button
                    title="Accept & Continue"
                    onPress={handleAccept}
                    disabled={!hasAgreed}
                    style={styles.button}
                />
            </View>
        </ScreenWrapper>
    );
};

export default LegalAcceptanceScreen;
