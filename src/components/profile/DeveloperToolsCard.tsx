import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface DeveloperToolsCardProps {
    onShareLogs: () => void;
    onSimulateCrash: () => void;
    onRunAutoBackup: () => void;
    isRunningAutoBackup?: boolean;
}

const DeveloperToolsCard: React.FC<DeveloperToolsCardProps> = ({ onShareLogs, onSimulateCrash, onRunAutoBackup, isRunningAutoBackup }) => {
    const { colors } = useTheme();

    return (
        <Card style={{ marginBottom: 16 }}>
            <View style={styles.cardHeader}>
                <View style={[styles.headerIcon, { backgroundColor: colors.error + '20' }]}>
                    <Ionicons name="bug" size={22} color={colors.error} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Developer Options</Text>
            </View>

            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
                onPress={onShareLogs}
            >
                <Ionicons name="share-social-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Share Crash Log
                </Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 15 }} />

            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
                onPress={onRunAutoBackup}
                disabled={isRunningAutoBackup}
            >
                {isRunningAutoBackup ? (
                    <ActivityIndicator size="small" color={colors.text} />
                ) : (
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.text} />
                )}
                <Text style={{ color: colors.text, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    {isRunningAutoBackup ? 'Running Auto Backup…' : 'Run Auto Backup Now'}
                </Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 15 }} />

            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}
                onPress={onSimulateCrash}
            >
                <Ionicons name="warning" size={18} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 14, marginLeft: 6, fontWeight: '600' }}>
                    Simulate Crash
                </Text>
            </TouchableOpacity>
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
});

export default DeveloperToolsCard;
