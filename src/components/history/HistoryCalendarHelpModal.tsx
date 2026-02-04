import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface HistoryCalendarHelpModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HistoryCalendarHelpModal: React.FC<HistoryCalendarHelpModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Understanding Your Calendar"
            maxHeight="80%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Guilt Filter */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        🌡️ Guilt Filter (Heatmap)
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                        Spot your <Text style={{ fontWeight: 'bold' }}>discretionary</Text> spending habits at a glance.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>Light Red</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Small treat ☕</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.4)', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Bright Red</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Big splurge 🛍️</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 10, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            <Ionicons name="bulb-outline" size={12} color={colors.primary} /> <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Recurring bills like Rent don&apos;t trigger the red heat, so you only feel &quot;guilty&quot; about things you can control!
                        </Text>
                    </View>
                </View>

                {/* Ghost Forecast */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        👻 Ghost Forecast
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                        See the future before it happens.
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}>
                        <View style={{ marginRight: 12, gap: 4 }}>
                            <View style={{ backgroundColor: colors.success, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>+$2k</Text>
                            </View>
                            <View style={{ backgroundColor: '#F44336', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>-$500</Text>
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Future Badges</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                Green for upcoming Income, Red for Bills.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Investment Indicators */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        📈 Investments
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                        Track your Buy and Sell signals directly on the calendar.
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12 }}>
                        <View style={{ marginRight: 16, gap: 8 }}>
                            <Ionicons name="caret-up" size={20} color={colors.primary} />
                            <Ionicons name="caret-down" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                <Text style={{ fontWeight: 'bold', color: colors.primary }}>Buy</Text> - You <Text style={{ fontWeight: 'bold', color: colors.success }}>▲ bought</Text> an asset.
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                <Text style={{ fontWeight: 'bold', color: colors.primary }}>Sell</Text> - <Text style={{ fontWeight: 'bold', color: '#FFD700' }}>▼ Gold</Text> means Profit, <Text style={{ fontWeight: 'bold', color: colors.error }}>▼ Red</Text> means Loss.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Connecting the Dots */}
                <View style={{ marginBottom: 24, backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                        🧠 Connecting the Dots
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                        This view brings together your <Text style={{ color: colors.error }}>Red Spending Days</Text>, <Text style={{ color: colors.text }}>Recurring Bill commitments</Text>, and <Text style={{ color: '#8E24AA' }}>Investment Moves</Text> to help you answer the big questions:
                    </Text>
                    <View style={{ gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontStyle: 'italic' }}>
                            “Did I sell because I needed cash?”
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 14, fontStyle: 'italic' }}>
                            “How do my daily habits impact my long-term equity?”
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 14, fontStyle: 'italic' }}>
                            “Why does this month feel chaotic?”
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </BottomModal>
    );
};
