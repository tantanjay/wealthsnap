import React, { useState, useEffect } from 'react';
import BigNumber from 'bignumber.js';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { AIUsageLog } from '@types';
import { getAIUsageLogs } from '@services/domain';
import { SPACING, FONT_SIZES } from '@styles/theme';

interface GeminiUsageModalProps {
    visible: boolean;
    onClose: () => void;
}

const GeminiUsageModal: React.FC<GeminiUsageModalProps> = ({ visible, onClose }) => {
    const { colors, mode } = useTheme();
    const systemScheme = useColorScheme();
    const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

    const COLORS = {
        success: '#34C759',
        error: '#FF3B30'
    };

    const [logs, setLogs] = useState<AIUsageLog[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalCost, setTotalCost] = useState(new BigNumber(0));

    const loadLogs = async () => {
        const data = await getAIUsageLogs();
        // Sort newest first
        const sorted = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(sorted);
        const total = sorted.reduce((acc, log) => {
            const cost = new BigNumber(log.costUSD || 0);
            return acc.plus(cost);
        }, new BigNumber(0));
        setTotalCost(total);
        setRefreshing(false);
    };

    useEffect(() => {
        if (visible) {
            loadLogs();
        }
    }, [visible]);

    const onRefresh = () => {
        setRefreshing(true);
        loadLogs();
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            maxHeight="85%"
            style={{ height: '85%' }}
            contentStyle={{ flex: 1 }}
        >
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>API Usage History</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Total Est. Cost: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>${totalCost.toFixed(4)}</Text>
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, marginTop: -10, marginBottom: 10, alignItems: 'center' }}>
                <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
                    <Text style={{ fontWeight: 'bold' }}>Note:</Text> Costs shown are internal estimates for tracking purposes. Actual billing is subject to your dashboard.
                </Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={[styles.tableHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.hCol1, { color: colors.textSecondary }]}>Type/Time</Text>
                    <Text style={[styles.hCol2, { color: colors.textSecondary }]}>Tokens (In/Out)</Text>
                    <Text style={[styles.hCol3, { color: colors.textSecondary }]}>Cost</Text>
                </View>

                {logs.map((log) => (
                    <View key={log.id} style={[
                        styles.row,
                        { borderBottomColor: colors.border },
                        log.status === 'error' && { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.05)' }
                    ]}>
                        <View style={styles.col1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons
                                    name={log.status === 'error' ? "alert-circle" : "checkmark-circle"}
                                    size={16}
                                    color={log.status === 'error' ? COLORS.error : COLORS.success}
                                    style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.endpoint, { color: colors.text }]}>
                                    {log.endpoint.replace('analyze', '').replace('Screenshot', '').replace('Image', '').replace('generate', '')}
                                </Text>
                            </View>
                            {log.model && (
                                <Text style={{ fontSize: 10, color: colors.primary, marginBottom: 2 }}>
                                    {log.model}
                                </Text>
                            )}
                            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                                {new Date(log.timestamp).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })} ({(log.durationMs / 1000).toFixed(2)}s)
                            </Text>
                        </View>
                        <View style={styles.col2}>
                            <Text style={[styles.tokens, { color: colors.text }]}>
                                In: {log.inputTokens} {log.imageCount > 0 ? `(${log.imageCount} img)` : ''}
                            </Text>
                            <Text style={[styles.tokens, { color: colors.textSecondary }]}>
                                Out: {log.outputTokens}
                            </Text>
                        </View>
                        <View style={styles.col3}>
                            <Text style={[styles.cost, { color: colors.text }]}>${log.costUSD.toFixed(5)}</Text>
                        </View>
                    </View>
                ))}

                {logs.length === 0 && (
                    <View style={styles.empty}>
                        <Text style={{ color: colors.textSecondary }}>No usage logs yet.</Text>
                    </View>
                )}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZES.lg,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: FONT_SIZES.sm,
        marginTop: 4,
    },
    disclaimer: {
        fontSize: 11,
        marginTop: 6,
        fontStyle: 'italic',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: SPACING.xl,
    },
    tableHeader: {
        flexDirection: 'row',
        padding: SPACING.sm,
        borderBottomWidth: 1,
        marginBottom: SPACING.xs,
    },
    hCol1: { flex: 2, fontSize: 12, fontWeight: 'bold' },
    hCol2: { flex: 2, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    hCol3: { flex: 1, fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
    row: {
        flexDirection: 'row',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    col1: { flex: 2 },
    col2: { flex: 2, alignItems: 'center' },
    col3: { flex: 1, alignItems: 'flex-end' },
    endpoint: {
        fontSize: 14,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 10,
    },
    tokens: {
        fontSize: 12,
    },
    cost: {
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    empty: {
        padding: SPACING.xl,
        alignItems: 'center',
    }
});

export default GeminiUsageModal;
