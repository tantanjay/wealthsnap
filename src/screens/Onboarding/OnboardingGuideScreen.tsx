import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../styles/theme';

interface OnboardingGuideProps {
    onFinish: () => void;
    mode?: 'onboarding' | 'view'; // 'onboarding' blocks back button, 'view' allows exit
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish, mode = 'onboarding' }) => {
    const { colors } = useTheme();
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 'security',
            icon: 'shield-checkmark',
            title: 'Your Data is Secure 🔒',
            description: 'This app is built "Local-First". Your data is encrypted and stored ONLY on your phone.\n\nWE DO NOT HAVE ACCESS TO YOUR DATA.',
            color: '#4CAF50',
            isNotice: true
        },
        {
            id: 'backup',
            icon: 'cloud-download-outline',
            title: 'Backup & Restore',
            description: 'Since data is local, YOU are responsible for safe keeping.\n\nGo to Profile > Backup Data regularly to save a copy of your financial life.',
            color: '#2196F3'
        },
        {
            id: 'transaction',
            icon: 'add-circle-outline',
            title: 'Add Income & Expenses',
            description: 'Tap the big "+" button at the bottom to log transactions.\n\nUse the camera to scan receipts using AI!',
            color: '#FF9800'
        },
        {
            id: 'recurring',
            icon: 'repeat-outline',
            title: 'Recurring Transactions',
            description: 'Set up automated salary or bill entries so you never forget to log them.',
            color: '#9C27B0'
        },
        {
            id: 'budget',
            icon: 'pie-chart-outline',
            title: 'Manage Budget',
            description: 'Set monthly limits for different categories to keep your spending on track.',
            color: '#E91E63'
        },
        {
            id: 'ready',
            icon: 'rocket-outline',
            title: 'You are Ready!',
            description: 'Take control of your wealth today.',
            color: colors.primary,
            isLast: true
        }
    ];

    useEffect(() => {
        const backAction = () => {
            if (mode === 'onboarding') {
                return true; // Prevent going back
            }
            onFinish(); // Allow exit in view mode
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [mode, onFinish]);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onFinish();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const renderSlide = (slide: typeof slides[0]) => {
        return (
            <View style={styles.slideContainer}>
                <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
                    <Ionicons name={slide.icon as any} size={80} color={slide.color} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>

                {slide.isNotice && (
                    <View style={styles.noticeBox}>
                        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                            IMPORTANT NOTICE
                        </Text>
                    </View>
                )}

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {slide.description}
                </Text>

                {/* Pagination Dots */}
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
        );
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: 'space-between',
            padding: SPACING.lg,
        },
        slideContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: SPACING.md,
        },
        iconContainer: {
            width: 160,
            height: 160,
            borderRadius: 80,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SPACING.xl,
        },
        title: {
            fontSize: 28,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: SPACING.md,
        },
        description: {
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: SPACING.md,
        },
        noticeBox: {
            borderWidth: 1,
            borderColor: '#FFC107',
            backgroundColor: '#FFC10710',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 4,
            marginBottom: SPACING.md
        },
        noticeText: {
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: 1
        },
        pagination: {
            flexDirection: 'row',
            marginTop: SPACING.xxl,
            marginBottom: SPACING.xl,
        },
        dot: {
            height: 8,
            borderRadius: 4,
            marginHorizontal: 4,
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: SPACING.lg,
        },
        skipButton: {
            padding: SPACING.md,
        },
        skipText: {
            color: colors.textSecondary,
            fontSize: 16,
        }
    });

    return (
        <View style={styles.container}>
            {/* Header / Skip */}
            <View style={{ alignItems: 'flex-end', paddingTop: SPACING.lg }}>
                {mode === 'view' && (
                    <TouchableOpacity onPress={onFinish} style={styles.skipButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content Used Key to force re-render animation if needed, but reliable update is enough */}
            {renderSlide(slides[currentSlide])}

            {/* Footer Controls */}
            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handlePrev}
                    disabled={currentSlide === 0}
                    style={{ opacity: currentSlide === 0 ? 0 : 1, padding: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Button
                    title={currentSlide === slides.length - 1 ? (mode === 'onboarding' ? "Start App" : "Close") : "Next"}
                    onPress={handleNext}
                    style={{ width: 140 }}
                />
            </View>
        </View>
    );
};

export default OnboardingGuide;
