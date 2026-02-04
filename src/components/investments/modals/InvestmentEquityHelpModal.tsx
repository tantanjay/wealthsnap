import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface InvestmentEquityHelpModalProps {
    visible: boolean;
    onClose: () => void;
}

export const InvestmentEquityHelpModal: React.FC<InvestmentEquityHelpModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Understanding Your Equity"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ paddingBottom: 40 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Total Equity represents the current market value of your portfolio holdings.
                    </Text>

                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>
                            "This is the total amount you would have if you sold all your positions today at current market prices."
                        </Text>
                    </View>

                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>This Month's Activity:</Text>
                    <View style={{ marginLeft: 8, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 4 }}>
                            The sub-value shows your <Text style={{ fontWeight: 'bold' }}>Net Invested</Text> amount for the current month.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                            • <Text style={{ fontWeight: 'bold', color: colors.success }}>Positive (+)</Text>: You put more money in (Buys + Fees).
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            • <Text style={{ fontWeight: 'bold', color: colors.error }}>Negative (-)</Text>: You took money out (Sells - Fees).
                        </Text>
                    </View>

                    <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                            <Text style={{ fontWeight: 'bold' }}>Total Equity:</Text> Shares Owned × Current Market Price
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            <Text style={{ fontWeight: 'bold' }}>This Month:</Text> Total Buys (incl. fees) - Total Sells (less fees)
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </BottomModal>
    );
};
