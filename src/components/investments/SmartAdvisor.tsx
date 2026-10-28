import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { IconName, Row, SectionHeader, Tone, toneColor } from '@components/ds';
import { Priority } from '@services/domain/smartAdvisorService';
import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';
import { formatCurrencyAmount } from '@utils/currencyUtils';

export interface Suggestion {
    ticker: string;
    reason: string;
    type: 'crash' | 'dip' | 'balance' | 'div';
    price: number;
    hasDivSoon?: boolean;
}

interface SmartAdvisorProps {
    suggestions: Suggestion[];
    onPriorityChange: (priority: Priority) => void;
    activePriority: Priority;
    currency?: string;
    isPrivacyEnabled?: boolean;
}

const PRIORITIES: { label: string; value: Priority }[] = [
    { label: 'All', value: 'all' },
    { label: 'Dividends', value: 'div' },
    { label: 'Dips', value: 'crash' },
    { label: 'Balance', value: 'balance' },
];

const suggestionLook = (item: Suggestion): { icon: IconName; tone: Tone } => {
    if (item.type === 'crash') return { icon: 'flame-outline', tone: 'bad' };
    if (item.type === 'dip') return { icon: 'trending-down-outline', tone: 'warning' };
    if (item.type === 'div' || item.hasDivSoon) return { icon: 'cash-outline', tone: 'good' };
    return { icon: 'scale-outline', tone: 'neutral' };
};

export const SmartAdvisor: React.FC<SmartAdvisorProps> = ({ suggestions, onPriorityChange, activePriority, currency = 'PHP', isPrivacyEnabled = false }) => {
    const { colors, ds } = useTheme();
    const [showInfoModal, setShowInfoModal] = useState(false);

    const cyclePriority = () => {
        const next = PRIORITIES[(PRIORITIES.findIndex(p => p.value === activePriority) + 1) % PRIORITIES.length].value;
        onPriorityChange(next);
    };

    const renderInfoModal = () => (
        <BottomModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="How Smart Alerts Work"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                        Smart Alerts continuously analyze market data and your portfolio to highlight significant market movements.
                    </Text>

                    {/* Visual Examples */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 16 }}>
                        {/* Crash */}
                        <View style={{ width: '48%', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name="flame" size={24} color={colors.error} style={{ marginBottom: 8 }} />
                            <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Significant Drop</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
                                Detected when a stock drops significantly (&gt;15%) from recent highs.
                            </Text>
                        </View>

                        {/* Dip */}
                        <View style={{ width: '48%', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name="trending-down" size={24} color={colors.warning} style={{ marginBottom: 8 }} />
                            <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Recent Dip</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
                                Short-term price drop observed relative to 30-day trends.
                            </Text>
                        </View>

                        {/* Dividends */}
                        <View style={{ width: '48%', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name="cash" size={24} color="#4CAF50" style={{ marginBottom: 8 }} />
                            <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Dividends</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
                                Companies paying out dividends soon. Upcoming payout date detected.
                            </Text>
                        </View>

                        {/* Balance */}
                        <View style={{ width: '48%', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Ionicons name="scale" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
                            <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 4 }}>Rebalancing</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 14 }}>
                                Assets that are underweight in your portfolio target allocation.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Logic Explanation with colorful graphs/visuals representation */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>📊 Detection Logic</Text>

                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
                        {/* 30-Day Peak Graph Representation */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13, flex: 1 }}>30-Day Peak Comparison</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>30D High 🆚 Current</Text>
                            </View>
                            <View style={{ height: 50, backgroundColor: colors.background, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 12, position: 'relative' }}>
                                {/* Simplified visual for price drop */}
                                <View style={{ position: 'absolute', top: 15, left: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary }} />
                                <View style={{ position: 'absolute', top: 15, right: 10, width: '90%', height: 2, backgroundColor: colors.border, borderStyle: 'dashed', borderRadius: 1 }} />

                                <View style={{ position: 'absolute', bottom: 15, right: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                                <Ionicons name="arrow-down" size={16} color={colors.error} style={{ position: 'absolute', right: 32, bottom: 25 }} />
                            </View>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8 }}>
                                We identify the highest price in the last 30 days and compare it to the current price to detect significant drops (&gt;5% or &gt;15%).
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

                        {/* Data Requirement Note */}
                        <View style={{ flexDirection: 'row', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                            <Ionicons name="alert-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 }}>
                                <Text style={{ fontWeight: 'bold' }}>Note:</Text> This feature requires at least <Text style={{ fontWeight: 'bold' }}>30 days of price history</Text> to work accurately.
                            </Text>
                        </View>

                        {/* Alert Hierarchy */}
                        <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.warning }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>🔝 Alert Hierarchy</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
                                In the <Text style={{ fontWeight: 'bold' }}>&quot;All&quot;</Text> view, alerts are ranked by urgency: <Text style={{ fontWeight: 'bold' }}>🔥 Crash</Text> → <Text style={{ fontWeight: 'bold' }}>📅 Dividend</Text> → <Text style={{ fontWeight: 'bold' }}>🔻 Dip</Text> → <Text style={{ fontWeight: 'bold' }}>⚖️ Balance</Text>.
                                {"\n\n"}A <Text style={{ fontWeight: 'bold' }}>⚖️ Balance</Text> note gets merged onto a stock&apos;s existing alert instead of listing it twice (e.g., <Text style={{ fontStyle: 'italic' }}>DIP + BAL</Text>). Crash, Dividend, and Dip alerts each show as their own entry. Specific tabs show all alerts for that category.
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={{ height: 20 }} />
            </ScrollView>
        </BottomModal>
    );

    return (
        <>
            <SectionHeader
                title="Smart advisor"
                actionLabel={`${PRIORITIES.find(p => p.value === activePriority)?.label ?? 'All'} ⌄`}
                onAction={cyclePriority}
            />
            {(!suggestions || suggestions.length === 0) ? (
                <Text style={[type.small, { color: ds.text2, paddingVertical: space[3] }]}>No suggestions for this priority.</Text>
            ) : suggestions.map((item, i) => {
                const { icon, tone } = suggestionLook(item);
                return (
                    <Row
                        key={item.ticker + i}
                        leading={<Ionicons name={icon} size={20} color={toneColor(ds, tone)} />}
                        title={item.ticker}
                        subtitle={`${item.reason}${item.hasDivSoon ? ' · Dividend soon' : ''}`}
                        value={isPrivacyEnabled ? '****' : formatCurrencyAmount(item.price, currency)}
                    />
                );
            })}
            <Row
                icon="information-circle-outline"
                title="How Smart Alerts work"
                chevron
                last
                onPress={() => setShowInfoModal(true)}
            />
            {renderInfoModal()}
        </>
    );
};
