import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { Tone, toneColor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface SavingsGoalsInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

interface InfoRowProps {
    title: string;
    tag: string;
    tagTone: Tone;
    body: string;
    last?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ title, tag, tagTone, body, last }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.row, { borderBottomColor: ds.hairline, borderBottomWidth: last ? 0 : 1 }]}>
            <View style={styles.rowHeader}>
                <Text style={[type.body, styles.rowTitle, { color: ds.text }]}>{title}</Text>
                <Text style={[type.captionMedium, { color: toneColor(ds, tagTone) }]}>{tag}</Text>
            </View>
            <Text style={[type.small, { color: ds.text2 }]}>{body}</Text>
        </View>
    );
};

// Plain-language explanation of how goal activity feeds into the app's other numbers.
export const SavingsGoalsInfoModal: React.FC<SavingsGoalsInfoModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="How Savings Goals affect your numbers"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[type.small, styles.intro, { color: ds.text2 }]}>
                    Money moving into or out of a goal is treated differently depending on which number you&apos;re looking at, so a big goal-funded purchase never distorts your spending trends.
                </Text>

                <InfoRow
                    title="Putting money into a goal"
                    tag="Lowers cash"
                    tagTone="bad"
                    body="Any contribution lowers your cash on hand right away, so your Runway and Safe-to-Spend go down - that cash really did leave your pocket. A recurring contribution also counts in Burn Rate as a monthly cost, like a bill; a one-off contribution doesn't, since it won't repeat."
                />

                <InfoRow
                    title="Buying something from a goal"
                    tag="Already counted"
                    tagTone="neutral"
                    body="The cash for this already left when you contributed it, not now. So spending from a goal does NOT add anything extra to Burn Rate, Runway, Safe-to-Spend, or Avg Daily Spending, and it does NOT show up as a spike in your month-over-month trend charts (Comparison, Cumulative Spending, Savings Rate)."
                />

                <InfoRow
                    title="What you actually bought"
                    tag="Still visible"
                    tagTone="good"
                    body="The purchase still shows up in your category breakdown (the pie chart) and Top Category, and as '+ from goals' under Total Expense, so you can always see what the money was actually spent on. It's just excluded from charts that compare spending across months, and never counts against a category budget or Smart Suggestions - the goal was its budget."
                />

                <InfoRow
                    title="Your Net Worth"
                    tag="Unchanged"
                    tagTone="neutral"
                    body="Money sitting in a goal still counts toward your Net Worth as an asset - moving cash into a goal just shifts it from one bucket to another, it never makes you look poorer."
                    last
                />

                <View style={[styles.example, { backgroundColor: ds.inset }]}>
                    <Text style={[type.small, { color: ds.text }]}>
                        <Text style={type.smallStrong}>Example: </Text>
                        You contribute ₱10,000 to &quot;Travel Fund&quot; this month, then buy a ₱1,500 souvenir with it. Your cash drops by ₱10,000 when you contribute, so your Runway gets shorter &mdash; and if that ₱10,000 is a monthly recurring contribution, Burn Rate goes up by ₱10,000 too. The ₱1,500 purchase doesn&apos;t take anything extra, and next month&apos;s spending chart won&apos;t show a spike either.
                    </Text>
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    intro: {
        marginBottom: space[2],
    },
    row: {
        paddingVertical: space[3],
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginBottom: space[1],
    },
    rowTitle: {
        flex: 1,
    },
    example: {
        marginTop: space[3],
        marginBottom: space[4],
        padding: space[3],
        borderRadius: radius.sm,
    },
});
