import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Card } from '@components/index';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Anomaly } from '@utils/financialMetrics';
import { getPermissionStatus, openSettings } from '@services/background';
import { type as typeScale } from '@styles/theme';

interface SmartAlertsProps {
    anomalies: Anomaly[];
    hasHistory: boolean;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies, hasHistory }) => {
    const { colors, ds } = useTheme();
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

    const getAnomalyConfig = (type: Anomaly['type']) => {
        switch (type) {
            case 'BUDGET_EXCEEDED':
                return {
                    icon: 'wallet-outline' as const,
                    color: '#F44336', // Red
                    title: 'Budget Exceeded'
                };
            case 'RUNWAY_DROP':
                return {
                    icon: 'trending-down-outline' as const,
                    color: '#F44336', // Red
                    title: 'Runway Drop'
                };
            case 'OUT_OF_CASH':
                return {
                    icon: 'battery-dead-outline' as const,
                    color: '#F44336', // Red
                    title: 'Out of Cash'
                };
            case 'SPIKE':
                return {
                    icon: 'trending-up-outline' as const,
                    color: '#FF9800', // Orange
                    title: 'Spending Spike'
                };
            case 'NEW_CATEGORY':
                return {
                    icon: 'pricetag-outline' as const,
                    color: '#2196F3', // Blue
                    title: 'New Category'
                };
            default:
                return {
                    icon: 'alert-circle-outline' as const,
                    color: colors.textSecondary,
                    title: 'Alert'
                };
        }
    };

    return (
        <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Smart Alerts</Text>

                <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {!hasPermission && (
                    <TouchableOpacity
                        onPress={handlePermissionPress}
                        style={{ marginLeft: 12 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="warning-outline" size={20} color={colors.warning || '#FF9800'} />
                    </TouchableOpacity>
                )}
            </View>

            {anomalies.length === 0 ? (
                <Card>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 10 }}>
                        {hasHistory
                            ? "No anomalies detected. Your spending looks normal."
                            : "We are learning your spending patterns. Alerts will appear here soon!"}
                    </Text>
                </Card>
            ) : (
                anomalies.map((anomaly, index) => {
                    const config = getAnomalyConfig(anomaly.type);
                    return (
                        <Card key={index} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: config.color }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: config.color + '15', // 15% opacity hex
                                    alignItems: 'center', justifyContent: 'center', marginRight: 15
                                }}>
                                    <Ionicons name={config.icon} size={24} color={config.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{config.title}</Text>
                                    <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{anomaly.message}</Text>
                                </View>
                            </View>
                        </Card>
                    );
                })
            )}

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="How Smart Alerts work"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[typeScale.small, { color: ds.text2 }]}>
                        WealthSnap helps you stay on top of your finances by detecting four types of events:
                    </Text>
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
                </ScrollView>
            </BottomModal>
        </View>
    );
};

export default SmartAlerts;
