import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
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
    const { colors } = useTheme();
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

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Monthly Summary"
            maxHeight="85%"
            style={{ height: '85%' }}
            contentStyle={{ flex: 1 }}
        >
            {loading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : summaries.length === 0 ? (
                <View style={{ paddingVertical: 20 }}>
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginBottom: 16 }}>
                        No summary data yet. Add some transactions, then reprocess.
                    </Text>
                    <Button title="Generate Summaries" onPress={handleReprocess} loading={reprocessing} />
                </View>
            ) : (
                <>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexGrow: 0, marginBottom: 12 }}
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {[...summaries].reverse().map(s => {
                            const isSelected = s.yearMonth === selectedYearMonth;
                            return (
                                <TouchableOpacity
                                    key={s.yearMonth}
                                    onPress={() => setSelectedYearMonth(s.yearMonth)}
                                    style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 14,
                                        borderRadius: 16,
                                        backgroundColor: isSelected ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Text style={{ color: isSelected ? colors.textLight : colors.text, fontWeight: '600', fontSize: 13 }}>
                                        {formatMonthLabel(s.yearMonth)}
                                    </Text>
                                    {!s.isFinal && (
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? colors.textLight : colors.accent }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {selected && (
                            <>
                                {!selected.isFinal && (
                                    <Text style={{ color: colors.accent, fontSize: 12, marginBottom: 8 }}>
                                        In progress - this month is still being tracked
                                    </Text>
                                )}
                                <View style={{
                                    backgroundColor: colors.surface,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    padding: 14,
                                    marginBottom: 16
                                }}>
                                    <Text
                                        selectable
                                        style={{
                                            color: colors.text,
                                            fontSize: 13,
                                            lineHeight: 20,
                                            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
                                        }}
                                    >
                                        {selected.summaryText}
                                    </Text>
                                </View>
                                <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 16 }}>
                                    Last generated {new Date(selected.updatedAt).toLocaleString()}
                                </Text>
                            </>
                        )}

                        <Button
                            title={reprocessing ? 'Reprocessing...' : 'Reprocess All Months'}
                            variant="outline"
                            onPress={handleReprocess}
                            loading={reprocessing}
                            icon="refresh-outline"
                        />
                    </ScrollView>
                </>
            )}
        </BottomModal>
    );
};

export default MonthlySummaryModal;
