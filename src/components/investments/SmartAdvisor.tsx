import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import { IconName, Row, SectionHeader, Tone, toneColor } from '@components/ds';
import { Priority } from '@services/domain/smartAdvisorService';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
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

const PRIORITIES: { key: Priority; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'div', label: 'Dividends' },
    { key: 'crash', label: 'Dips' },
    { key: 'balance', label: 'Balance' },
];

const suggestionLook = (item: Suggestion): { icon: IconName; tone: Tone } => {
    if (item.type === 'crash') return { icon: 'flame-outline', tone: 'bad' };
    if (item.type === 'dip') return { icon: 'trending-down-outline', tone: 'warning' };
    if (item.type === 'div' || item.hasDivSoon) return { icon: 'cash-outline', tone: 'good' };
    return { icon: 'scale-outline', tone: 'neutral' };
};

// Legend for the info sheet, in the same icon/tone as suggestionLook.
const ALERT_KINDS: { icon: IconName; tone: Tone; title: string; body: string }[] = [
    { icon: 'flame-outline', tone: 'bad', title: 'Significant drop', body: 'Detected when a stock drops significantly (>15%) from recent highs.' },
    { icon: 'trending-down-outline', tone: 'warning', title: 'Recent dip', body: 'Short-term price drop observed relative to 30-day trends.' },
    { icon: 'cash-outline', tone: 'good', title: 'Dividends', body: 'Companies paying out dividends soon. Upcoming payout date detected.' },
    { icon: 'scale-outline', tone: 'neutral', title: 'Rebalancing', body: 'Assets that are underweight in your portfolio target allocation.' },
];

export const SmartAdvisor: React.FC<SmartAdvisorProps> = ({ suggestions, onPriorityChange, activePriority, currency = 'PHP', isPrivacyEnabled = false }) => {
    const { ds } = useTheme();
    const [showInfoModal, setShowInfoModal] = useState(false);


    const renderInfoModal = () => (
        <BottomModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="How Smart Alerts work"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[type.small, { color: ds.text2 }]}>
                    Smart Alerts continuously analyze market data and your portfolio to highlight significant market movements.
                </Text>

                {/* Icons and tones match the alert rows above */}
                {ALERT_KINDS.map((kind, i) => (
                    <Row
                        key={kind.title}
                        leading={<Ionicons name={kind.icon} size={20} color={toneColor(ds, kind.tone)} />}
                        title={kind.title}
                        subtitle={kind.body}
                        last={i === ALERT_KINDS.length - 1}
                    />
                ))}

                <SectionHeader title="Detection logic" />
                <View style={styles.peakHeader}>
                    <Text style={[type.smallStrong, styles.flex, { color: ds.text }]}>30-day peak comparison</Text>
                    <Text style={[type.caption, { color: ds.text2 }]}>30D high vs current</Text>
                </View>
                <View style={[styles.peakChart, { backgroundColor: ds.inset }]}>
                    {/* Simplified visual for a drop from the 30-day high */}
                    <View style={[styles.peakDot, { backgroundColor: ds.text2 }]} />
                    <View style={[styles.peakLine, { backgroundColor: ds.hairline }]} />
                    <View style={[styles.currentDot, { backgroundColor: ds.accent }]} />
                    <Ionicons name="arrow-down" size={16} color={ds.danger} style={styles.dropArrow} />
                </View>
                <Text style={[type.small, styles.peakNote, { color: ds.text2 }]}>
                    We identify the highest price in the last 30 days and compare it to the current price to detect significant drops (&gt;5% or &gt;15%).
                </Text>

                <Disclaimer>
                    This feature requires at least <Text style={type.smallStrong}>30 days of price history</Text> to work accurately.
                </Disclaimer>

                <SectionHeader title="Alert hierarchy" />
                <Text style={[type.small, styles.hierarchy, { color: ds.text2 }]}>
                    In the <Text style={[type.smallStrong, { color: ds.text }]}>All</Text> view, alerts are ranked by urgency: <Text style={[type.smallStrong, { color: ds.text }]}>Crash</Text> → <Text style={[type.smallStrong, { color: ds.text }]}>Dividend</Text> → <Text style={[type.smallStrong, { color: ds.text }]}>Dip</Text> → <Text style={[type.smallStrong, { color: ds.text }]}>Balance</Text>.
                    {"\n\n"}A <Text style={[type.smallStrong, { color: ds.text }]}>Balance</Text> note gets merged onto a stock&apos;s existing alert instead of listing it twice (e.g., DIP + BAL). Crash, Dividend, and Dip alerts each show as their own entry. Specific tabs show all alerts for that category.
                </Text>
            </ScrollView>
        </BottomModal>
    );

    return (
        <>
            <SectionHeader
                title="Smart advisor"
                menu={{ options: PRIORITIES, value: activePriority, onSelect: key => onPriorityChange(key as Priority) }}
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

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    peakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: space[2],
        marginBottom: space[2],
    },
    peakChart: {
        height: 50,
        borderRadius: radius.sm,
    },
    peakDot: {
        position: 'absolute',
        top: 15,
        left: 10,
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    peakLine: {
        position: 'absolute',
        top: 15,
        right: 10,
        width: '90%',
        height: 2,
        borderRadius: 1,
    },
    currentDot: {
        position: 'absolute',
        bottom: 15,
        right: 30,
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    dropArrow: {
        position: 'absolute',
        right: 32,
        bottom: 25,
    },
    peakNote: {
        marginTop: space[2],
    },
    hierarchy: {
        paddingBottom: space[4],
    },
});
