import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, PressableInstance, ScrollView, ScrollViewInstance, BackHandler, Linking, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, Row, IconName, DropdownMenu, DropdownAnchor } from '@components/ds';
import { Disclaimer } from '@components/common/Disclaimer';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, fontFamily, layout } from '@styles/theme';
import { HELP_TOPICS, HelpTopic } from '@constants/helpContent';
import { splitBoldSegments, splitLinkSegments } from '@utils/markdownParser';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';
import GuideVisual from '@components/onboarding/GuideVisual';

// A changelog version heading, e.g. "[2.0.0] — 2026-11-04" or "[Unreleased]".
const VERSION_HEADING = /^\[([^\]]+)\](?:\s*[—-]\s*(\d{4})-(\d{2})-(\d{2}))?$/;

interface VersionAnchor {
    key: string;
    itemIndex: number;
    label: string;
    shortLabel: string;
}

const versionAnchorsOf = (topic: HelpTopic | null): VersionAnchor[] => {
    const anchors: VersionAnchor[] = [];
    topic?.content?.forEach((item, itemIndex) => {
        if (item.type !== 'heading2') return;
        const m = VERSION_HEADING.exec(item.text);
        if (!m) return;
        const [, version, y, mo, d] = m;
        const date = y ? new Date(+y, +mo - 1, +d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
        anchors.push({ key: version, itemIndex, label: date ? `${version} · ${date}` : version, shortLabel: version });
    });
    return anchors;
};

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
    const docScrollRef = useRef<ScrollViewInstance>(null);
    const jumpTriggerRef = useRef<PressableInstance>(null);
    const [jumpAnchor, setJumpAnchor] = useState<DropdownAnchor | null>(null);
    const groupY = useRef(0);
    const headingYs = useRef<Record<number, number>>({});
    const versions = useMemo(() => versionAnchorsOf(selectedTopic), [selectedTopic]);
    const [pickedVersion, setCurrentVersion] = useState<string | null>(null);
    const currentVersion = versions.some(v => v.key === pickedVersion) ? pickedVersion : versions[0]?.key ?? null;

    const versionTop = (v: VersionAnchor) => groupY.current + (headingYs.current[v.itemIndex] ?? 0);

    const jumpToVersion = (key: string) => {
        const v = versions.find(x => x.key === key);
        if (!v) return;
        setCurrentVersion(key);
        docScrollRef.current?.scrollTo({ y: Math.max(0, versionTop(v) - space[4]), animated: true });
    };

    // Keeps the jump menu's label on the version currently at the top of the screen.
    const onDocScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (versions.length < 2) return;
        const y = e.nativeEvent.contentOffset.y + space[6];
        let key = versions[0].key;
        for (const v of versions) {
            if (versionTop(v) <= y) key = v.key;
            else break;
        }
        if (key !== currentVersion) setCurrentVersion(key);
    };

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
                    seg.bold ? <Text key={i} style={{ fontFamily: fontFamily.semibold, color: ds.text }}>{seg.text}</Text> : (
                        splitLinkSegments(seg.text).map((part, j) => part.url ? (
                            <Text
                                key={`${i}-${j}`}
                                style={{ fontFamily: fontFamily.medium, color: ds.accent }}
                                onPress={() => Linking.openURL(part.url!)}
                                accessibilityRole="link"
                            >
                                {part.text}
                            </Text>
                        ) : part.text)
                    )
                )}
            </Text>
        );
    };

    const renderDocument = (topic: HelpTopic) => {
        return (
            <View style={styles.documentWrapper}>
                <View style={[styles.viewerHeader, { borderBottomColor: ds.hairline }]}>
                    <View style={styles.headerSide}>
                        <Pressable
                            onPress={closeTopic}
                            hitSlop={space[2]}
                            accessibilityLabel="Back"
                        >
                            <Ionicons name="arrow-back" size={24} color={ds.text2} />
                        </Pressable>
                    </View>
                    <Text style={[type.body, styles.viewerTitle, { color: ds.text }]}>
                        {topic.title}
                    </Text>
                    <View style={[styles.headerSide, styles.headerSideEnd]}>
                        {versions.length > 1 && currentVersion && (
                            <Pressable
                                ref={jumpTriggerRef}
                                onPress={() => jumpTriggerRef.current?.measureInWindow((x, y, width, height) => setJumpAnchor({ x, y, width, height }))}
                                hitSlop={space[2]}
                                accessibilityRole="button"
                                accessibilityLabel="Jump to version"
                            >
                                <Text style={[type.smallMedium, { color: ds.accent }]}>
                                    {versions.find(v => v.key === currentVersion)?.shortLabel} ⌄
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>
                {versions.length > 1 && currentVersion && (
                    <DropdownMenu
                        anchor={jumpAnchor}
                        options={versions.map(v => ({ key: v.key, label: v.label }))}
                        value={currentVersion}
                        onSelect={jumpToVersion}
                        onClose={() => setJumpAnchor(null)}
                    />
                )}

                <ScrollView
                    ref={docScrollRef}
                    onScroll={onDocScroll}
                    scrollEventThrottle={64}
                    style={styles.documentScroll}
                    contentContainerStyle={[styles.documentContent, { paddingBottom: insets.bottom + space[5] }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View onLayout={e => { groupY.current = e.nativeEvent.layout.y; }}>
                        <Group padded>
                            {topic.content?.map((item, index) => {
                                switch (item.type) {
                                    case 'heading1':
                                        return <Text key={index} style={[type.title, styles.h1, { color: ds.text }]}>{item.text}</Text>;
                                    case 'heading2':
                                        return (
                                            <Text
                                                key={index}
                                                onLayout={e => { headingYs.current[index] = e.nativeEvent.layout.y; }}
                                                style={[type.bodyStrong, styles.h2, { color: ds.text }]}
                                            >
                                                {item.text}
                                            </Text>
                                        );
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
                                    case 'visual':
                                        return <GuideVisual key={index} id={item.id} />;
                                    case 'divider':
                                        return <View key={index} style={[styles.divider, { backgroundColor: ds.hairline }]} />;
                                    case 'alert':
                                        return (
                                            <Disclaimer key={index} severity={item.alertType === 'info' || !item.alertType ? 'info' : 'warning'} inGroup label={null} style={styles.alert}>
                                                {item.text}
                                            </Disclaimer>
                                        );
                                    default:
                                        return null;
                                }
                            })}
                        </Group>
                    </View>
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
    // Equal-width sides keep the title centered whatever sits on the right.
    headerSide: {
        flex: 1,
        minWidth: 24,
        alignItems: 'flex-start',
    },
    headerSideEnd: {
        alignItems: 'flex-end',
    },
    viewerTitle: {
        flexShrink: 1,
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
    alert: {
        marginTop: 0,
        marginBottom: space[4],
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
