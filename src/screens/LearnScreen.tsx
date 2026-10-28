import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, Pressable, Linking, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import appJson from '@app.json';
import BottomModal from '@components/common/BottomModal';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Row, SectionHeader, IconName } from '@components/ds';
import SupportModal from '@components/profile/settings/SupportModal';
import ContactDeveloperModal from '@components/profile/settings/ContactDeveloperModal';
import { Button } from '@components/index';
import HelpCenterScreen from '@screens/onboarding/HelpCenterScreen';
import { useTheme } from '@context/ThemeContext';
import { useReviewPrompt } from '@hooks/useReviewPrompt';
import { HELP_TOPICS } from '@constants/helpContent';
import { ASYNC_KEYS } from '@constants/config';
import { type, space, radius } from '@styles/theme';

// Topics with their own Help center / About row stay off the Guides shelf.
const ROW_TOPICS = ['math', 'faq', 'changelog'];
const GUIDES = HELP_TOPICS.filter(t => !ROW_TOPICS.includes(t.id));

// Guides, help center and about content (moved out of Profile).
const LearnScreen = ({ navigation }: any) => {
    const { colors, ds } = useTheme();
    const { handleRate } = useReviewPrompt();

    // Kept after closing so the modal doesn't swap content during its close animation.
    const [helpTopic, setHelpTopic] = useState<string>('faq');
    const [showHelp, setShowHelp] = useState(false);
    const openHelp = (topicId: string) => {
        setHelpTopic(topicId);
        setShowHelp(true);
    };
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showWhyFreeModal, setShowWhyFreeModal] = useState(false);
    const [showDevMessageModal, setShowDevMessageModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showManifestoModal, setShowManifestoModal] = useState(false);

    const [isDevMode, setIsDevMode] = useState(false);
    const [devTapCount, setDevTapCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem(ASYNC_KEYS.DEVELOPER_MODE)
                .then(enabled => setIsDevMode(enabled === 'true'))
                .catch(error => console.error('Failed to check dev mode', error));
        }, [])
    );

    // Tapping the "About WealthSnap" header 7 times turns on developer options (shown in Profile).
    const handleDevTap = async () => {
        if (isDevMode) return;

        const newCount = devTapCount + 1;
        setDevTapCount(newCount);

        if (newCount >= 7) {
            try {
                await AsyncStorage.setItem(ASYNC_KEYS.DEVELOPER_MODE, 'true');
                setIsDevMode(true);
                ToastAndroid.show("You are now a tester!", ToastAndroid.SHORT);
            } catch (error) {
                console.error('Failed to enable dev mode', error);
            }
        } else if (newCount >= 4) {
            const remaining = 7 - newCount;
            ToastAndroid.show(`You are ${remaining} steps away from being a tester`, ToastAndroid.SHORT);
        }
    };

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[type.title, styles.title, { color: ds.text }]}>Learn</Text>
                <Text style={[type.small, styles.intro, { color: ds.text2 }]}>Short guides on every number WealthSnap shows you.</Text>

                <SectionHeader title="Guides" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfContent}>
                    {GUIDES.map(topic => (
                        <Pressable
                            key={topic.id}
                            onPress={() => openHelp(topic.id)}
                            style={[styles.guide, { backgroundColor: ds.inset }]}
                            accessibilityRole="button"
                        >
                            <Ionicons name={topic.icon as IconName} size={22} color={ds.accent} />
                            <Text style={[type.body, styles.guideTitle, { color: ds.text }]} numberOfLines={2}>{topic.title}</Text>
                            <Text style={[type.caption, styles.guideSubtitle, { color: ds.text2 }]} numberOfLines={2}>{topic.subtitle}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <SectionHeader title="Help center" />
                <Row icon="calculator-outline" title="Math and formulas" subtitle="How every number is calculated" chevron onPress={() => openHelp('math')} />
                <Row icon="help-circle-outline" title="FAQ" subtitle="Common questions" chevron onPress={() => openHelp('faq')} />
                <Row icon="chatbubbles-outline" title="Contact the developer" subtitle="Questions, bugs, ideas" chevron onPress={() => setShowContactModal(true)} />
                <Row icon="create-outline" title="Provide feedback" subtitle="Anonymous Google Form" chevron onPress={() => setShowFeedbackModal(true)} />
                <Row icon="shield-checkmark-outline" title="Terms of use and privacy" chevron onPress={() => navigation.navigate('TermsAndPrivacy')} last />

                <Pressable onPress={handleDevTap}>
                    <SectionHeader title="About WealthSnap" />
                </Pressable>
                <Row icon="gift-outline" title="Why it's free" subtitle="No ads, no data selling" chevron onPress={() => setShowWhyFreeModal(true)} />
                <Row icon="document-text-outline" title="Manifesto" subtitle="Vision, philosophy and goals" chevron onPress={() => setShowManifestoModal(true)} />
                <Row icon="person-outline" title="A message from the developer" chevron onPress={() => setShowDevMessageModal(true)} />
                <Row icon="sparkles-outline" title="Supporter wall" chevron onPress={() => navigation.navigate('ThankYou')} />
                <Row icon="heart-outline" title="Support the developer" subtitle="Ko-fi or PayPal" chevron onPress={() => setShowSupportModal(true)} />
                <Row icon="star-outline" title="Rate WealthSnap" subtitle="Help others find it" chevron onPress={handleRate} />
                <Row icon="information-circle-outline" title={`Version ${appJson.expo.version}`} subtitle="What's new" chevron onPress={() => openHelp('changelog')} last />
            </ScrollView>

            {/* Help Center Modal */}
            <BottomModal
                visible={showHelp}
                onClose={() => setShowHelp(false)}
                maxHeight="85%"
                title=""
                style={{ padding: 0 }} // Remove default padding to let screen handle it
            >
                <View style={{ height: '100%' }}>
                    <HelpCenterScreen
                        key={helpTopic}
                        onFinish={() => setShowHelp(false)}
                        mode="view"
                        initialTopicId={helpTopic}
                    />
                </View>
            </BottomModal>

            {/* Why Free Modal */}
            <BottomModal
                visible={showWhyFreeModal}
                onClose={() => setShowWhyFreeModal(false)}
                title="Why is WealthSnap free? 🎁"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 10, marginBottom: 20 }}>
                        Most &quot;free&quot; apps stay alive by selling your data or burying you in ads. WealthSnap takes a different path: <Text style={{ fontWeight: '700', color: colors.text }}>Architectural Integrity</Text>.
                    </Text>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            1. No Servers, No Costs
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            Because your data never leaves your device, we have zero server hosting or database costs. Since it costs us nothing to store your data, it costs you nothing to use the app.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            2. Sustainable AI (BYOK)
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            By using your own Gemini API key for AI features, you cover your own &quot;usage tax&quot;. This allows us to offer advanced intelligence without a subscription fee or venture capital funding.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                            3. Built for the Developer
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            We built this tool for our own financial clarity. Sharing it with you costs us nothing but our time, and we believe everyone deserves a high-resolution view of their life without a price tag or a privacy trade-off.
                        </Text>
                    </View>

                    <Button
                        title="Got it!"
                        onPress={() => setShowWhyFreeModal(false)}
                        style={{ marginTop: 10, marginBottom: 20 }}
                    />
                </ScrollView>
            </BottomModal>

            {/* Developer Message Modal */}
            <BottomModal
                visible={showDevMessageModal}
                onClose={() => setShowDevMessageModal(false)}
                title="Hello there! 👋"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '500', marginBottom: 12 }}>
                        Thanks for using WealthSnap!
                    </Text>

                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16 }}>
                        I built this app because I wanted a higher resolution for my own financial life. For years, I relied on <Text style={{ fontWeight: '700', color: colors.text }}>Lista</Text>—a fantastic tool that I still genuinely admire for its simplicity. However, as my needs grew toward complex investment tracking and deep-tier financial logic, I realized I needed a private &quot;bunker&quot; for my data.
                    </Text>

                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 16 }}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>WealthSnap</Text> was born from that need. What started as a personal script has evolved into a privacy-first platform designed for those who want full control over their records without the &quot;cloud-sync&quot; trade-off.
                    </Text>

                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                            A Note on the Build
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            <Text style={{ fontWeight: '700', color: colors.text }}>WealthSnap</Text> is a 100% independent, solo-developed project. There are no venture capitalists or support teams here—just one engineer and a keyboard.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginTop: 12 }}>
                            Because this is a personal mission, updates and support are provided on a &quot;best-effort&quot; basis between my professional life and family time. If this app brings you clarity, the mission is accomplished; if it needs a fix, I&apos;ll get to it as soon as life permits.
                        </Text>
                    </View>

                    <Button
                        title="Close"
                        onPress={() => setShowDevMessageModal(false)}
                        variant="outline"
                    />
                </ScrollView>
            </BottomModal>

            {/* Support Modal */}
            <SupportModal
                visible={showSupportModal}
                onClose={() => setShowSupportModal(false)}
            />

            {/* Contact Developer Modal */}
            <ContactDeveloperModal
                visible={showContactModal}
                onClose={() => setShowContactModal(false)}
            />

            {/* Feedback Modal */}
            <BottomModal
                visible={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                title="Provide Feedback 💬"
            >
                <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                        Since WealthSnap is an offline-first app, we don&apos;t track your usage or collect any data. This ensures your privacy, but it also means we don&apos;t automatically know when things go wrong.
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 15 }}>
                        Your feedback via Google Forms helps us understand bugs, quirks, and which updates you&apos;d like to see next. It&apos;s the best way to help improve the app while keeping it private!
                    </Text>

                    <Button
                        title="Take me to Google Form"
                        onPress={() => {
                            setShowFeedbackModal(false);
                            Linking.openURL('https://forms.gle/rS6kdufy6uBMLMjf6');
                        }}
                        style={{ marginTop: 24 }}
                    />
                    <Button
                        title="Maybe later"
                        onPress={() => setShowFeedbackModal(false)}
                        variant="outline"
                        style={{ marginTop: 12 }}
                    />
                </View>
            </BottomModal>

            {/* Manifesto Modal */}
            <BottomModal
                visible={showManifestoModal}
                onClose={() => setShowManifestoModal(false)}
                title="Vision, Philosophy & Goals"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: 20, marginTop: 5 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🔭 Vision</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            To provide absolute ownership of financial truth through a zero-knowledge, local-first architecture. WealthSnap envisions a world where privacy is the default and individual data is the ultimate tool for personal clarity.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🏛️ Philosophy & Stance</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24 }}>
                            WealthSnap is a Reflection Tool, not an advisor or a trading platform. It does not provide tips or financial &quot;shoulds&quot;; it provides a high-precision mirror of your own data to help you see your reality without external noise.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={[styles.cardTitle, { color: colors.text, fontSize: 16, marginBottom: 8 }]}>🎯 Strategic Goals</Text>

                        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginRight: 8 }}>1.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>The Skill Portfolio</Text>: Treat professional knowledge as a high-yield financial asset. WealthSnap tracks skills as a portfolio that generates dividends in earning potential.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginRight: 8 }}>2.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>The Health Portfolio</Text>: Manage the &quot;Physical Hardware&quot; required to run your &quot;Professional Software&quot;. Health is the ultimate insurance for future earning power.
                            </Text>
                        </View>
                    </View>

                    <Button
                        title="Close"
                        onPress={() => setShowManifestoModal(false)}
                        variant="outline"
                        style={{ marginTop: 10, marginBottom: 20 }}
                    />
                </ScrollView>
            </BottomModal>
        </ScreenWrapper>
    );
};

const GUIDE_WIDTH = 148;

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    title: {
        paddingTop: space[1],
    },
    intro: {
        marginTop: space[1],
    },
    // Bleeds to the screen edges so the tiles scroll under the gutter.
    shelf: {
        marginHorizontal: -space[5],
        marginTop: space[2],
    },
    shelfContent: {
        paddingHorizontal: space[5],
        gap: space[2],
    },
    guide: {
        width: GUIDE_WIDTH,
        borderRadius: radius.md,
        padding: space[4],
    },
    guideTitle: {
        marginTop: space[3],
    },
    guideSubtitle: {
        marginTop: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
});

export default LearnScreen;
