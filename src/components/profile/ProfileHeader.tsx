import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@context/ThemeContext';

const ProfileHeader: React.FC = () => {
    const { colors } = useTheme();

    return (
        <View style={{ marginBottom: 20, marginTop: 10 }}>
            <Text style={{ color: colors.textSecondary }}>Settings & Preferences</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: 'bold' }}>Profile</Text>
        </View>
    );
};

export default ProfileHeader;
