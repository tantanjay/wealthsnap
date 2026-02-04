import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface HistorySafeToSpendHelpModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HistorySafeToSpendHelpModal: React.FC<HistorySafeToSpendHelpModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Understanding Your Stats"
            maxHeight="80%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
                    We calculate your <Text style={{ fontWeight: 'bold' }}>True Discretionary Income</Text> to help you avoid spending money you may need later.
                </Text>

                <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 16, gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text }}>1. Total Inflow</Text>
                        <Text style={{ color: colors.success, fontWeight: 'bold' }}>Income + Future Paychecks</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: -8 }}>
                        Includes money earned + recurring income expected before period end.
                    </Text>

                    <View style={{ height: 1, backgroundColor: colors.text + '10' }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text }}>2. Minus Outflows</Text>
                        <Text style={{ color: colors.error, fontWeight: 'bold' }}>Spent + Transfers Out</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: -8 }}>
                        Money already spent or moved to savings/investments.
                    </Text>

                    <View style={{ height: 1, backgroundColor: colors.text + '10' }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text }}>3. Minus Future Bills</Text>
                        <Text style={{ color: colors.error, fontWeight: 'bold' }}>Recurring Bills</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: -8 }}>
                        Rent, subscriptions, and bills due before period end.
                    </Text>

                    <View style={{ height: 1, backgroundColor: colors.text + '10' }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text }}>4. Living Costs</Text>
                        <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>Life Burnrate</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: -8 }}>
                        Estimated daily cost for food/transport based on your last 90 days (3 months).
                    </Text>
                    <View style={{ marginTop: 6, backgroundColor: '#FFF3E0', padding: 8, borderRadius: 8 }}>
                        <Text style={{ color: '#E65100', fontSize: 11, fontStyle: 'italic' }}>
                            <Text style={{ fontWeight: 'bold' }}>💡 Aha Moment:</Text> Buying a $900 phone increases your burn rate by $10/day for 3 months. This helps you &apos;feel&apos; the purchase!
                        </Text>
                    </View>

                    <View style={{ height: 2, backgroundColor: colors.text + '30', marginVertical: 4 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>= Safe To Spend</Text>
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 18 }}>Guilt-Free Money</Text>
                    </View>
                </View>

                <Text style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    textAlign: 'center',
                    marginTop: 16,
                    marginBottom: 20
                }}>
                    Estimates only. Actual spending capacity may vary based on timing and real expenses.
                </Text>
            </ScrollView>
        </BottomModal>
    );
};
