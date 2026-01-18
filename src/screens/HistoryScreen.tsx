import React from 'react';
import { Text } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const HistoryScreen = () => {
    const { colors } = useTheme();
    return (
        <ScreenWrapper>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>History</Text>
            <Text style={{ color: colors.textSecondary }}>Transaction List</Text>
        </ScreenWrapper>
    );
};
export default HistoryScreen;
