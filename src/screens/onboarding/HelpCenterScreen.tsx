import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { SPACING } from '@styles/theme';
import { HELP_TOPICS, HelpTopic } from '@constants/helpContent';
import { splitBoldSegments } from '@utils/markdownParser';
import OnboardingGuide from '@screens/onboarding/OnboardingGuideScreen';

interface HelpCenterProps {
    onFinish: () => void;
    mode?: 'onboarding' | 'view';
}

const HelpCenterScreen: React.FC<HelpCenterProps> = ({ onFinish, mode = 'onboarding' }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

    useEffect(() => {
        const backAction = () => {
            if (selectedTopic) {
                setSelectedTopic(null);
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
    }, [selectedTopic, mode, onFinish]);

    const renderMenu = () => (
        <ScrollView
            style={styles.menuContainer}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={[styles.mainTitle, { color: colors.text }]}>Help Center 📚</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Everything you need to know about WealthSnap
                </Text>
            </View>

            {HELP_TOPICS.map((topic) => (
                <TouchableOpacity
                    key={topic.id}
                    style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setSelectedTopic(topic)}
                >
                    <View style={[styles.topicIcon, { backgroundColor: topic.color + '20' }]}>
                        <Ionicons name={topic.icon as any} size={24} color={topic.color} />
                    </View>
                    <View style={styles.topicInfo}>
                        <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
                        <Text style={[styles.topicSubtitle, { color: colors.textSecondary }]}>{topic.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            ))}

            <View style={styles.footer}>
                {mode === 'onboarding' ? (
                    <Button
                        title="Get Started"
                        onPress={onFinish}
                        style={styles.actionButton}
                    />
                ) : (
                    <Button
                        title="Close"
                        onPress={onFinish}
                        variant="outline"
                        style={styles.actionButton}
                    />
                )}
            </View>
        </ScrollView>
    );

    const renderFormattedText = (text: string, baseStyle: any) => {
        return (
            <Text style={baseStyle}>
                {splitBoldSegments(text).map((seg, i) =>
                    seg.bold ? <Text key={i} style={{ fontWeight: 'bold' }}>{seg.text}</Text> : seg.text
                )}
            </Text>
        );
    };

    const renderDocument = (topic: HelpTopic) => {
        return (
            <View style={styles.documentWrapper}>
                <View style={[styles.viewerHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                        style={styles.viewerBack}
                        onPress={() => setSelectedTopic(null)}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.viewerTitle, { color: colors.text }]} numberOfLines={1}>
                        {topic.title}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.documentScroll}
                    contentContainerStyle={[styles.documentContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {topic.content?.map((item, index) => {
                        switch (item.type) {
                            case 'heading1':
                                return <Text key={index} style={[styles.h1, { color: colors.text }]}>{item.text}</Text>;
                            case 'heading2':
                                return <Text key={index} style={[styles.h2, { color: colors.text }]}>{item.text}</Text>;
                            case 'heading3':
                                return <Text key={index} style={[styles.h3, { color: colors.text }]}>{item.text}</Text>;
                            case 'paragraph':
                                return (
                                    <View key={index}>
                                        {renderFormattedText(item.text, [styles.p, { color: colors.textSecondary }])}
                                    </View>
                                );
                            case 'bullet':
                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.bulletRow,
                                            item.indent ? { paddingLeft: item.indent * 20 } : null
                                        ]}
                                    >
                                        <Text style={[styles.bulletDot, { color: topic.color }]}>•</Text>
                                        {renderFormattedText(item.text, [styles.bulletText, { color: colors.textSecondary }])}
                                    </View>
                                );
                            case 'blockquote':
                                return (
                                    <View key={index} style={[styles.blockquote, { borderLeftColor: topic.color, backgroundColor: topic.color + '10' }]}>
                                        <Text style={[styles.blockquoteText, { color: colors.text }]}>{item.text}</Text>
                                    </View>
                                );
                            case 'formula':
                                return (
                                    <View key={index} style={[styles.formulaBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Text style={[styles.formulaLabel, { color: colors.textSecondary }]}>FORMULA</Text>
                                        <Text style={[styles.formulaText, { color: colors.primary }]}>{item.text}</Text>
                                    </View>
                                );
                            case 'divider':
                                return <View key={index} style={[styles.divider, { backgroundColor: colors.border }]} />;
                            default:
                                return null;
                        }
                    })}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        menuContainer: {
            flex: 1,
            padding: SPACING.lg,
        },
        header: {
            marginTop: 10,
            marginBottom: 20,
            paddingHorizontal: 0,
        },
        mainTitle: {
            fontSize: 32,
            fontWeight: '800',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            lineHeight: 22,
        },
        topicCard: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            marginBottom: 16,
        },
        topicIcon: {
            width: 48,
            height: 48,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        topicInfo: {
            flex: 1,
        },
        topicTitle: {
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 4,
        },
        topicSubtitle: {
            fontSize: 14,
        },
        footer: {
            marginTop: 20,
            marginBottom: 40,
        },
        actionButton: {
            height: 56,
            borderRadius: 16,
        },
        viewerBack: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 20,
        },
        // Document Styles
        documentWrapper: {
            flex: 1,
        },
        viewerHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderBottomWidth: 1,
            marginTop: 10,
        },
        viewerTitle: {
            fontSize: 18,
            fontWeight: '700',
            flex: 1,
            textAlign: 'center',
        },
        documentScroll: {
            flex: 1,
        },
        documentContent: {
            padding: 20,
        },
        h1: {
            fontSize: 28,
            fontWeight: '800',
            marginBottom: 16,
        },
        h2: {
            fontSize: 22,
            fontWeight: '700',
            marginTop: 24,
            marginBottom: 12,
        },
        h3: {
            fontSize: 18,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 8,
        },
        p: {
            fontSize: 16,
            lineHeight: 24,
            marginBottom: 16,
        },
        bulletRow: {
            flexDirection: 'row',
            marginBottom: 12,
            paddingRight: 20,
        },
        bulletDot: {
            fontSize: 20,
            marginRight: 10,
            marginTop: -2,
        },
        bulletText: {
            fontSize: 16,
            lineHeight: 24,
            flex: 1,
        },
        blockquote: {
            padding: 16,
            borderLeftWidth: 4,
            borderRadius: 8,
            marginBottom: 20,
        },
        blockquoteText: {
            fontSize: 15,
            fontStyle: 'italic',
            lineHeight: 22,
        },
        formulaBox: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 20,
            alignItems: 'center',
        },
        formulaLabel: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1,
            marginBottom: 8,
        },
        formulaText: {
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'monospace',
            textAlign: 'center',
        },
        divider: {
            height: 1,
            marginVertical: 20,
            opacity: 0.3,
        }
    });

    return (
        <View style={styles.container}>
            {!selectedTopic ? (
                renderMenu()
            ) : selectedTopic.type === 'onboarding' ? (
                <OnboardingGuide onFinish={() => setSelectedTopic(null)} mode="view" />
            ) : (
                renderDocument(selectedTopic)
            )}
        </View>
    );
};

export default HelpCenterScreen;
