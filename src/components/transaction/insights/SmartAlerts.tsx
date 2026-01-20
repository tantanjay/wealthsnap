import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { Anomaly } from '../../../utils/financialMetrics';

interface SmartAlertsProps {
    anomalies: Anomaly[];
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ anomalies }) => {
    const { colors } = useTheme();

    if (anomalies.length === 0) {
        return (
            <View style={{ marginTop: 20 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Smart Alerts</Text>
                <Card>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 10 }}>No anomalies detected. Your spending looks normal.</Text>
                </Card>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 20 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Smart Alerts</Text>
            {anomalies.map((anomaly, index) => (
                <Card key={index} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: anomaly.severity === 'HIGH' ? '#F44336' : '#FF9800' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, marginRight: 15 }}>📈</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Spending Spike</Text>
                            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{anomaly.message}</Text>
                        </View>
                    </View>
                </Card>
            ))}
        </View>
    );
};

export default SmartAlerts;
