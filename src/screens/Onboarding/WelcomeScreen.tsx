import React from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components';

const { width } = Dimensions.get('window');

const FeatureItem = ({ icon, text, color }: { icon: string; text: string; color: string }) => (
    <View style={styles.featureItem}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const WelcomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();

    return (
        <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={[styles.heroIconContainer, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                    <MaterialCommunityIcons name="wallet-giftcard" size={64} color={colors.white} />
                </View>

                <Text style={styles.subtitle}>
                    Master your finances with smart insights and secure tracking.
                </Text>

                <View style={styles.featuresContainer}>
                    <FeatureItem icon="chart-timeline-variant" text="Track Expenses" color={colors.white} />
                    <FeatureItem icon="chart-pie" text="In App Insights" color={colors.white} />
                    <FeatureItem icon="shield-check" text="Secure & Private" color={colors.white} />
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Get Started"
                    onPress={() => navigation.navigate('Setup')}
                    variant="outline"
                    style={{ backgroundColor: colors.white, borderWidth: 0, width: '100%' }}
                />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingTop: 60,
    },
    heroIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 26,
    },
    featuresContainer: {
        width: '100%',
        gap: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        borderRadius: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
    }
});

export default WelcomeScreen;
