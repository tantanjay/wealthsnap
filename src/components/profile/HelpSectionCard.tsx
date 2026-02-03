import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface HelpSectionCardProps {
    onOpenHelp: () => void;
    onOpenTerms: () => void;
    onOpenFeedback: () => void;
}

const HelpSectionCard: React.FC<HelpSectionCardProps> = ({ onOpenHelp, onOpenTerms, onOpenFeedback }) => {
    const { colors } = useTheme();

    return (
        <Card style={{ marginBottom: 16, backgroundColor: colors.info, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }]}>
                    <Ionicons name="book" size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.white }]}>Help Center & Docs</Text>
                    <Text style={{ color: colors.white, opacity: 0.9, fontSize: 13, marginTop: 2 }}>
                        How to use WealthSnap & Math
                    </Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.aiButton}
                onPress={onOpenHelp}
            >
                <Ionicons name="school-outline" size={18} color={colors.info} />
                <Text style={[styles.aiButtonText, { color: colors.info }]}>Open Help Center</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.aiButton, { marginTop: 12 }]}
                onPress={onOpenTerms}
            >
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
                <Text style={[styles.aiButtonText, { color: colors.info }]}>Terms of Use & Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.aiButton, { marginTop: 12 }]}
                onPress={onOpenFeedback}
            >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.info} />
                <Text style={[styles.aiButtonText, { color: colors.info }]}>Provide Feedback</Text>
            </TouchableOpacity>
        </Card>
    );
};

const styles = StyleSheet.create({
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    aiButton: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiButtonText: {
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 8,
    },
});

export default HelpSectionCard;
