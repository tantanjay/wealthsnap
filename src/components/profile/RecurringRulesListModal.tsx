import React, { useMemo } from 'react';
import { View, Text, Pressable, Switch, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { type, space } from '@styles/theme';
import { RecurrenceRule } from '@types';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EmptyState } from '@components/common/EmptyState';

interface RecurringRulesListModalProps {
    visible: boolean;
    onClose: () => void;
    rules: RecurrenceRule[];
    onToggleRule: (rule: RecurrenceRule) => void;
    onDeleteRule: (id: string) => void;
    currency: string;
}

export const RecurringRulesListModal: React.FC<RecurringRulesListModalProps> = ({
    visible,
    onClose,
    rules,
    onToggleRule,
    onDeleteRule,
    currency
}) => {
    const { ds } = useTheme();
    // No Discreet version: Discreet falls back to Hidden.
    const { isPrivacyEnabled } = usePrivacy();

    const sortedRules = useMemo(() => {
        return [...rules].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    }, [rules]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Recurring transactions"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[type.smallStrong, styles.heading, { color: ds.text }]}>
                    Your recurring expenses ({sortedRules.length})
                </Text>

                {sortedRules.length === 0 ? (
                    <EmptyState size="compact" icon="repeat-outline" title="No recurring rules found." />
                ) : (
                    sortedRules.map((item, i) => {
                        const nextDue = new Date(item.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                        return (
                            <Row
                                key={item.id}
                                icon="repeat-outline"
                                title={item.name || item.transactionTemplate.category}
                                subtitle={`${item.frequency} · Next due ${nextDue}`}
                                value={isPrivacyEnabled ? '****' : formatCurrencyAmount(item.transactionTemplate.amount, currency)}
                                valueTone={item.transactionTemplate.type === 'EXPENSE' ? 'bad' : 'good'}
                                change={item.isActive ? 'Active' : 'Paused'}
                                last={i === sortedRules.length - 1}
                                trailing={
                                    <View style={styles.actions}>
                                        <Switch
                                            value={item.isActive}
                                            onValueChange={() => onToggleRule(item)}
                                            trackColor={{ false: ds.hairline, true: ds.accentSoft }}
                                            thumbColor={item.isActive ? ds.accent : ds.text3}
                                        />
                                        <Pressable
                                            onPress={() => onDeleteRule(item.id)}
                                            hitSlop={space[2]}
                                            accessibilityLabel="Delete recurring rule"
                                        >
                                            <Ionicons name="trash-outline" size={20} color={ds.danger} />
                                        </Pressable>
                                    </View>
                                }
                            />
                        );
                    })
                )}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    heading: {
        marginBottom: space[1],
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
});
