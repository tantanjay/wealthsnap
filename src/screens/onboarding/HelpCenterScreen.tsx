import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, Row, IconName } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, fontFamily, layout } from '@styles/theme';
import { HELP_TOPICS, HelpTopic } from '@constants/helpContent';
import { splitBoldSegments } from '@utils/markdownParser';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';

interface HelpCenterProps {
    onFinish: () => void;
    mode?: 'onboarding' | 'view';
    // Opens straight into one topic; going back from it closes the Help Center instead of showing the menu.
    initialTopicId?: string;
}

const HelpCenterScreen: React.FC<HelpCenterProps> = ({ onFinish, mode = 'onboarding', initialTopicId }) => {
    const { ds } = useTheme();
    const insets = useSafeAreaInsets();
    const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(
        () => HELP_TOPICS.find(t => t.id === initialTopicId) ?? null
    );
    const closeTopic = useCallback(() => {
        if (initialTopicId) onFinish();
        else setSelectedTopic(null);
    }, [initialTopicId, onFinish]);

    useEffect(() => {
        const backAction = () => {
            if (selectedTopic) {
                closeTopic();
                return true;
            }
            if (mode === 'onboarding') {
                return true; // Prevent exit
            }
            onFinish();
            return true;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [selectedTopic, mode, onFinish, closeTopic]);

    const renderMenu = () => (
        <ScrollView
            style={styles.menuContainer}
            contentContainerStyle={{ paddingBottom: insets.bottom + space[5] }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={[type.title, { color: ds.text }]}>Help Center 📚</Text>
                <Text style={[type.small, { color: ds.text2 }]}>
                    Everything you need to know about WealthSnap
                </Text>
            </View>

            <Group>
                    {HELP_TOPICS.map((topic, index) => (
                        <Row
                            key={topic.id}
                            icon={topic.icon as IconName}
                            title={topic.title}
                            subtitle={topic.subtitle}
                            chevron
                            last={index === HELP_TOPICS.length - 1}
                            onPress={() => setSelectedTopic(topic)}
                        />
                    ))}
            </Group>

            <View style={styles.footer}>
                {mode === 'onboarding' ? (
                    <Pressable
                        onPress={onFinish}
                        style={[styles.actionButton, { backgroundColor: ds.accent }]}
                        accessibilityRole="button"
                    >
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Get started</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={onFinish}
                        style={[styles.actionButton, { backgroundColor: ds.group }]}
                        accessibilityRole="button"
                    >
                        <Text style={[type.bodyStrong, { color: ds.text }]}>Close</Text>
                    </Pressable>
                )}
            </View>
        </ScrollView>
    );

    const renderFormattedText = (text: string, baseStyle: any) => {
        return (
            <Text style={baseStyle}>
                {splitBoldSegments(text).map((seg, i) =>
                    seg.bold ? <Text key={i} style={{ fontFamily: fontFamily.semibold, color: ds.text }}>{seg.text}</Text> : seg.text
                )}
            </Text>
        );
    };

    const renderDocument = (topic: HelpTopic) => {
        return (
            <View style={styles.documentWrapper}>
                <View style={[styles.viewerHeader, { borderBottomColor: ds.hairline }]}>
                    <Pressable
                        onPress={closeTopic}
                        hitSlop={space[2]}
                        accessibilityLabel="Back"
                    >
                        <Ionicons name="arrow-back" size={24} color={ds.text2} />
                    </Pressable>
                    <Text style={[type.body, styles.viewerTitle, { color: ds.text }]} numberOfLines={1}>
                        {topic.title}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.documentScroll}
                    contentContainerStyle={[styles.documentContent, { paddingBottom: insets.bottom + space[5] }]}
                    showsVerticalScrollIndicator={false}
                >
                    <Group padded>
                        {topic.content?.map((item, index) => {
                            switch (item.type) {
                                case 'heading1':
                                    return <Text key={index} style={[type.title, styles.h1, { color: ds.text }]}>{item.text}</Text>;
                                case 'heading2':
                                    return <Text key={index} style={[type.bodyStrong, styles.h2, { color: ds.text }]}>{item.text}</Text>;
                                case 'heading3':
                                    return <Text key={index} style={[type.smallStrong, styles.h3, { color: ds.text }]}>{item.text}</Text>;
                                case 'paragraph':
                                    return (
                                        <View key={index}>
                                            {renderFormattedText(item.text, [type.body, styles.p, { color: ds.text2 }])}
                                        </View>
                                    );
                                case 'bullet':
                                    return (
                                        <View
                                            key={index}
                                            style={[
                                                styles.bulletRow,
                                                item.indent ? { paddingLeft: item.indent * space[5] } : null
                                            ]}
                                        >
                                            <Text style={[type.body, styles.bulletDot, { color: ds.text3 }]}>•</Text>
                                            {renderFormattedText(item.text, [type.body, styles.bulletText, { color: ds.text2 }])}
                                        </View>
                                    );
                                case 'blockquote':
                                    return (
                                        <View key={index} style={[styles.blockquote, { backgroundColor: ds.inset }]}>
                                            <Text style={[type.small, styles.blockquoteText, { color: ds.text }]}>{item.text}</Text>
                                        </View>
                                    );
                                case 'formula':
                                    return (
                                        <View key={index} style={[styles.formulaBox, { backgroundColor: ds.inset }]}>
                                            <Text style={[type.captionMedium, styles.formulaLabel, { color: ds.text2 }]}>Formula</Text>
                                            <Text style={[type.smallMedium, styles.formulaText, { color: ds.text }]}>{item.text}</Text>
                                        </View>
                                    );
                                case 'divider':
                                    return <View key={index} style={[styles.divider, { backgroundColor: ds.hairline }]} />;
                                default:
                                    return null;
                            }
                        })}
                    </Group>
                    <View style={{ height: space[7] }} />
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: ds.canvas }]}>
            {!selectedTopic ? (
                renderMenu()
            ) : selectedTopic.type === 'onboarding' ? (
                <OnboardingGuide onFinish={closeTopic} mode="view" />
            ) : (
                renderDocument(selectedTopic)
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: layout.groupInset,
        paddingTop: space[5],
    },
    header: {
        paddingHorizontal: layout.groupPadding,
        gap: space[1],
        marginTop: space[2],
        marginBottom: space[4],
    },
    footer: {
        marginTop: space[6],
        marginBottom: space[7],
    },
    actionButton: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Document Styles
    documentWrapper: {
        flex: 1,
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space[3],
        paddingHorizontal: space[5],
        paddingVertical: space[4],
        borderBottomWidth: 1,
        marginTop: space[2],
    },
    viewerTitle: {
        flex: 1,
        textAlign: 'center',
    },
    documentScroll: {
        flex: 1,
    },
    documentContent: {
        padding: layout.groupInset,
    },
    h1: {
        marginBottom: space[4],
    },
    h2: {
        marginTop: space[6],
        marginBottom: space[3],
    },
    h3: {
        marginTop: space[4],
        marginBottom: space[2],
    },
    p: {
        marginBottom: space[4],
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: space[3],
    },
    bulletDot: {
        marginRight: space[2],
    },
    bulletText: {
        flex: 1,
    },
    blockquote: {
        padding: space[4],
        borderRadius: radius.sm,
        marginBottom: space[5],
    },
    blockquoteText: {
        fontStyle: 'italic',
    },
    formulaBox: {
        padding: space[4],
        borderRadius: radius.sm,
        marginBottom: space[5],
        alignItems: 'center',
    },
    formulaLabel: {
        marginBottom: space[2],
    },
    formulaText: {
        textAlign: 'center',
    },
    divider: {
        height: 1,
        marginVertical: space[5],
    },
});

export default HelpCenterScreen;
