import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { Disclaimer } from '@components/common/Disclaimer';
import { Group, IconName, Row, Sheet } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { getDividendListRanges } from '@services/domain/marketDataService';
import { type, space, layout } from '@styles/theme';

export type FetchListKind = 'price' | 'dividend';

// Labels marketDataService expects for prices ("Today", "Last 3 days", "Last 7 days").
const PRICE_DURATIONS = ['Today', 'Last 3 days', 'Last 7 days'];

const COPY: Record<FetchListKind, { title: string; helper: string; notice: string; icon: IconName }> = {
    price: {
        title: 'Fetch price list',
        helper: 'How far back to fetch prices for all your stocks and crypto.',
        notice: 'AI-fetched prices are estimates and may differ from official records.',
        icon: 'cloud-download-outline',
    },
    dividend: {
        title: 'Fetch dividend list',
        helper: 'How far back to fetch dividends for all your stocks.',
        notice: 'AI-fetched dividends may be missing or differ from official announcements.',
        icon: 'cash-outline',
    },
};

interface FetchListSheetProps {
    // Which list is open; null when closed. Kept while closing so the content doesn't blank out.
    kind: FetchListKind | null;
    onClose: () => void;
    onFetchPrices: (duration: string) => void;
    onFetchDividends: (range: { label: string; year: number }) => void;
}

// Holdings → Fetch price list / Fetch dividend list: pick how far back to fetch AI data for every holding.
const FetchListSheet: React.FC<FetchListSheetProps> = ({ kind, onClose, onFetchPrices, onFetchDividends }) => {
    const { ds } = useTheme();
    const [shown, setShown] = React.useState<FetchListKind>('price');
    if (kind && kind !== shown) setShown(kind);
    const copy = COPY[shown];

    const options = shown === 'price'
        ? PRICE_DURATIONS.map(d => ({ label: d, run: () => onFetchPrices(d) }))
        : getDividendListRanges().map(r => ({ label: r.label, run: () => onFetchDividends(r) }));

    return (
        <Sheet visible={kind !== null} onClose={onClose} title={copy.title}>
            <Disclaimer severity="warning" style={styles.notice}>
                {copy.notice}
            </Disclaimer>
            <Text style={[type.small, styles.helper, { color: ds.text2 }]}>{copy.helper}</Text>
            <Group>
                {options.map((option, i) => (
                    <Row
                        key={option.label}
                        icon={copy.icon}
                        title={option.label}
                        onPress={() => {
                            onClose();
                            option.run();
                        }}
                        last={i === options.length - 1}
                    />
                ))}
            </Group>
        </Sheet>
    );
};

const styles = StyleSheet.create({
    notice: {
        marginTop: space[4],
    },
    // Lines up with the group's content, like a grouped section header.
    helper: {
        paddingHorizontal: layout.groupPadding,
        marginTop: space[6],
        marginBottom: space[2],
    },
});

export default FetchListSheet;
