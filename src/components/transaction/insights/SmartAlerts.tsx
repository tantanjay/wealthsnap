import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '../../common/BottomModal';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { Anomaly } from '../../../utils/financialMetrics';
import { getPermissionStatus, openSettings } from '../../../services/notificationService';

interface SmartAlertsProps {
    anomalies: Anomaly[];
    hasHistory: boolean;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies, hasHistory }) => {
    const { colors } = useTheme();
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
        Alert.alert(
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
                anomalies.map((anomaly, index) => (
                    <Card key={index} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: anomaly.severity === 'HIGH' ? '#F44336' : '#FF9800' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 24, marginRight: 15 }}>📈</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Spending Spike</Text>
                                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{anomaly.message}</Text>
                            </View>
                        </View>
                    </Card>
                ))
            )}

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="About Smart Alerts"
                maxHeight="45%"
            >
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        WealthSnap analyzes your spending patterns to detect unusual activity.
                    </Text>

                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginTop: 5 }}>
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>📈</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Spikes</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    We alert you when a category&apos;s spending is significantly higher than your 3-month average.
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <Text style={{ fontSize: 16, marginRight: 8 }}>🛡️</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Detection</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    Alerts are triggered simply by deviation. They are not judgments, just observations to help you stay aware!
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ height: 20 }} />
                </View>
            </BottomModal>
        </View>
    );
};

export default SmartAlerts;
