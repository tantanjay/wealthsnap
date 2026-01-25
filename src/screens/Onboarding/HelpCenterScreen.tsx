import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../styles/theme';
import { Button } from '../../components';
import { HELP_TOPICS, HelpTopic, HelpSlide } from '../../data/helpContent';

interface HelpCenterProps {
    onFinish: () => void;
    mode?: 'onboarding' | 'view';
}

const HelpCenterScreen: React.FC<HelpCenterProps> = ({ onFinish, mode = 'onboarding' }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    // If in onboarding mode, we might want to default to 'Getting Started' slides
    // but the plan says it should be a menu first.
    // However, for first-time users, maybe the slides are better.
    // Given the user request "put that on the very first menu", menu seems preferred.

    useEffect(() => {
        const backAction = () => {
            if (selectedTopic) {
                setSelectedTopic(null);
                setCurrentSlide(0);
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

    const renderSlides = (slides: HelpSlide[]) => {
        const slide = slides[currentSlide];

        const handleNext = () => {
            if (currentSlide < slides.length - 1) {
                setCurrentSlide(currentSlide + 1);
            } else {
                setSelectedTopic(null);
                setCurrentSlide(0);
            }
        };

        const handlePrev = () => {
            if (currentSlide > 0) {
                setCurrentSlide(currentSlide - 1);
            }
        };

        return (
            <View style={styles.slidesWrapper}>
                <TouchableOpacity
                    style={styles.viewerBack}
                    onPress={() => {
                        setSelectedTopic(null);
                        setCurrentSlide(0);
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                    <Text style={[styles.backText, { color: colors.text }]}>Back to Menu</Text>
                </TouchableOpacity>

                <View style={styles.slideContent}>
                    <View style={[styles.slideIconContainer, { backgroundColor: slide.color + '20' }]}>
                        <Ionicons name={slide.icon as any} size={80} color={slide.color} />
                    </View>

                    <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>

                    {slide.isNotice && (
                        <View style={styles.noticeBox}>
                            <Text style={styles.noticeText}>IMPORTANT NOTICE</Text>
                        </View>
                    )}

                    <Text style={[styles.slideDescription, { color: colors.textSecondary }]}>
                        {slide.description}
                    </Text>

                    <View style={styles.pagination}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: index === currentSlide ? colors.primary : colors.border,
                                        width: index === currentSlide ? 24 : 8
                                    }
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <View style={[styles.slideFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <TouchableOpacity
                        onPress={handlePrev}
                        disabled={currentSlide === 0}
                        style={{ opacity: currentSlide === 0 ? 0 : 1, padding: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <Button
                        title={currentSlide === slides.length - 1 ? "Finish" : "Next"}
                        onPress={handleNext}
                        style={{ width: 140 }}
                    />
                </View>
            </View>
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
                                return <Text key={index} style={[styles.p, { color: colors.textSecondary }]}>{item.text}</Text>;
                            case 'bullet':
                                return (
                                    <View key={index} style={styles.bulletRow}>
                                        <Text style={[styles.bulletDot, { color: topic.color }]}>•</Text>
                                        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item.text}</Text>
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
        // Slides Styles
        slidesWrapper: {
            flex: 1,
            padding: SPACING.lg,
            justifyContent: 'space-between',
        },
        viewerBack: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 20,
        },
        backText: {
            fontSize: 16,
            fontWeight: '600',
            marginLeft: 8,
        },
        slideContent: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: SPACING.md,
        },
        slideIconContainer: {
            width: 140,
            height: 140,
            borderRadius: 70,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 30,
        },
        slideTitle: {
            fontSize: 26,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
        },
        slideDescription: {
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: 10,
        },
        noticeBox: {
            borderWidth: 1,
            borderColor: '#FFC107',
            backgroundColor: '#FFC10710',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 4,
            marginBottom: 16,
        },
        noticeText: {
            fontSize: 12,
            fontWeight: 'bold',
            color: '#FFC107',
            letterSpacing: 1,
        },
        pagination: {
            flexDirection: 'row',
            marginTop: 30,
        },
        dot: {
            height: 8,
            borderRadius: 4,
            marginHorizontal: 4,
        },
        slideFooter: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 20,
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
            ) : selectedTopic.type === 'slides' ? (
                renderSlides(selectedTopic.slides || [])
            ) : (
                renderDocument(selectedTopic)
            )}
        </View>
    );
};

export default HelpCenterScreen;
