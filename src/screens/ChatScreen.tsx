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
    RANGE_OPTIONS,
    ChatContext,
    ChatContextInputs,
    ChatHistoryRange
} from '@services/domain/chatContextService';
import { sendChatMessage, ChatTurn } from '@services/integrations/geminiChatService';
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

const ChatScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();

    const [loadingContext, setLoadingContext] = useState(true);
    const [contextInputs, setContextInputs] = useState<ChatContextInputs | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ label: string; ctx: ChatContext } | null>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [contextModalVisible, setContextModalVisible] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        (async () => {
            try {
                const inputs = await fetchChatContextInputs();
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
    }, [navigation, showAlert]);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

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
        showAlert('Copied', 'Context copied to clipboard - paste it into any other AI chat.');
    };

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || sending || !selectedRange) return;

        setInputText('');
        const userMsg: ChatMessage = { id: generateUUID(), role: 'user', text };
        const aiMsgId = generateUUID();
        const aiMsg: ChatMessage = { id: aiMsgId, role: 'model', text: '', streaming: true };

        const historyTurns: ChatTurn[] = [...messages, userMsg].map(m => ({ role: m.role, text: m.text }));

        setMessages(prev => [...prev, userMsg, aiMsg]);
        setSending(true);

        try {
            const result = await sendChatMessage(selectedRange.ctx.contextText, historyTurns, (delta) => {
                setMessages(prev => prev.map(m => (m.id === aiMsgId ? { ...m, text: m.text + delta } : m)));
            });

            setMessages(prev => prev.map(m => (m.id === aiMsgId ? {
                ...m,
                text: result.fullText,
                streaming: false,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                costUSD: result.costUSD
            } : m)));
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
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
                        Ask anything about your income, spending, investments, or debt.
                    </Text>
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
                    onPress={handleSend}
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
                headerRight={
                    <TouchableOpacity onPress={handleCopyContext} style={{ padding: 4, marginRight: 8 }}>
                        <Ionicons name="copy-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                }
            >
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
