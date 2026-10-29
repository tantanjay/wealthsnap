import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import MarkdownMessage from '@components/common/MarkdownMessage';
import { Group, Row, SegmentedControl } from '@components/ds';
import { type, space, radius, layout } from '@styles/theme';
import { generateUUID } from '@utils/uuid';
import {
    fetchChatContextInputs,
    assembleContextForRange,
    getAvailableCategories,
    RANGE_OPTIONS,
    ChatContext,
    ChatContextInputs,
    ChatHistoryRange
} from '@services/domain/chatContextService';
import { sendChatMessage, createChatCache, deleteChatCache, ChatTurn, ChatCache } from '@services/integrations/geminiChatService';
import { getAllDebts } from '@services/domain/debtService';
import * as Storage from '@services/core/storageService';
import { BigNumber } from 'bignumber.js';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    streaming?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    costUSD?: BigNumber;
}

const formatCost = (cost: BigNumber) => `$${cost.toFixed(4)}`;

const formatCompact = (v: number) => {
    const s = v.toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
};

const formatTokens = (n: number): string => {
    if (n < 1000) return n.toLocaleString('en-US');
    if (n < 1_000_000) return `${formatCompact(n / 1000)}k`;
    return `${formatCompact(n / 1_000_000)}M`;
};

// Deliberately steers away from single-number lookups already visible on a
// dashboard card (e.g. "how much debt do I owe") - the point of chat is
// synthesis across months/categories/accounts that no single screen shows.
// A larger pool than shown at once - 3 are picked at random each time Phase B
// loads, so returning users see fresh examples instead of the same 3 every time.
const SUGGESTED_PROMPTS = [
    "Based on my spending patterns, what's realistically holding my savings rate back?",
    'Is my spending trending in a direction I should be worried about?',
    'Which of my recurring expenses would free up the most cash if I cut it?',
    'Am I financially resilient right now, given my burn rate and debt obligations together?',
    "What's driving the difference between this month's spending and my usual pattern?",
    'Right now, does it make more sense for me to pay down debt or keep investing?',
    'Is my portfolio too concentrated in one holding relative to my overall net worth?',
    'What would actually need to change for my savings rate to hit 20%?',
    'Am I too reliant on one income source, and what happens to my runway if it stopped?',
    'Which spending category has grown the fastest relative to my income over time?',
    "What's one habit in my spending that's quietly eating into my savings?",
    'If I want to be debt-free in 2 years, what would need to change starting now?',
    'How much of my net worth is actually liquid versus tied up in investments or debt?',
    'Looking at my top expenses with notes, is there a pattern worth flagging?',
    'Are my investment gains outpacing what my debt is costing me in interest?',
    'If this month repeated for the next 6 months, where would I end up?',
    'Which budget category is quietly creeping toward being a problem?',
    "Compare my income growth to my expense growth over the months you have - who's winning?",
    'Based on everything you can see, what would you fix first if this were your budget?',
    "Is there a gap between what I say I'm saving for and how I'm actually spending?"
];

const pickRandomPrompts = (pool: string[], count: number): string[] => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

// Only relevant to users who actually have debt records, so it's kept out of the random
// pool above (which every user draws from) and appended as a guaranteed last suggestion
// instead - see ChatContextInputs.hasDebts. Answerable in detail because the snapshot now
// includes every debt regardless of status (active, paid off, forgiven).
const DEBT_BEHAVIOR_PROMPT = "Looking at all my debts - paid off, forgiven, or still active - what does that say about how I handle debt?";

const ChatScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [loadingCategories, setLoadingCategories] = useState(true);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
    const [categoriesConfirmed, setCategoriesConfirmed] = useState(false);
    const [hasDebts, setHasDebts] = useState(false);
    const [discloseDebtNames, setDiscloseDebtNames] = useState(true);

    const [loadingContext, setLoadingContext] = useState(false);
    const [contextInputs, setContextInputs] = useState<ChatContextInputs | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ label: string; ctx: ChatContext } | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [contextModalVisible, setContextModalVisible] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [chatCache, setChatCache] = useState<ChatCache | null>(null);
    // One-time cost of writing the cache(s) created this session - counted once
    // here rather than per-message, since createChatCache already bills it once.
    const [cacheCreationStats, setCacheCreationStats] = useState<{ tokens: number; costUSD: BigNumber }>({ tokens: 0, costUSD: new BigNumber(0) });

    const scrollRef = useRef<ScrollView>(null);
    const chatCacheRef = useRef<ChatCache | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [categories, persistedExcluded, debts, persistedDisclose] = await Promise.all([
                    getAvailableCategories(),
                    Storage.getChatExcludedCategories(),
                    getAllDebts(),
                    Storage.getChatDiscloseDebtNames()
                ]);
                setAvailableCategories(categories);
                setHasDebts(debts.length > 0);
                setDiscloseDebtNames(persistedDisclose ?? true);

                // Pre-select last time's exclusions, dropping any category that
                // no longer exists in the data.
                if (persistedExcluded && persistedExcluded.length > 0) {
                    const categorySet = new Set(categories);
                    setExcludedCategories(new Set(persistedExcluded.filter(c => categorySet.has(c))));
                }

                // Nothing to ask about - skip straight to the range picker.
                if (categories.length === 0 && debts.length === 0) setCategoriesConfirmed(true);
            } catch (error) {
                console.error('[ChatScreen] Failed to load categories:', error);
                setCategoriesConfirmed(true);
            } finally {
                setLoadingCategories(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!categoriesConfirmed) return;
        (async () => {
            setLoadingContext(true);
            try {
                const inputs = await fetchChatContextInputs(Array.from(excludedCategories), discloseDebtNames);
                setContextInputs(inputs);
            } catch (error) {
                console.error('[ChatScreen] Failed to load context:', error);
                showAlert('Error', 'Could not load your financial data. Please try again.', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } finally {
                setLoadingContext(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesConfirmed]);

    const toggleCategoryExclusion = (category: string) => {
        setExcludedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    };

    const handleConfirmCategories = () => {
        Storage.saveChatExcludedCategories(Array.from(excludedCategories));
        if (hasDebts) Storage.saveChatDiscloseDebtNames(discloseDebtNames);
        setCategoriesConfirmed(true);
    };

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    useEffect(() => {
        if (!selectedRange) return;
        const picks = pickRandomPrompts(SUGGESTED_PROMPTS, 3);
        if (contextInputs?.hasDebts) picks.push(DEBT_BEHAVIOR_PROMPT);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- re-randomizes prompts when the range changes; see FIXES.md
        setSuggestedPrompts(picks);
    }, [selectedRange, contextInputs]);

    useEffect(() => {
        chatCacheRef.current = chatCache;
    }, [chatCache]);

    // The context block is fixed for the whole session once a range is picked,
    // so cache it once here instead of re-sending/re-billing it on every message.
    // Built in the background - messages sent before it resolves just fall back
    // to sending the context inline (handled in sendChatMessage).
    useEffect(() => {
        if (!selectedRange) return;
        let cancelled = false;
        (async () => {
            const created = await createChatCache(selectedRange.ctx.contextText);
            if (!cancelled && created) {
                setChatCache(created);
                setCacheCreationStats(prev => ({
                    tokens: prev.tokens + created.creationTokens,
                    costUSD: prev.costUSD.plus(created.creationCostUSD)
                }));
            }
        })();
        return () => { cancelled = true; };
    }, [selectedRange]);

    useEffect(() => {
        return () => {
            if (chatCacheRef.current) deleteChatCache(chatCacheRef.current.name);
        };
    }, []);

    const sessionTotals = messages.reduce(
        (acc, m) => ({
            tokens: acc.tokens + (m.inputTokens || 0) + (m.outputTokens || 0),
            costUSD: acc.costUSD.plus(m.costUSD || new BigNumber(0))
        }),
        { tokens: cacheCreationStats.tokens, costUSD: cacheCreationStats.costUSD }
    );

    const handleSelectRange = (range: ChatHistoryRange, label: string) => {
        if (!contextInputs) return;
        const ctx = assembleContextForRange(contextInputs, range);
        setSelectedRange({ label, ctx });
    };

    const handleCopyContext = async () => {
        if (!selectedRange) return;
        await Clipboard.setStringAsync(selectedRange.ctx.contextText);
        showAlert('Copied', 'Context copied to clipboard - paste it into your own AI subscription (ChatGPT, Claude, etc). Only share it with a service you trust.');
    };

    const handleSend = async (overrideText?: string) => {
        const text = (overrideText ?? inputText).trim();
        if (!text || sending || !selectedRange) return;

        if (overrideText === undefined) setInputText('');
        const userMsg: ChatMessage = { id: generateUUID(), role: 'user', text };
        const aiMsgId = generateUUID();
        const aiMsg: ChatMessage = { id: aiMsgId, role: 'model', text: '', streaming: true };

        const historyTurns: ChatTurn[] = [...messages, userMsg].map(m => ({ role: m.role, text: m.text }));

        setMessages(prev => [...prev, userMsg, aiMsg]);
        setSending(true);

        try {
            const result = await sendChatMessage(selectedRange.ctx.contextText, historyTurns, (delta) => {
                setMessages(prev => prev.map(m => (m.id === aiMsgId ? { ...m, text: m.text + delta } : m)));
            }, chatCache ?? undefined);

            setMessages(prev => prev.map(m => (m.id === aiMsgId ? {
                ...m,
                text: result.fullText,
                streaming: false,
                // Excludes the cached portion of the prompt - the cache carries the
                // (large, session-static) context on every turn, so counting it here
                // would make the tally balloon by roughly one context size per
                // message even though it's barely billed. This reflects the tokens
                // actually processed fresh for this turn.
                inputTokens: result.inputTokens - result.cachedTokens,
                outputTokens: result.outputTokens,
                costUSD: result.costUSD
            } : m)));

            if (result.cacheInvalid) {
                setChatCache(null);
                createChatCache(selectedRange.ctx.contextText).then(created => {
                    if (created) {
                        setChatCache(created);
                        setCacheCreationStats(prev => ({
                            tokens: prev.tokens + created.creationTokens,
                            costUSD: prev.costUSD.plus(created.creationCostUSD)
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('[ChatScreen] Send failed:', error);
            setMessages(prev => prev.map(m => (m.id === aiMsgId ? {
                ...m, text: 'Something went wrong reaching Gemini. Please try again.', streaming: false
            } : m)));
        } finally {
            setSending(false);
        }
    };

    const renderHeader = (title: string, right?: React.ReactNode) => (
        <View style={[styles.topBar, { paddingTop: insets.top + space[3] }]}>
            <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back" hitSlop={space[2]}>
                <Ionicons name="chevron-back" size={22} color={ds.text2} />
            </Pressable>
            <Text style={[type.title, { color: ds.text, flex: 1 }]}>{title}</Text>
            {right}
        </View>
    );

    const renderPrimaryButton = (label: string, onPress: () => void, disabled: boolean) => (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[styles.primaryButton, { backgroundColor: ds.accent, marginBottom: Math.max(insets.bottom, space[4]) }]}
        >
            <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{label}</Text>
        </Pressable>
    );

    // --- Phase 0: sensitive-category exclusion ---
    if (!categoriesConfirmed) {
        return (
            <View style={{ flex: 1, backgroundColor: ds.canvas }}>
                {renderHeader('Chat')}
                <View style={styles.page}>
                    <Text style={[type.body, styles.intro, { color: ds.text, marginBottom: space[1] }]}>
                        Anything you&apos;d rather keep out of this?
                    </Text>
                    <Text style={[type.small, styles.intro, { color: ds.text2, marginBottom: space[3] }]}>
                        Tap a category to exclude it from the data sent to the AI (e.g. Credit Payment). Everything else is included by default.
                    </Text>

                    <View style={[styles.note, { backgroundColor: ds.group }]}>
                        <Ionicons name="information-circle-outline" size={16} color={ds.text2} style={{ marginTop: 1 }} />
                        <Text style={[type.small, { color: ds.text2, flex: 1 }]}>
                            Excluding a category, or keeping your debt names private below, only hides the label - the amounts still count in every total sent to the AI.
                        </Text>
                    </View>

                    {loadingCategories ? (
                        <View style={styles.loading}>
                            <ActivityIndicator color={ds.accent} />
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space[3] }} showsVerticalScrollIndicator={false}>
                            <Group>
                                {availableCategories.map((category, index) => {
                                    const isExcluded = excludedCategories.has(category);
                                    const last = index === availableCategories.length - 1;
                                    return (
                                        <Pressable
                                            key={category}
                                            onPress={() => toggleCategoryExclusion(category)}
                                            style={[styles.row, { borderBottomColor: ds.hairline, borderBottomWidth: last ? 0 : 1 }]}
                                        >
                                            <Text style={[
                                                type.body,
                                                { flex: 1, color: isExcluded ? ds.text2 : ds.text, textDecorationLine: isExcluded ? 'line-through' : 'none' }
                                            ]}>
                                                {category}
                                            </Text>
                                            <Ionicons
                                                name={isExcluded ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color={isExcluded ? ds.text2 : ds.accent}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </Group>
                        </ScrollView>
                    )}

                    {hasDebts && (
                        <View style={{ marginTop: space[4] }}>
                            <Text style={[type.smallStrong, styles.intro, { color: ds.text, marginBottom: space[1] }]}>
                                Include your debt names?
                            </Text>
                            <Text style={[type.small, styles.intro, { color: ds.text2, marginBottom: space[3] }]}>
                                Debt amounts, types, and status are included either way - this only decides whether the AI sees the real names (e.g. &quot;Mom&apos;s Loan&quot;) or just &quot;Debt 1&quot;, &quot;Debt 2&quot;, etc.
                            </Text>
                            <SegmentedControl
                                options={[
                                    { key: 'include', label: 'Include Names' },
                                    { key: 'anonymous', label: 'Keep Anonymous' }
                                ]}
                                value={discloseDebtNames ? 'include' : 'anonymous'}
                                onChange={key => setDiscloseDebtNames(key === 'include')}
                            />
                        </View>
                    )}

                    <View style={{ marginTop: space[3] }}>
                        {renderPrimaryButton(
                            excludedCategories.size > 0 ? `Continue (${excludedCategories.size} excluded)` : 'Continue',
                            handleConfirmCategories,
                            loadingCategories
                        )}
                    </View>
                </View>
            </View>
        );
    }

    // --- Phase A: range picker ---
    if (!selectedRange) {
        return (
            <View style={{ flex: 1, backgroundColor: ds.canvas }}>
                {renderHeader('Chat')}
                <View style={styles.page}>
                    <Text style={[type.body, styles.intro, { color: ds.text, marginBottom: space[1] }]}>
                        How much history do you want to use?
                    </Text>
                    <Text style={[type.small, styles.intro, { color: ds.text2, marginBottom: space[3] }]}>
                        This grounds the conversation in your actual data. More history means better context, but a larger prompt sent with every message.
                    </Text>

                    {loadingContext ? (
                        <View style={styles.loading}>
                            <ActivityIndicator color={ds.accent} />
                        </View>
                    ) : (
                        <Group>
                                {RANGE_OPTIONS.map((opt, index) => {
                                    const estimate = contextInputs ? assembleContextForRange(contextInputs, opt.value).estimatedTokens : 0;
                                    return (
                                        <Row
                                            key={opt.value}
                                            title={opt.label}
                                            trailing={<Text style={[type.smallNum, { color: ds.text2 }]}>~{formatTokens(estimate)} tokens</Text>}
                                            last={index === RANGE_OPTIONS.length - 1}
                                            onPress={() => handleSelectRange(opt.value, opt.label)}
                                        />
                                    );
                                })}
                        </Group>
                    )}
                </View>
            </View>
        );
    }

    const sendDisabled = sending || !inputText.trim();

    // --- Phase B: conversation ---
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: ds.canvas }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'android' ? -insets.bottom : 0}
        >
            {renderHeader(
                'Chat',
                <Pressable onPress={() => setContextModalVisible(true)} accessibilityLabel="Generated context" hitSlop={space[2]}>
                    <Ionicons name="document-text-outline" size={22} color={ds.text2} />
                </Pressable>
            )}

            <View style={styles.metaLine}>
                <Text style={[type.caption, { color: ds.text2 }]}>{selectedRange.label} of history</Text>
                {sessionTotals.tokens > 0 && (
                    <Text style={[type.captionNum, { color: ds.text2 }]}>
                        Session: {formatTokens(sessionTotals.tokens)} tokens · {formatCost(sessionTotals.costUSD)}
                    </Text>
                )}
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.thread}>
                {messages.length === 0 && (
                    <View style={{ marginTop: space[5] }}>
                        <Text style={[type.small, { color: ds.text2, textAlign: 'center', marginBottom: space[4] }]}>
                            Ask anything about your income, spending, investments, or debt.
                        </Text>
                        {suggestedPrompts.length > 0 && (
                            <View style={{ gap: space[2] }}>
                                {suggestedPrompts.map((prompt, idx) => (
                                    <Pressable
                                        key={idx}
                                        onPress={() => handleSend(prompt)}
                                        disabled={sending}
                                        style={[styles.prompt, { backgroundColor: ds.group }]}
                                    >
                                        <Ionicons name="sparkles-outline" size={16} color={ds.accent} />
                                        <Text style={[type.small, { color: ds.text, flex: 1 }]}>{prompt}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                )}
                {messages.map(m => (
                    <View
                        key={m.id}
                        style={[
                            styles.bubble,
                            m.role === 'user'
                                ? { alignSelf: 'flex-end', backgroundColor: ds.accent }
                                : { alignSelf: 'flex-start', backgroundColor: ds.group }
                        ]}
                    >
                        {m.role === 'user' ? (
                            <Text style={[type.body, { color: ds.onAccent }]}>{m.text}</Text>
                        ) : (
                            <MarkdownMessage text={m.text || (m.streaming ? '...' : '')} color={ds.text} />
                        )}
                        {m.role === 'model' && !m.streaming && m.inputTokens !== undefined && (
                            <Text style={[type.captionNum, { color: ds.text2, marginTop: space[2] }]}>
                                {formatTokens(m.inputTokens)} in / {formatTokens(m.outputTokens || 0)} out · {formatCost(m.costUSD || new BigNumber(0))}
                            </Text>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={[styles.inputBar, { borderTopColor: ds.hairline, paddingBottom: Math.max(insets.bottom, space[3]) }]}>
                {/* The field sits on the canvas, so it takes the group fill. */}
                <TextInput
                    style={[styles.field, type.body, { backgroundColor: ds.group, color: ds.text }]}
                    placeholder="Ask a question..."
                    placeholderTextColor={ds.text3}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    editable={!sending}
                />
                <Pressable
                    onPress={() => handleSend()}
                    disabled={sendDisabled}
                    accessibilityLabel="Send"
                    style={[styles.sendButton, { backgroundColor: sendDisabled ? ds.group : ds.accent }]}
                >
                    {sending ? (
                        <ActivityIndicator color={ds.text3} size="small" />
                    ) : (
                        <Ionicons name="send" size={18} color={sendDisabled ? ds.text3 : ds.onAccent} />
                    )}
                </Pressable>
            </View>

            <BottomModal
                visible={contextModalVisible}
                onClose={() => setContextModalVisible(false)}
                title="Generated Context"
                subtitle={`~${formatTokens(selectedRange.ctx.estimatedTokens)} tokens · ${selectedRange.label}`}
                maxHeight="85%"
                style={{ height: '85%' }}
                contentStyle={{ flex: 1 }}
            >
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                        onPress={handleCopyContext}
                        hitSlop={space[2]}
                        style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space[1], paddingHorizontal: layout.groupPadding }}
                    >
                        <Ionicons name="copy-outline" size={16} color={ds.accent} />
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Copy context</Text>
                    </TouchableOpacity>
                    <Disclaimer severity="warning" style={{ marginTop: space[4] }}>
                        This is your raw financial data. If you copy it elsewhere, only paste it into an AI service whose privacy policy you trust - WealthSnap has no control over how a third party handles it once copied.
                    </Disclaimer>
                    <Group padded style={{ marginTop: space[4] }}>
                        <Text selectable style={[type.smallNum, { color: ds.text }]}>
                            {selectedRange.ctx.contextText}
                        </Text>
                    </Group>
                </ScrollView>
            </BottomModal>
        </KeyboardAvoidingView>
    );
};


const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingHorizontal: space[5],
        paddingBottom: space[3],
    },
    page: {
        flex: 1,
        paddingHorizontal: layout.groupInset,
    },
    // Text on the canvas lines up with group content.
    intro: {
        paddingHorizontal: layout.groupPadding,
    },
    note: {
        flexDirection: 'row',
        gap: space[2],
        borderRadius: radius.md,
        padding: space[3],
        marginBottom: space[2],
    },
    loading: {
        paddingVertical: space[7],
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
        minHeight: 56,
    },
    primaryButton: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: layout.groupInset,
        paddingBottom: space[2],
    },
    thread: {
        paddingHorizontal: layout.groupInset,
        paddingVertical: space[2],
    },
    prompt: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        borderRadius: radius.md,
        padding: space[3],
    },
    bubble: {
        maxWidth: '85%',
        borderRadius: radius.md,
        padding: space[3],
        marginBottom: space[2],
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: space[2],
        paddingHorizontal: layout.groupInset,
        paddingTop: space[2],
        borderTopWidth: 1,
    },
    field: {
        flex: 1,
        borderRadius: radius.md,
        paddingHorizontal: space[3],
        paddingVertical: space[3],
        maxHeight: 112,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ChatScreen;
