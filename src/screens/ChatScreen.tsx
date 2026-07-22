import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import BottomModal from '@components/common/BottomModal';
import MarkdownMessage from '@components/common/MarkdownMessage';
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
const formatTokens = (n: number) => n.toLocaleString('en-US');

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

const ChatScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [loadingCategories, setLoadingCategories] = useState(true);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());
    const [categoriesConfirmed, setCategoriesConfirmed] = useState(false);

    const [loadingContext, setLoadingContext] = useState(false);
    const [contextInputs, setContextInputs] = useState<ChatContextInputs | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ label: string; ctx: ChatContext } | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [contextModalVisible, setContextModalVisible] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [chatCache, setChatCache] = useState<ChatCache | null>(null);

    const scrollRef = useRef<ScrollView>(null);
    const chatCacheRef = useRef<ChatCache | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [categories, persistedExcluded] = await Promise.all([
                    getAvailableCategories(),
                    Storage.getChatExcludedCategories()
                ]);
                setAvailableCategories(categories);

                // Pre-select last time's exclusions, dropping any category that
                // no longer exists in the data.
                if (persistedExcluded && persistedExcluded.length > 0) {
                    const categorySet = new Set(categories);
                    setExcludedCategories(new Set(persistedExcluded.filter(c => categorySet.has(c))));
                }

                // Nothing to ask about - skip straight to the range picker.
                if (categories.length === 0) setCategoriesConfirmed(true);
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
                const inputs = await fetchChatContextInputs(Array.from(excludedCategories));
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
        setCategoriesConfirmed(true);
    };

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    useEffect(() => {
        if (selectedRange) setSuggestedPrompts(pickRandomPrompts(SUGGESTED_PROMPTS, 3));
    }, [selectedRange]);

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
            if (!cancelled && created) setChatCache(created);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        { tokens: 0, costUSD: new BigNumber(0) }
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
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                costUSD: result.costUSD
            } : m)));

            if (result.cacheInvalid) {
                setChatCache(null);
                createChatCache(selectedRange.ctx.contextText).then(created => {
                    if (created) setChatCache(created);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', flex: 1 }}>{title}</Text>
            {right}
        </View>
    );

    // --- Phase 0: sensitive-category exclusion ---
    if (!categoriesConfirmed) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {renderHeader('Chat')}
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                        Anything you&apos;d rather keep out of this?
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
                        Tap a category to exclude it from the data sent to the AI (e.g. Credit Payment). Everything else is included by default.
                    </Text>

                    {loadingCategories ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
                            {availableCategories.map(category => {
                                const isExcluded = excludedCategories.has(category);
                                return (
                                    <TouchableOpacity
                                        key={category}
                                        onPress={() => toggleCategoryExclusion(category)}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 14,
                                            borderRadius: 12,
                                            backgroundColor: isExcluded ? colors.border + '30' : colors.surface,
                                            borderWidth: 1,
                                            borderColor: isExcluded ? colors.textSecondary : colors.border
                                        }}
                                    >
                                        <Text style={{
                                            color: isExcluded ? colors.textSecondary : colors.text,
                                            fontSize: 15,
                                            fontWeight: '500',
                                            textDecorationLine: isExcluded ? 'line-through' : 'none'
                                        }}>
                                            {category}
                                        </Text>
                                        <Ionicons
                                            name={isExcluded ? 'eye-off-outline' : 'eye-outline'}
                                            size={18}
                                            color={isExcluded ? colors.textSecondary : colors.primary}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        onPress={handleConfirmCategories}
                        disabled={loadingCategories}
                        style={{
                            backgroundColor: colors.primary,
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                            marginTop: 12,
                            marginBottom: Math.max(insets.bottom, 16)
                        }}
                    >
                        <Text style={{ color: colors.textLight, fontSize: 15, fontWeight: '600' }}>
                            {excludedCategories.size > 0 ? `Continue (${excludedCategories.size} excluded)` : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- Phase A: range picker ---
    if (!selectedRange) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {renderHeader('Chat')}
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                        How much history do you want to use?
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
                        This grounds the conversation in your actual data. More history means better context, but a larger prompt sent with every message.
                    </Text>

                    {loadingContext ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {RANGE_OPTIONS.map(opt => {
                                const estimate = contextInputs ? assembleContextForRange(contextInputs, opt.value).estimatedTokens : 0;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => handleSelectRange(opt.value, opt.label)}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 16,
                                            borderRadius: 12,
                                            backgroundColor: colors.surface,
                                            borderWidth: 1,
                                            borderColor: colors.border
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{opt.label}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>~{formatTokens(estimate)} tokens</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // --- Phase B: conversation ---
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'android' ? -insets.bottom : 0}
        >
            {renderHeader(
                'Chat',
                <TouchableOpacity onPress={() => setContextModalVisible(true)} style={{ padding: 4 }}>
                    <Ionicons name="document-text-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            )}

            <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedRange.label} of history</Text>
                {sessionTotals.tokens > 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Session: {formatTokens(sessionTotals.tokens)} tokens · {formatCost(sessionTotals.costUSD)}
                    </Text>
                )}
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
                {messages.length === 0 && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 }}>
                            Ask anything about your income, spending, investments, or debt.
                        </Text>
                        {suggestedPrompts.length > 0 && (
                            <View style={{ gap: 8 }}>
                                {suggestedPrompts.map((prompt, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleSend(prompt)}
                                        disabled={sending}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: colors.surface,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 14,
                                            padding: 12
                                        }}
                                    >
                                        <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                                        <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{prompt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}
                {messages.map(m => (
                    <View
                        key={m.id}
                        style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            backgroundColor: m.role === 'user' ? colors.primary : colors.surface,
                            borderRadius: 16,
                            borderWidth: m.role === 'user' ? 0 : 1,
                            borderColor: colors.border,
                            padding: 12,
                            marginBottom: 10
                        }}
                    >
                        {m.role === 'user' ? (
                            <Text style={{ color: colors.textLight, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
                        ) : (
                            <MarkdownMessage text={m.text || (m.streaming ? '...' : '')} color={colors.text} />
                        )}
                        {m.role === 'model' && !m.streaming && m.inputTokens !== undefined && (
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
                                {formatTokens(m.inputTokens)} in / {formatTokens(m.outputTokens || 0)} out · {formatCost(m.costUSD || new BigNumber(0))}
                            </Text>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 12),
                borderTopWidth: 1,
                borderTopColor: colors.border,
                gap: 10
            }}>
                <TextInput
                    style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.border,
                        maxHeight: 100
                    }}
                    placeholder="Ask a question..."
                    placeholderTextColor={colors.gray500}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    editable={!sending}
                />
                <TouchableOpacity
                    onPress={() => handleSend()}
                    disabled={sending || !inputText.trim()}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: sending || !inputText.trim() ? colors.gray300 : colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {sending ? (
                        <ActivityIndicator color={colors.textLight} size="small" />
                    ) : (
                        <Ionicons name="send" size={18} color={colors.textLight} />
                    )}
                </TouchableOpacity>
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
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            backgroundColor: colors.primary + '15',
                            borderRadius: 20,
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            marginBottom: 12
                        }}
                    >
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                            Copy Context
                        </Text>
                    </TouchableOpacity>
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: colors.warning + '20',
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 12,
                        gap: 8
                    }}>
                        <Ionicons name="shield-outline" size={16} color={colors.textSecondary} style={{ marginTop: 1 }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, flex: 1 }}>
                            This is your raw financial data. If you copy it elsewhere, only paste it into an AI service whose privacy policy you trust - WealthSnap has no control over how a third party handles it once copied.
                        </Text>
                    </View>
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14
                    }}>
                        <Text
                            selectable
                            style={{
                                color: colors.text,
                                fontSize: 12,
                                lineHeight: 18,
                                fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
                            }}
                        >
                            {selectedRange.ctx.contextText}
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>
        </KeyboardAvoidingView>
    );
};

export default ChatScreen;
