import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Group, Row, SectionHeader, Tone, toneColor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Anomaly } from '@utils/financialMetrics';
import { getPermissionStatus, openSettings } from '@services/background';
import { type as typeScale, space, layout } from '@styles/theme';

interface SmartAlertsProps {
    anomalies: Anomaly[];
    hasHistory: boolean;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies, hasHistory }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [showInfo, setShowInfo] = useState(false);
    const [hasPermission, setHasPermission] = useState(true);

    const checkPermission = async () => {
        const status = await getPermissionStatus();
        setHasPermission(status === 'granted');
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async permission check on mount; see FIXES.md
        checkPermission();
    }, []);

    const handlePermissionPress = async () => {
        showAlert(
            "Enable Notifications",
            "Turn on notifications to get real-time alerts about spending anomalies.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Settings",
                    onPress: () => openSettings()
                }
            ]
        );
    };

    const getAnomalyConfig = (type: Anomaly['type']): { icon: React.ComponentProps<typeof Ionicons>['name']; tone: Tone; title: string } => {
        switch (type) {
            case 'BUDGET_EXCEEDED':
                return { icon: 'wallet-outline', tone: 'bad', title: 'Budget exceeded' };
            case 'RUNWAY_DROP':
                return { icon: 'trending-down-outline', tone: 'bad', title: 'Runway drop' };
            case 'OUT_OF_CASH':
                return { icon: 'battery-dead-outline', tone: 'bad', title: 'Out of cash' };
            case 'SPIKE':
                return { icon: 'trending-up-outline', tone: 'warning', title: 'Spending spike' };
            case 'NEW_CATEGORY':
                return { icon: 'pricetag-outline', tone: 'neutral', title: 'New category' };
            default:
                return { icon: 'alert-circle-outline', tone: 'neutral', title: 'Alert' };
        }
    };

    return (
        <View>
            <SectionHeader grouped title="Smart alerts" />
            <View style={styles.subline}>
                <Text style={[typeScale.small, styles.flex, { color: ds.text2 }]}>
                    {anomalies.length > 0
                        ? `${anomalies.length} ${anomalies.length === 1 ? 'alert' : 'alerts'} found.`
                        : hasHistory
                            ? "No anomalies detected. Your spending looks normal."
                            : "We are learning your spending patterns. Alerts will appear here soon!"}
                </Text>
                {!hasPermission && (
                    <Pressable onPress={handlePermissionPress} hitSlop={space[2]} accessibilityLabel="Enable notifications">
                        <Ionicons name="warning-outline" size={18} color={ds.warning} />
                    </Pressable>
                )}
                <Pressable onPress={() => setShowInfo(true)} hitSlop={space[2]} accessibilityLabel="How Smart Alerts work">
                    <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>

            {anomalies.length > 0 && (
                <Group style={styles.alerts}>
                    {anomalies.map((anomaly, index) => {
                        const config = getAnomalyConfig(anomaly.type);
                        return (
                            <Row
                                key={index}
                                // Tone-colored icon carries severity, so it stays a bare `leading` icon, not a tile.
                                leading={<Ionicons name={config.icon} size={20} color={toneColor(ds, config.tone)} />}
                                title={config.title}
                                subtitle={anomaly.message}
                                last={index === anomalies.length - 1}
                            />
                        );
                    })}
                </Group>
            )}

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="How Smart Alerts work"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[typeScale.small, styles.intro, { color: ds.text2 }]}>
                        WealthSnap helps you stay on top of your finances by detecting four types of events:
                    </Text>
                    <Group>
                        <Row
                            icon="wallet-outline"
                            title="Budget limit"
                            subtitle="Triggered when your current spending exceeds the monthly budget you set for a category."
                        />
                        <Row
                            icon="trending-up-outline"
                            title="Spending spike"
                            subtitle="Triggered when spending is significantly higher (>50%) than your average monthly spending for that category."
                        />
                        <Row
                            icon="trending-down-outline"
                            title="Runway drop"
                            subtitle="Triggered when your financial runway drops by 25% or more compared to last month (e.g. 8 months → 6 months)."
                        />
                        <Row
                            icon="battery-dead-outline"
                            title="Out of cash"
                            subtitle="Shown every month your tracked cash balance is at or below zero. It replaces Runway Drop while it applies, so you don't get both."
                        />
                        <Row
                            icon="notifications-off-outline"
                            title="Smart suppression"
                            subtitle="To avoid spam, we only send one push notification per category each month, even if multiple alerts are detected."
                            last
                        />
                    </Group>
                </ScrollView>
            </BottomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    subline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    alerts: {
        marginTop: space[2],
    },
    intro: {
        paddingHorizontal: layout.groupPadding,
        marginBottom: space[3],
    },
    flex: {
        flex: 1,
    },
});

export default SmartAlerts;
