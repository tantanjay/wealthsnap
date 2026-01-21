import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '../../common/BottomModal';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { Anomaly } from '../../../utils/financialMetrics';

interface SmartAlertsProps {
    anomalies: Anomaly[];
    hasHistory: boolean;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies, hasHistory }) => {
    const { colors } = useTheme();
    const [showInfo, setShowInfo] = React.useState(false);

    // imports need to be added at top of file, but for this replacement we focus on the component body.
    // Wait, I need to make sure imports are handled. I will handle imports in a separate call if needed or assume I can do it in one go if I replace the whole file? 
    // No, better to do valid replaces. 
    // Let's replace the whole component body.

    return (
        <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Smart Alerts</Text>
                <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
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
                                    We alert you when a category's spending is significantly higher than your 3-month average.
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
                </View>
            </BottomModal>
        </View>
    );
};

export default SmartAlerts;
