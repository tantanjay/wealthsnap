import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';

interface SavingsGoalsInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

interface InfoRowProps {
    title: string;
    tag: string;
    tagColor: string;
    body: string;
}

// Declared at module scope (not inside the modal's render) so it isn't recreated on every
// render - a component defined inline would reset its (nonexistent here, but still a smell)
// internal state and defeats React's reconciliation between renders.
const InfoRow: React.FC<InfoRowProps> = ({ title, tag, tagColor, body }) => {
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{title}</Text>
                <Text style={{ color: tagColor, fontWeight: 'bold', fontSize: 12 }}>{tag}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>{body}</Text>
        </View>
    );
};

/**
 * Plain-language explanation of how Savings Goals activity feeds into the rest of the
 * app's numbers - the "Operational Filter" from the accounting spec, translated out of
 * developer language (subCategory tags, TRANSFER_IN/OUT) into what the user actually sees.
 */
export const SavingsGoalsInfoModal: React.FC<SavingsGoalsInfoModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="How Savings Goals affect your numbers"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                    Money moving into or out of a goal is treated differently depending on which number you&apos;re looking at, so a big goal-funded purchase never distorts your spending trends.
                </Text>

                <InfoRow
                    title="Putting money into a goal"
                    tag="COUNTS AS BURN"
                    tagColor={colors.error}
                    body="A contribution (recurring or manual) lowers your cash on hand right away, so it's included in Burn Rate, Runway, Safe-to-Spend, and Avg Daily Spending - the same as if you'd spent it, because that cash really did leave your pocket."
                />

                <InfoRow
                    title="Buying something from a goal"
                    tag="ALREADY COUNTED"
                    tagColor={colors.textSecondary}
                    body="The cash for this already left when you contributed it, not now. So spending from a goal does NOT add anything extra to Burn Rate, Runway, Safe-to-Spend, or Avg Daily Spending, and it does NOT show up as a spike in your month-over-month trend charts (Comparison, Cumulative Spending, Savings Rate)."
                />

                <InfoRow
                    title="What you actually bought"
                    tag="STILL VISIBLE"
                    tagColor={colors.success}
                    body="The purchase still shows up in your category breakdown (the pie chart), so you can always see what the money was actually spent on - it's just excluded from charts that compare spending across months."
                />

                <InfoRow
                    title="Your Net Worth"
                    tag="UNCHANGED"
                    tagColor={colors.primary}
                    body="Money sitting in a goal still counts toward your Net Worth as an asset - moving cash into a goal just shifts it from one bucket to another, it never makes you look poorer."
                />

                <View style={{ marginTop: 6, backgroundColor: colors.primary + '15', padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                        <Text style={{ fontWeight: 'bold' }}>Example: </Text>
                        You contribute ₱10,000 to &quot;Travel Fund&quot; this month, then buy a ₱1,500 souvenir with it. Burn Rate/Runway this month go up by ₱10,000 (the contribution) &mdash; the ₱1,500 purchase doesn&apos;t add anything extra, and next month&apos;s spending chart won&apos;t show a spike either.
                    </Text>
                </View>
            </ScrollView>
        </BottomModal>
    );
};
