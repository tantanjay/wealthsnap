import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Anomaly } from '@utils/financialMetrics';
import { getPermissionStatus, openSettings } from '@services/background';

interface SmartAlertsProps {
    anomalies: Anomaly[];
    hasHistory: boolean;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies, hasHistory }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [showInfo, setShowInfo] = useState(false);
    const [hasPermission, setHasPermission] = useState(true);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        const status = await getPermissionStatus();
        setHasPermission(status === 'granted');
    };

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
                title="About Smart Alerts"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View>
                        <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                            WealthSnap helps you stay on top of your finances by detecting two types of events:
                        </Text>

                        <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginTop: 5 }}>
                            {/* Budget Exceeded */}
                            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                    <Ionicons name="wallet-outline" size={24} color="#F44336" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }}>Budget Limit</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                                        Triggered when your current spending exceeds the monthly budget you set for a category.
                                    </Text>
                                </View>
                            </View>

                            {/* Spending Spike */}
                            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                    <Ionicons name="trending-up-outline" size={24} color="#FF9800" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }}>Spending Spike</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                                        Triggered when spending is significantly higher (&gt;50%) than your average monthly spending for that category.
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row' }}>
                                <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                    <Ionicons name="notifications-off-outline" size={24} color={colors.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }}>Smart Suppression</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                                        To avoid spam, we only send one push notification per category each month, even if multiple alerts are detected.
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={{ height: 20 }} />
                    </View>
                </ScrollView>
            </BottomModal>
        </View>
    );
};

export default SmartAlerts;
