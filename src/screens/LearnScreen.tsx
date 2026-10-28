import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, Pressable, Linking, ToastAndroid, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import appJson from '@app.json';
import BottomModal from '@components/common/BottomModal';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Row, SectionHeader, IconName } from '@components/ds';
import SupportModal from '@components/profile/settings/SupportModal';
import ContactDeveloperModal from '@components/profile/settings/ContactDeveloperModal';
import HelpCenterScreen from '@screens/onboarding/HelpCenterScreen';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';
import { useTheme } from '@context/ThemeContext';
import { openStoreListing } from '@hooks/useReviewPrompt';
import { HELP_TOPICS } from '@constants/helpContent';
import { ASYNC_KEYS } from '@constants/config';
import { type, space, radius } from '@styles/theme';

// Topics with their own Help center / About row stay off the Guides shelf.
const ROW_TOPICS = ['math', 'faq', 'changelog'];
const GUIDES = HELP_TOPICS.filter(t => !ROW_TOPICS.includes(t.id));

// Guides, help center and about content (moved out of Profile).
const LearnScreen = ({ navigation }: any) => {
    // colors.background: the guide still paints the older background, so the status-bar strip matches it.
    const { ds, colors } = useTheme();
    const insets = useSafeAreaInsets();

    // Kept after closing so the modal doesn't swap content during its close animation.
    const [helpTopic, setHelpTopic] = useState<string>('faq');
    const [showHelp, setShowHelp] = useState(false);
    // The slideshow guide is built for a full screen, so it opens as one instead of inside a sheet.
    const [showGuide, setShowGuide] = useState(false);
    const handleRate = async () => {
        if (!(await openStoreListing())) ToastAndroid.show("Couldn't open the store", ToastAndroid.SHORT);
    };
    const openHelp = (topicId: string) => {
        if (HELP_TOPICS.find(t => t.id === topicId)?.type === 'onboarding') {
            setShowGuide(true);
            return;
        }
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
                // The help screen brings its own padding.
                style={{ paddingHorizontal: 0, paddingBottom: 0 }}
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

            <Modal visible={showGuide} animationType="slide" statusBarTranslucent onRequestClose={() => setShowGuide(false)}>
                {/* A Modal renders outside the app's gesture root on Android; the guide swipes between slides. */}
                <GestureHandlerRootView style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
                    <OnboardingGuide mode="view" onFinish={() => setShowGuide(false)} />
                </GestureHandlerRootView>
            </Modal>

            {/* Why Free Modal */}
            <BottomModal
                visible={showWhyFreeModal}
                onClose={() => setShowWhyFreeModal(false)}
                title="Why is WealthSnap free?"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.body, { color: ds.text2 }]}>
                        Most &quot;free&quot; apps stay alive by selling your data or burying you in ads. WealthSnap takes a different path: <Text style={{ color: ds.text }}>Architectural Integrity</Text>.
                    </Text>

                    <SectionHeader title="1. No servers, no costs" />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        Because your data never leaves your device, we have zero server hosting or database costs. Since it costs us nothing to store your data, it costs you nothing to use the app.
                    </Text>

                    <SectionHeader title="2. Sustainable AI (BYOK)" />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        By using your own Gemini API key for AI features, you cover your own &quot;usage tax&quot;. This allows us to offer advanced intelligence without a subscription fee or venture capital funding.
                    </Text>

                    <SectionHeader title="3. Built for the developer" />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        We built this tool for our own financial clarity. Sharing it with you costs us nothing but our time, and we believe everyone deserves a high-resolution view of their life without a price tag or a privacy trade-off.
                    </Text>
                </ScrollView>
            </BottomModal>

            {/* Developer Message Modal */}
            <BottomModal
                visible={showDevMessageModal}
                onClose={() => setShowDevMessageModal(false)}
                title="Hello there!"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.body, { color: ds.text }]}>
                        Thanks for using WealthSnap!
                    </Text>

                    <Text style={[type.body, styles.paragraph, { color: ds.text2 }]}>
                        I built this app because I wanted a higher resolution for my own financial life. For years, I relied on <Text style={{ color: ds.text }}>Lista</Text>—a fantastic tool that I still genuinely admire for its simplicity. However, as my needs grew toward complex investment tracking and deep-tier financial logic, I realized I needed a private &quot;bunker&quot; for my data.
                    </Text>

                    <Text style={[type.body, styles.paragraph, { color: ds.text2 }]}>
                        <Text style={{ color: ds.text }}>WealthSnap</Text> was born from that need. What started as a personal script has evolved into a privacy-first platform designed for those who want full control over their records without the &quot;cloud-sync&quot; trade-off.
                    </Text>

                    <SectionHeader title="A note on the build" />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        <Text style={{ color: ds.text }}>WealthSnap</Text> is a 100% independent, solo-developed project. There are no venture capitalists or support teams here—just one engineer and a keyboard.
                    </Text>
                    <Text style={[type.body, styles.paragraph, { color: ds.text2 }]}>
                        Because this is a personal mission, updates and support are provided on a &quot;best-effort&quot; basis between my professional life and family time. If this app brings you clarity, the mission is accomplished; if it needs a fix, I&apos;ll get to it as soon as life permits.
                    </Text>
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
                title="Provide feedback"
                footer={
                    <>
                        <Pressable
                            onPress={() => {
                                setShowFeedbackModal(false);
                                Linking.openURL('https://forms.gle/rS6kdufy6uBMLMjf6');
                            }}
                            style={[styles.button, { backgroundColor: ds.accent }]}
                            accessibilityRole="button"
                        >
                            <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Take me to Google Form</Text>
                        </Pressable>
                        <Pressable onPress={() => setShowFeedbackModal(false)} style={styles.textButton} accessibilityRole="button">
                            <Text style={[type.body, { color: ds.text2 }]}>Maybe later</Text>
                        </Pressable>
                    </>
                }
            >
                <Text style={[type.body, { color: ds.text2 }]}>
                    Since WealthSnap is an offline-first app, we don&apos;t track your usage or collect any data. This ensures your privacy, but it also means we don&apos;t automatically know when things go wrong.
                </Text>
                <Text style={[type.body, styles.paragraph, { color: ds.text2 }]}>
                    Your feedback via Google Forms helps us understand bugs, quirks, and which updates you&apos;d like to see next. It&apos;s the best way to help improve the app while keeping it private!
                </Text>
            </BottomModal>

            {/* Manifesto Modal */}
            <BottomModal
                visible={showManifestoModal}
                onClose={() => setShowManifestoModal(false)}
                title="Vision, philosophy and goals"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <SectionHeader title="Vision" style={styles.firstHeader} />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        To provide absolute ownership of financial truth through a zero-knowledge, local-first architecture. WealthSnap envisions a world where privacy is the default and individual data is the ultimate tool for personal clarity.
                    </Text>

                    <SectionHeader title="Philosophy and stance" />
                    <Text style={[type.body, { color: ds.text2 }]}>
                        WealthSnap is a Reflection Tool, not an advisor or a trading platform. It does not provide tips or financial &quot;shoulds&quot;; it provides a high-precision mirror of your own data to help you see your reality without external noise.
                    </Text>

                    <SectionHeader title="Strategic goals" />
                    <View style={styles.goal}>
                        <Text style={[type.bodyNum, { color: ds.text2 }]}>1.</Text>
                        <Text style={[type.body, styles.goalText, { color: ds.text2 }]}>
                            <Text style={{ color: ds.text }}>The Skill Portfolio</Text>: Treat professional knowledge as a high-yield financial asset. WealthSnap tracks skills as a portfolio that generates dividends in earning potential.
                        </Text>
                    </View>
                    <View style={[styles.goal, styles.paragraph]}>
                        <Text style={[type.bodyNum, { color: ds.text2 }]}>2.</Text>
                        <Text style={[type.body, styles.goalText, { color: ds.text2 }]}>
                            <Text style={{ color: ds.text }}>The Health Portfolio</Text>: Manage the &quot;Physical Hardware&quot; required to run your &quot;Professional Software&quot;. Health is the ultimate insurance for future earning power.
                        </Text>
                    </View>
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
    paragraph: {
        marginTop: space[3],
    },
    firstHeader: {
        marginTop: 0,
    },
    goal: {
        flexDirection: 'row',
        gap: space[2],
    },
    goalText: {
        flex: 1,
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

export default LearnScreen;
