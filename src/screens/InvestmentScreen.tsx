import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const InvestmentScreen = () => {
    const { colors } = useTheme();

    return (
        <ScreenWrapper>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                <View style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.primary + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24
                }}>
                    <Ionicons name="trending-up" size={48} color={colors.primary} />
                </View>

                <Text style={{
                    color: colors.text,
                    fontSize: 24,
                    fontWeight: 'bold',
                    marginBottom: 12,
                    textAlign: 'center'
                }}>
                    Investments Coming Soon
                </Text>

                <Text style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    textAlign: 'center',
                    lineHeight: 24,
                    maxWidth: 300
                }}>
                    We&apos;re working on building a powerful portfolio tracker for your stocks, crypto, and assets. Stay tuned!
                </Text>
            </View>
        </ScreenWrapper>
    );
};

export default InvestmentScreen;
