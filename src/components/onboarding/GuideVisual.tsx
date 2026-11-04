import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar, Tile, IconName } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import type { GuideVisualId } from '@constants/helpContent';

// Infographics for the Help Center guides, in the style of the Savings trend info sheet.
// Every figure is a worked example, so the numbers in each diagram must add up.

type Segment = { flex: number; color: string; label?: string };

const Block: React.FC<{ caption: string; children: React.ReactNode }> = ({ caption, children }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.block, { backgroundColor: ds.inset }]}>
            <Text style={[type.captionMedium, styles.blockCaption, { color: ds.text2 }]}>{caption}</Text>
            {children}
        </View>
    );
};

const Stack: React.FC<{ segments: Segment[]; height?: number }> = ({ segments, height = 24 }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.stack, { height }]}>
            {segments.map((s, i) => (
                <View key={i} style={[styles.segment, { flex: s.flex, backgroundColor: s.color }]}>
                    {s.label ? <Text style={[type.captionMedium, { color: ds.onSemantic }]} numberOfLines={1}>{s.label}</Text> : null}
                </View>
            ))}
        </View>
    );
};

const Legend: React.FC<{ items: [string, string, string?][] }> = ({ items }) => {
    const { ds } = useTheme();
    return (
        <View style={styles.legend}>
            {items.map(([label, color, value]) => (
                <View key={label} style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={[type.small, styles.flex, { color: ds.text2 }]}>{label}</Text>
                    {value ? <Text style={[type.smallNum, { color: ds.text }]}>{value}</Text> : null}
                </View>
            ))}
        </View>
    );
};

// Labeled top border spanning the right-hand `span` of a bar, like the Savings sheet's brackets.
const Bracket: React.FC<{ offset: number; span: number; label: string; color?: string }> = ({ offset, span, label, color }) => {
    const { ds } = useTheme();
    const c = color ?? ds.text2;
    return (
        <View style={styles.bracketRow}>
            {offset > 0 && <View style={{ flex: offset }} />}
            <View style={[styles.bracket, { flex: span, borderColor: c }]}>
                <Text style={[type.captionMedium, styles.center, { color: c }]}>{label}</Text>
            </View>
        </View>
    );
};

const Result: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.result, { borderTopColor: ds.hairline }]}>
            <Text style={[type.small, { color: ds.text2 }]}>{label}</Text>
            <Text style={[type.bodyNum, { color: color ?? ds.text }]}>{value}</Text>
        </View>
    );
};

const Point: React.FC<{ icon: IconName; color: string; text: string }> = ({ icon, color, text }) => {
    const { ds } = useTheme();
    return (
        <View style={styles.pointRow}>
            <Ionicons name={icon} size={14} color={color} style={styles.pointIcon} />
            <Text style={[type.small, styles.flex, { color: ds.text2 }]}>{text}</Text>
        </View>
    );
};

const NetWorth = () => {
    const { ds } = useTheme();
    return (
        <Block caption="Example: what you have minus what you owe">
            <Text style={[type.caption, { color: ds.text2 }]}>You have ₱100,000</Text>
            <Stack segments={[
                { flex: 50, color: ds.domainCash },
                { flex: 30, color: ds.domainInvest },
                { flex: 20, color: ds.domainGoals },
            ]} />
            <Text style={[type.caption, { color: ds.text2 }]}>You owe ₱30,000</Text>
            <View style={styles.stack}>
                <View style={{ flex: 25, backgroundColor: ds.domainLoans }} />
                <View style={{ flex: 5, backgroundColor: ds.domainLoans, opacity: 0.45 }} />
                <View style={{ flex: 70 }} />
            </View>
            <Bracket offset={30} span={70} label="Net worth ₱70,000" />
            <Legend items={[
                ['Cash', ds.domainCash, '₱50,000'],
                ['Investments', ds.domainInvest, '₱30,000'],
                ['Goal balances', ds.domainGoals, '₱20,000'],
                ['Loan principal', ds.domainLoans, '−₱25,000'],
                ['Future interest', ds.domainLoans + '73', '−₱5,000'],
            ]} />
        </Block>
    );
};

const Runway = () => {
    const { ds } = useTheme();
    const months = [20, 20, 20, 20, 10];
    return (
        <Block caption="Example: ₱90,000 cash ÷ ₱20,000 a month">
            <Text style={[type.caption, { color: ds.text2 }]}>Cash balance ₱90,000</Text>
            <View style={styles.months}>
                {months.map((m, i) => (
                    <View key={i} style={[styles.month, { flex: m, backgroundColor: ds.domainCash, opacity: i === months.length - 1 ? 0.5 : 1 }]}>
                        <Text style={[type.captionNum, { color: ds.onSemantic }]}>{i + 1}</Text>
                    </View>
                ))}
            </View>
            <Text style={[type.caption, { color: ds.text2 }]}>Each block is one month of burn rate (₱20,000); the last one only half lasts.</Text>
            <Result label="Runway" value="4.5 months" />
        </Block>
    );
};

const BurnRate = () => {
    const { ds } = useTheme();
    return (
        <Block caption="What goes into one month of burn rate">
            <Stack segments={[
                { flex: 14, color: ds.danger },
                { flex: 4, color: ds.domainLoans },
                { flex: 2, color: ds.domainGoals },
            ]} />
            <Legend items={[
                ['Average spending (up to 6 full months)', ds.danger, '₱14,000'],
                ['Loan minimum payments', ds.domainLoans, '₱4,000'],
                ['Recurring goal contributions', ds.domainGoals, '₱2,000'],
            ]} />
            <Result label="Burn rate" value="₱20,000" />
            <Text style={[type.captionMedium, styles.subhead, { color: ds.text2 }]}>Left out</Text>
            <Point icon="remove-circle-outline" color={ds.text3} text="Purchases paid from a goal" />
            <Point icon="remove-circle-outline" color={ds.text3} text="Loan principal and interest (already inside the minimum)" />
            <Point icon="remove-circle-outline" color={ds.text3} text="Paused goals and goals at their target" />
        </Block>
    );
};

const PrivacyModes = () => {
    const { ds } = useTheme();
    // [mode, net worth, its change line, screenshots allowed]
    const modes: [string, string, string, boolean][] = [
        ['Open', '₱45,200', '+₱1,400', false],
        ['Discreet', '+3.2%', 'this month', false],
        ['Hidden', '****', '+****', true],
    ];
    return (
        <Block caption="Your net worth in each mode">
            <View style={styles.trio}>
                {modes.map(([mode, value, change]) => (
                    <View key={mode} style={[styles.trioTile, { backgroundColor: ds.raised }]}>
                        <Text style={[type.captionMedium, { color: ds.text2 }]}>{mode}</Text>
                        <Text style={[type.bodyNum, { color: ds.text }]} numberOfLines={1}>{value}</Text>
                        <Text style={[type.captionNum, { color: change.startsWith('+') ? ds.success : ds.text2 }]} numberOfLines={1}>{change}</Text>
                    </View>
                ))}
            </View>
            <Text style={[type.captionMedium, styles.subhead, { color: ds.text2 }]}>Screenshots</Text>
            <View style={styles.trio}>
                {modes.map(([mode, , , shots]) => (
                    <View key={mode} style={[styles.shot, styles.flex]}>
                        <Ionicons name={shots ? 'camera-outline' : 'lock-closed-outline'} size={14} color={shots ? ds.text : ds.text3} />
                        <Text style={[type.caption, { color: shots ? ds.text : ds.text3 }]}>{shots ? 'Allowed' : 'Blocked'}</Text>
                    </View>
                ))}
            </View>
            <Text style={[type.caption, styles.note, { color: ds.text2 }]}>Discreet swaps amounts for numbers that don&apos;t reveal how much money is involved, like percentages and months.</Text>
        </Block>
    );
};

const GoalFlow = () => {
    const { ds } = useTheme();
    const step = (icon: IconName, label: string, color: string) => (
        <View style={[styles.flowBox, { backgroundColor: ds.raised }]}>
            <Ionicons name={icon} size={18} color={color} />
            <Text style={[type.captionMedium, { color: ds.text }]}>{label}</Text>
        </View>
    );
    const arrow = <Ionicons name="arrow-forward" size={16} color={ds.text3} />;
    return (
        <Block caption="Where the money goes">
            <View style={styles.flow}>
                {step('wallet-outline', 'Cash', ds.domainCash)}
                {arrow}
                {step('flag-outline', 'Goal', ds.domainGoals)}
                {arrow}
                {step('bag-handle-outline', 'Purchase', ds.text2)}
            </View>
            <View style={styles.pair}>
                <View style={styles.flex}>
                    <Text style={[type.captionMedium, styles.subhead, { color: ds.text }]}>Adding funds</Text>
                    <Point icon="arrow-down" color={ds.danger} text="Cash and runway go down" />
                    <Point icon="remove" color={ds.text3} text="Net worth stays the same" />
                </View>
                <View style={styles.flex}>
                    <Text style={[type.captionMedium, styles.subhead, { color: ds.text }]}>Spending from it</Text>
                    <Point icon="remove" color={ds.text3} text="Burn rate and budgets unchanged" />
                    <Point icon="list-outline" color={ds.text3} text="Still shows in categories" />
                </View>
            </View>
        </Block>
    );
};

const GoalCap = () => {
    const { ds } = useTheme();
    const goal = (name: string, saved: string, percent: number) => (
        <View style={styles.goalRow}>
            <View style={styles.goalHead}>
                <Text style={[type.small, { color: ds.text }]}>{name}</Text>
                <Text style={[type.smallNum, { color: ds.text2 }]}>{saved} / ₱10,000</Text>
            </View>
            <ProgressBar percent={percent} domain="goals" />
        </View>
    );
    return (
        <Block caption="Example: why each goal is capped at its target">
            {goal('Travel fund', '₱15,000', 100)}
            {goal('Annual insurance', '₱2,000', 20)}
            <View style={styles.pair}>
                <View style={[styles.compare, { backgroundColor: ds.raised }]}>
                    <Text style={[type.caption, { color: ds.text2 }]}>Without the cap</Text>
                    <Text style={[type.bodyNum, styles.strike, { color: ds.text3 }]}>85%</Text>
                    <Text style={[type.caption, { color: ds.text3 }]}>₱17,000 ÷ ₱20,000</Text>
                </View>
                <View style={[styles.compare, { backgroundColor: ds.raised }]}>
                    <Text style={[type.caption, { color: ds.text2 }]}>% to target</Text>
                    <Text style={[type.bodyNum, { color: ds.text }]}>60%</Text>
                    <Text style={[type.caption, { color: ds.text3 }]}>(₱10,000 + ₱2,000) ÷ ₱20,000</Text>
                </View>
            </View>
            <Text style={[type.caption, styles.note, { color: ds.text2 }]}>The extra ₱5,000 in Travel can&apos;t hide that Insurance is behind.</Text>
        </Block>
    );
};

const HealthGrid = () => {
    const { ds } = useTheme();
    return (
        <Block caption="Four tiles you pick, each with when it's measured">
            <View style={styles.grid}>
                <Tile inGroup label="Runway" value="4.5 mo" change="Today" style={[styles.gridTile, { backgroundColor: ds.raised }]} />
                <Tile inGroup label="Spending pace" value="−8%" change="Today" style={[styles.gridTile, { backgroundColor: ds.raised }]} />
                <Tile inGroup label="Savings rate" value="22%" change="Selected month" style={[styles.gridTile, { backgroundColor: ds.raised }]} />
                <Tile inGroup label="Budget health" value="64%" change="Selected month" style={[styles.gridTile, { backgroundColor: ds.raised }]} />
            </View>
        </Block>
    );
};

// Bands for a 0–100%+ scale; `marks` sit at each band's start.
const Scale: React.FC<{ bands: Segment[]; marks: string[]; marker?: { at: number; label: string } }> = ({ bands, marks, marker }) => {
    const { ds } = useTheme();
    const total = bands.reduce((s, b) => s + b.flex, 0);
    return (
        <View>
            {marker && (
                <View style={styles.markerRow}>
                    <View style={[styles.marker, { left: `${(marker.at / total) * 100}%` }]}>
                        <Text style={[type.captionMedium, { color: ds.text }]}>{marker.label}</Text>
                        <Ionicons name="caret-down" size={12} color={ds.text} />
                    </View>
                </View>
            )}
            <Stack height={12} segments={bands.map(b => ({ flex: b.flex, color: b.color }))} />
            <View style={styles.bracketRow}>
                {bands.map((b, i) => (
                    <View key={i} style={{ flex: b.flex }}>
                        <Text style={[type.captionNum, { color: ds.text2 }]}>{marks[i]}</Text>
                        <Text style={[type.captionMedium, { color: b.color }]} numberOfLines={1}>{b.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const BudgetScale = () => {
    const { ds } = useTheme();
    return (
        <Block caption="Budget health: share of your budgets used">
            <Scale
                bands={[
                    { flex: 70, color: ds.success, label: 'Healthy' },
                    { flex: 20, color: ds.warning, label: 'Warning' },
                    { flex: 15, color: ds.danger, label: 'Over' },
                ]}
                marks={['0%', '70%', '90%']}
                marker={{ at: 64, label: '64%' }}
            />
        </Block>
    );
};

const PayoffOrder = () => {
    const { ds } = useTheme();
    const column = (title: string, why: string, rows: [string, string][]) => (
        <View style={[styles.compare, styles.payoff, { backgroundColor: ds.raised }]}>
            <Text style={[type.smallMedium, { color: ds.text }]}>{title}</Text>
            <Text style={[type.caption, { color: ds.text2 }]}>{why}</Text>
            {rows.map(([name, key], i) => (
                <View key={name} style={styles.payoffRow}>
                    <Text style={[type.captionNum, styles.rank, { color: ds.text3 }]}>{i + 1}</Text>
                    <Text style={[type.caption, styles.flex, { color: ds.text }]} numberOfLines={1}>{name}</Text>
                    <Text style={[type.captionNum, { color: ds.domainLoans }]}>{key}</Text>
                </View>
            ))}
        </View>
    );
    return (
        <Block caption="The same three loans, ranked two ways">
            <View style={styles.pair}>
                {column('Avalanche', 'Highest rate first. Least interest.', [
                    ['Credit card', '36%'],
                    ['Personal', '18%'],
                    ['Car', '9%'],
                ])}
                {column('Snowball', 'Smallest balance first. Quick wins.', [
                    ['Personal', '₱8k'],
                    ['Credit card', '₱20k'],
                    ['Car', '₱300k'],
                ])}
            </View>
            <Text style={[type.caption, styles.note, { color: ds.text2 }]}>Overdue and due-soon loans jump to the top either way.</Text>
        </Block>
    );
};

const PaymentSplit = () => {
    const { ds } = useTheme();
    const bars = (heights: number[], color: string) => (
        <View style={styles.bars}>
            {heights.map((h, i) => <View key={i} style={[styles.bar, { height: h * 4, backgroundColor: color }]} />)}
        </View>
    );
    return (
        <Block caption="Example: a ₱10,000 payment">
            <Stack segments={[
                { flex: 75, color: ds.domainLoans },
                { flex: 20, color: ds.danger },
                { flex: 5, color: ds.text3 },
            ]} />
            <Legend items={[
                ['Principal: lowers your balance', ds.domainLoans, '₱7,500'],
                ['Interest: the cost of borrowing', ds.danger, '₱2,000'],
                ['Fee or insurance (optional)', ds.text3, '₱500'],
            ]} />
            <Text style={[type.captionMedium, styles.subhead, { color: ds.text2 }]}>Monthly interest as you pay down</Text>
            <View style={styles.pair}>
                <View style={[styles.compare, { backgroundColor: ds.raised }]}>
                    {bars([10, 8, 6, 4], ds.danger)}
                    <Text style={[type.captionMedium, { color: ds.text }]}>Fixed / Variable</Text>
                    <Text style={[type.caption, { color: ds.text2 }]}>On what&apos;s left, so it shrinks</Text>
                </View>
                <View style={[styles.compare, { backgroundColor: ds.raised }]}>
                    {bars([10, 10, 10, 10], ds.danger)}
                    <Text style={[type.captionMedium, { color: ds.text }]}>Flat</Text>
                    <Text style={[type.caption, { color: ds.text2 }]}>On the original amount, so it never shrinks</Text>
                </View>
            </View>
        </Block>
    );
};

const TotalReturn = () => {
    const { ds } = useTheme();
    return (
        <Block caption="Example: total return">
            <Text style={[type.caption, { color: ds.text2 }]}>Everything you gained ₱10,000</Text>
            <Stack segments={[
                { flex: 6, color: ds.domainInvest },
                { flex: 3, color: ds.success },
                { flex: 1, color: ds.domainGoals },
            ]} />
            <View style={[styles.fraction, { backgroundColor: ds.text3 }]} />
            <Text style={[type.caption, { color: ds.text2 }]}>Everything you ever invested ₱100,000</Text>
            <Stack segments={[
                { flex: 80, color: ds.domainCash },
                { flex: 20, color: ds.domainCash + '73' },
            ]} />
            <Legend items={[
                ['Unrealized P/L (still holding)', ds.domainInvest, '₱6,000'],
                ['Realized P/L (sold)', ds.success, '₱3,000'],
                ['Dividends', ds.domainGoals, '₱1,000'],
                ['Cost of what you hold', ds.domainCash, '₱80,000'],
                ['Cost of what you sold', ds.domainCash + '73', '₱20,000'],
            ]} />
            <Result label="Total return" value="+10.0%" color={ds.success} />
        </Block>
    );
};

const AdvisorScale = () => {
    const { ds } = useTheme();
    return (
        <Block caption="Smart Advisor: drop from the 30-day high">
            <Scale
                bands={[
                    { flex: 5, color: ds.text3, label: '' },
                    { flex: 10, color: ds.warning, label: 'Dip' },
                    { flex: 10, color: ds.danger, label: 'Crash' },
                ]}
                marks={['0%', '5%', '15%+']}
            />
            <View style={styles.legend}>
                <Point icon="calendar-outline" color={ds.domainGoals} text="Dividend: ex-dividend date within 30 days" />
                <Point icon="pie-chart-outline" color={ds.domainInvest} text="Balance: a sector under 10% of your stocks" />
            </View>
        </Block>
    );
};

const VISUALS: Record<GuideVisualId, React.FC> = {
    'net-worth': NetWorth,
    'runway': Runway,
    'burn-rate': BurnRate,
    'privacy-modes': PrivacyModes,
    'goal-flow': GoalFlow,
    'goal-cap': GoalCap,
    'health-grid': HealthGrid,
    'budget-scale': BudgetScale,
    'payoff-order': PayoffOrder,
    'payment-split': PaymentSplit,
    'total-return': TotalReturn,
    'advisor-scale': AdvisorScale,
};

const GuideVisual: React.FC<{ id: GuideVisualId }> = ({ id }) => {
    const Visual = VISUALS[id];
    return <Visual />;
};

const styles = StyleSheet.create({
    block: {
        padding: space[3],
        borderRadius: radius.sm,
        marginBottom: space[5],
        gap: space[1],
    },
    blockCaption: {
        marginBottom: space[2],
    },
    stack: {
        flexDirection: 'row',
        height: 24,
        borderRadius: radius.sm,
        overflow: 'hidden',
        marginBottom: space[2],
    },
    segment: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    legend: {
        gap: space[2],
        marginTop: space[2],
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    // Icon pinned to the first line when the text wraps.
    pointRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
    },
    pointIcon: {
        width: 14,
        marginTop: 2,
    },
    bracketRow: {
        flexDirection: 'row',
        marginTop: space[1],
    },
    bracket: {
        borderTopWidth: 2,
        paddingTop: space[1],
    },
    result: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        marginTop: space[3],
        paddingTop: space[3],
    },
    months: {
        flexDirection: 'row',
        gap: 3,
        height: 28,
        marginBottom: space[2],
    },
    month: {
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subhead: {
        marginTop: space[3],
        marginBottom: space[1],
    },
    trio: {
        flexDirection: 'row',
        gap: space[2],
    },
    trioTile: {
        flex: 1,
        padding: space[3],
        borderRadius: radius.sm,
        gap: 2,
    },
    shot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        paddingHorizontal: space[3],
    },
    note: {
        marginTop: space[3],
    },
    flow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    flowBox: {
        flex: 1,
        alignItems: 'center',
        gap: space[1],
        paddingVertical: space[3],
        borderRadius: radius.sm,
    },
    pair: {
        flexDirection: 'row',
        gap: space[3],
        marginTop: space[2],
    },
    flex: {
        flex: 1,
    },
    goalRow: {
        marginBottom: space[3],
    },
    goalHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    compare: {
        flex: 1,
        padding: space[3],
        borderRadius: radius.sm,
        gap: 2,
    },
    strike: {
        textDecorationLine: 'line-through',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[2],
    },
    gridTile: {
        flexGrow: 1,
        flexBasis: '40%',
        padding: space[3],
    },
    markerRow: {
        height: 28,
    },
    // Centered on its `left` point.
    marker: {
        position: 'absolute',
        bottom: 0,
        width: 40,
        marginLeft: -20,
        alignItems: 'center',
    },
    payoff: {
        gap: space[1],
    },
    payoffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        marginTop: space[1],
    },
    rank: {
        width: 10,
    },
    bars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        height: 40,
        marginBottom: space[2],
    },
    bar: {
        flex: 1,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    fraction: {
        height: 1,
        marginVertical: space[2],
    },
    center: {
        textAlign: 'center',
    },
});

export default GuideVisual;
