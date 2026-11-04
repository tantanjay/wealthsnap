import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { Disclaimer } from '@components/common/Disclaimer';
import { Group, Row, Sheet } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, layout } from '@styles/theme';

interface FetchPriceListSheetProps {
    visible: boolean;
    onClose: () => void;
    // The duration label marketDataService expects ("Today", "Last 3 days", "Last 7 days").
    onFetch: (duration: string) => void;
}

const DURATIONS = ['Today', 'Last 3 days', 'Last 7 days'];

// Holdings → Fetch price list: pick how far back to fetch AI price estimates for every stock.
const FetchPriceListSheet: React.FC<FetchPriceListSheetProps> = ({ visible, onClose, onFetch }) => {
    const { ds } = useTheme();

    return (
        <Sheet visible={visible} onClose={onClose} title="Fetch price list">
            <Disclaimer severity="warning" style={styles.notice}>
                AI-fetched prices are estimates and may differ from official records.
            </Disclaimer>
            <Text style={[type.small, styles.helper, { color: ds.text2 }]}>How far back to fetch prices for all your stocks.</Text>
            <Group>
                {DURATIONS.map((duration, i) => (
                    <Row
                        key={duration}
                        icon="cloud-download-outline"
                        title={duration}
                        onPress={() => {
                            onClose();
                            onFetch(duration);
                        }}
                        last={i === DURATIONS.length - 1}
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

export default FetchPriceListSheet;
