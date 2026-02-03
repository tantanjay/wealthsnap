import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface AppearanceCardProps {
    mode: string;
    setMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeOption = ({ icon, title, value, current, setMode, colors }: { icon: string, title: string, value: 'light' | 'dark' | 'system', current: string, setMode: (m: 'light' | 'dark' | 'system') => void, colors: any }) => (
    <TouchableOpacity
        style={[
            styles.themeButton,
            {
                backgroundColor: current === value ? colors.primary : 'transparent',
                borderColor: current === value ? colors.primary : colors.border,
            }
        ]}
        onPress={() => setMode(value)}
    >
        <Ionicons
            name={icon as any}
            size={18}
            color={current === value ? '#fff' : colors.text}
            style={{ marginRight: 6 }}
        />
        <Text style={{
            color: current === value ? '#fff' : colors.text,
            fontWeight: current === value ? '600' : '400'
        }}>
            {title}
        </Text>
    </TouchableOpacity>
);

const AppearanceCard: React.FC<AppearanceCardProps> = ({ mode, setMode }) => {
    const { colors } = useTheme();

    return (
        <Card style={{ marginBottom: 16 }}>
            <View style={styles.cardHeader}>
                <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="color-palette" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
            </View>
            <View style={styles.themeContainer}>
                <ThemeOption icon="sunny" title="Light" value="light" current={mode} setMode={setMode} colors={colors} />
                <ThemeOption icon="moon" title="Dark" value="dark" current={mode} setMode={setMode} colors={colors} />
                <ThemeOption icon="phone-portrait" title="System" value="system" current={mode} setMode={setMode} colors={colors} />
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    themeContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    themeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
    },
});

export default AppearanceCard;
