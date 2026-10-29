import React, { useState, useEffect } from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import { Group, Hero, Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { AIUsageLog } from '@types';
import { getAIUsageLogs } from '@services/domain/logService';
import { type, space } from '@styles/theme';

interface GeminiUsageModalProps {
    visible: boolean;
    onClose: () => void;
}

const GeminiUsageModal: React.FC<GeminiUsageModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();

    const [logs, setLogs] = useState<AIUsageLog[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalCost, setTotalCost] = useState(new BigNumber(0));

    const loadLogs = async () => {
        const data = await getAIUsageLogs();
        // Sort newest first
        const sorted = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(sorted);
        const total = sorted.reduce((acc, log) => {
            const rawCost = log.costUSD ?? 0;
            const cost = new BigNumber(rawCost);
            if (cost.isNaN()) {
                console.warn(`Invalid cost skipped: ${rawCost}`);
                return acc;
            }
            return acc.plus(cost);
        }, new BigNumber(0));
        setTotalCost(total);
        setRefreshing(false);
    };

    useEffect(() => {
        if (visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load on open; see FIXES.md
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
            <Hero label="API usage · total est. cost" value={`$${totalCost.toFixed(4)}`} panel />

            <Disclaimer style={styles.disclaimer}>
                Costs shown are internal estimates for tracking purposes. Actual billing is subject to your dashboard.
            </Disclaimer>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ds.accent} />}
            >
                {logs.length > 0 && (
                    <Group>
                        {logs.map((log, i) => {
                            const isError = log.status === 'error';
                            const time = new Date(log.timestamp).toLocaleString(undefined, {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            });
                            return (
                                <Row
                                    key={log.id}
                                    leading={
                                        <Ionicons
                                            name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                                            size={20}
                                            color={isError ? ds.danger : ds.success}
                                        />
                                    }
                                    title={log.endpoint.replace('analyze', '').replace('Screenshot', '').replace('Image', '').replace('generate', '')}
                                    subtitle={[log.model, `${time} (${(log.durationMs / 1000).toFixed(2)}s)`].filter(Boolean).join(' · ')}
                                    value={`$${new BigNumber(log.costUSD || 0).toFixed(5)}`}
                                    change={`In ${log.inputTokens}${log.imageCount > 0 ? ` (${log.imageCount} img)` : ''} · Out ${log.outputTokens}`}
                                    last={i === logs.length - 1}
                                />
                            );
                        })}
                    </Group>
                )}

                {logs.length === 0 && (
                    <Group padded style={styles.empty}>
                        <Text style={[type.small, { color: ds.text2 }]}>No usage logs yet.</Text>
                    </Group>
                )}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    disclaimer: {
        marginTop: space[4],
        marginBottom: space[2],
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: space[6],
    },
    empty: {
        alignItems: 'center',
    }
});

export default GeminiUsageModal;
