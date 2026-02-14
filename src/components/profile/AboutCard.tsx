import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface AboutCardProps {
    onDevTap: () => void;
    onWhyFree: () => void;
    onDevMessage: () => void;
    onManifesto: () => void;
    onContact: () => void;
    onSupport: () => void;
    version: string;
}

const AboutCard: React.FC<AboutCardProps> = ({
    onDevTap,
    onWhyFree,
    onDevMessage,
    onManifesto,
    onContact,
    onSupport,
    version
}) => {
    const { colors } = useTheme();

    return (
        <Card>
            <TouchableWithoutFeedback onPress={onDevTap}>
                <View style={styles.cardHeader}>
                    <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="information-circle" size={22} color={colors.primary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>About WealthSnap</Text>
                </View>
            </TouchableWithoutFeedback>

            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 15 }}>
                WealthSnap is an offline-first mirror for your standing. It provides a high-resolution reflection of your assets, securely on your device.
            </Text>

            <TouchableOpacity
                onPress={onWhyFree}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
            >
                <Ionicons name="gift-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Why is WealthSnap free?
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onDevMessage}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
            >
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    A Message from the Developer
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onManifesto}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
            >
                <Ionicons name="telescope-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Vision, Philosophy & Goals
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onContact}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
            >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Contact the Developer
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onSupport}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
            >
                <Ionicons name="heart" size={18} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Support the Developer
                </Text>
            </TouchableOpacity>

            <Text style={{ color: colors.gray500, fontSize: 12 }}>
                Version {version}
            </Text>
        </Card>
    );
};

const styles = StyleSheet.create({
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
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
});

export default AboutCard;
