import React from 'react';
import { Text } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components';

const WelcomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    return (
        <ScreenWrapper style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 10 }}>WealthSnap</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 40, textAlign: 'center' }}>
                Track your income, expenses, and investments securely.
            </Text>
            <Button title="Get Started" onPress={() => navigation.navigate('Setup')} style={{ width: '100%' }} />
        </ScreenWrapper>
    );
};
export default WelcomeScreen;
