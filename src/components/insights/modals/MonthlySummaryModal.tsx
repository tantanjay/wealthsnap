import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { type, space, radius, layout } from '@styles/theme';
import { getAllMonthlySummaries, syncMonthlySummaries, MonthlySummaryRow } from '@services/domain/monthlySummaryService';

interface MonthlySummaryModalProps {
    visible: boolean;
    onClose: () => void;
}

const formatMonthLabel = (yearMonth: string): string => {
    const [y, m] = yearMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
};

const MonthlySummaryModal: React.FC<MonthlySummaryModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();
    // The recap is free text full of amounts, so it can't be masked: Discreet and Hidden withhold it.
    const { isPrivacyEnabled } = usePrivacy();
    const [summaries, setSummaries] = useState<MonthlySummaryRow[]>([]);
    const [selectedYearMonth, setSelectedYearMonth] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [reprocessing, setReprocessing] = useState(false);

    const loadSummaries = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await getAllMonthlySummaries();
            setSummaries(rows);
            setSelectedYearMonth(prev =>
                prev && rows.some(r => r.yearMonth === prev) ? prev : rows[rows.length - 1]?.yearMonth ?? null
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load on open; see FIXES.md
        if (visible) loadSummaries();
    }, [visible, loadSummaries]);

    const handleReprocess = async () => {
        setReprocessing(true);
        try {
            await syncMonthlySummaries({ force: true });
            await loadSummaries();
        } finally {
            setReprocessing(false);
        }
    };

    const selected = summaries.find(s => s.yearMonth === selectedYearMonth) ?? null;

    const footer = loading ? undefined : (
        <Pressable
            onPress={handleReprocess}
            disabled={reprocessing}
            style={[styles.button, { backgroundColor: ds.accent, opacity: reprocessing ? 0.6 : 1 }]}
            accessibilityRole="button"
        >
            {reprocessing
                ? <ActivityIndicator color={ds.onAccent} />
                : <Text style={[type.bodyStrong, { color: ds.onAccent }]}>
                    {summaries.length === 0 ? 'Generate summaries' : 'Reprocess all months'}
                </Text>}
        </Pressable>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Monthly summary"
            maxHeight="85%"
            style={{ height: '85%' }}
            contentStyle={{ flex: 1 }}
            footer={footer}
        >
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={ds.accent} />
                </View>
            ) : summaries.length === 0 ? (
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        No summary data yet. Add some transactions, then reprocess.
                    </Text>
                </Group>
            ) : (
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chips}
                        contentContainerStyle={styles.chipsContent}
                    >
                        {[...summaries].reverse().map(s => {
                            const isSelected = s.yearMonth === selectedYearMonth;
                            return (
                                <Pressable
                                    key={s.yearMonth}
                                    onPress={() => setSelectedYearMonth(s.yearMonth)}
                                    style={[styles.chip, isSelected && { backgroundColor: ds.group }]}
                                >
                                    <Text style={[type.smallMedium, { color: isSelected ? ds.text : ds.text2 }]}>
                                        {formatMonthLabel(s.yearMonth)}
                                    </Text>
                                    {!s.isFinal && <View style={[styles.dot, { backgroundColor: ds.text2 }]} />}
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {selected && (
                            <>
                                {!selected.isFinal && (
                                    <Text style={[type.small, styles.note, { color: ds.text2 }]}>
                                        In progress: this month is still being tracked
                                    </Text>
                                )}
                                <Group padded>
                                    {isPrivacyEnabled ? (
                                        <Text style={[type.small, { color: ds.text2 }]}>
                                            Hidden while privacy is on. Switch to Open in Home settings to read this summary.
                                        </Text>
                                    ) : (
                                        <Text selectable style={[type.smallNum, { color: ds.text }]}>
                                            {selected.summaryText}
                                        </Text>
                                    )}
                                </Group>
                                <Text style={[type.caption, styles.generated, { color: ds.text2 }]}>
                                    Last generated {new Date(selected.updatedAt).toLocaleString()}
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </>
            )}
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    loading: {
        paddingVertical: space[7],
        alignItems: 'center',
    },
    chips: {
        flexGrow: 0,
        marginBottom: space[3],
    },
    chipsContent: {
        gap: space[1],
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: radius.full,
    },
    note: {
        marginBottom: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    generated: {
        marginTop: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default MonthlySummaryModal;
