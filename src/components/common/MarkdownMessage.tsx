import React from 'react';
import { View, Text, Platform } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { parseChatMarkdown, parseInlineMarkdown } from '@utils/chatMarkdown';

interface MarkdownMessageProps {
    text: string;
    color: string;
}

const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * Renders LLM chat replies (which commonly come back as markdown - headings,
 * bullet/numbered lists, **bold**, *italic*, `code`) instead of showing raw
 * markdown syntax in a bubble. See src/utils/chatMarkdown.ts for the parser.
 */
const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ text, color }) => {
    const { colors } = useTheme();

    if (!text) return null;

    const renderInline = (line: string, style: object) => (
        <Text style={style}>
            {parseInlineMarkdown(line).map((token, i) => {
                if (token.code) {
                    return (
                        <Text key={i} style={{ fontFamily: MONOSPACE, backgroundColor: colors.border, fontSize: 13 }}>
                            {token.text}
                        </Text>
                    );
                }
                if (token.bold || token.italic) {
                    return (
                        <Text
                            key={i}
                            style={{
                                fontWeight: token.bold ? '700' : undefined,
                                fontStyle: token.italic ? 'italic' : undefined
                            }}
                        >
                            {token.text}
                        </Text>
                    );
                }
                return token.text;
            })}
        </Text>
    );

    const blocks = parseChatMarkdown(text);

    return (
        <View>
            {blocks.map((block, index) => {
                switch (block.type) {
                    case 'heading': {
                        const fontSize = block.level <= 1 ? 18 : block.level === 2 ? 17 : block.level === 3 ? 16 : 15;
                        return (
                            <View key={index} style={{ marginTop: index > 0 ? 8 : 0, marginBottom: 4 }}>
                                {renderInline(block.text, { color, fontSize, fontWeight: 'bold' })}
                            </View>
                        );
                    }
                    case 'bullet':
                        return (
                            <View key={index} style={{ flexDirection: 'row', marginBottom: 2, paddingLeft: block.indent * 12 }}>
                                <Text style={{ color, fontSize: 15, marginRight: 6, minWidth: block.ordered ? 18 : undefined }}>
                                    {block.ordered ? `${block.number}.` : '•'}
                                </Text>
                                {renderInline(block.text, { color, fontSize: 15, lineHeight: 21, flex: 1 })}
                            </View>
                        );
                    case 'blockquote':
                        return (
                            <View
                                key={index}
                                style={{ borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: 8, marginVertical: 4 }}
                            >
                                {renderInline(block.text, { color, fontStyle: 'italic', fontSize: 14 })}
                            </View>
                        );
                    case 'divider':
                        return <View key={index} style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />;
                    case 'paragraph':
                        return (
                            <View key={index} style={{ marginBottom: 4 }}>
                                {renderInline(block.text, { color, fontSize: 15, lineHeight: 21 })}
                            </View>
                        );
                    default:
                        return null;
                }
            })}
        </View>
    );
};

export default MarkdownMessage;
