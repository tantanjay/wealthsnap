import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import SettingItem from '@components/common/SettingItem';
import { useTheme } from '@context/ThemeContext';

interface QuickActionsCardProps {
    onAssetsPress: () => void;
    onRecurringPress: () => void;
    onBudgetPress: () => void;
    onRemindersPress: () => void;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
    onAssetsPress,
    onRecurringPress,
    onBudgetPress,
    onRemindersPress
}) => {
    const { colors } = useTheme();

    return (
        <Card style={{ marginBottom: 16 }}>
            <View style={styles.cardHeader}>
                <View style={[styles.headerIcon, { backgroundColor: colors.accent + '20' }]}>
                    <Ionicons name="wallet" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Financial Planning</Text>
            </View>
            <SettingItem
                icon="list"
                title="Asset Dictionary"
                subtitle="Manage asset definitions"
                onPress={onAssetsPress}
                iconBg={colors.info + '20'}
                iconColor={colors.info}
                isLast={false}
            />
            <SettingItem
                icon="repeat"
                title="Recurring Transactions"
                subtitle="Manage automatic entries"
                onPress={onRecurringPress}
                iconBg={colors.success + '20'}
                iconColor={colors.success}
                isLast={false}
            />
            <SettingItem
                icon="calculator"
                title="Budget Management"
                subtitle="Set spending limits"
                onPress={onBudgetPress}
                iconBg={colors.warning + '20'}
                iconColor={colors.warning}
                isLast={false}
            />
            <SettingItem
                icon="notifications-outline"
                title="Reminders"
                subtitle="Schedule alerts for tasks"
                onPress={onRemindersPress}
                iconBg={colors.primary + '20'}
                iconColor={colors.primary}
                isLast={true}
            />
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

export default QuickActionsCard;
