import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { parseChatMarkdown, parseInlineMarkdown } from '@utils/chatMarkdown';
import { type, space, fontFamily } from '@styles/theme';

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
    const { ds } = useTheme();

    if (!text) return null;

    const renderInline = (line: string, style: object) => (
        <Text style={style}>
            {parseInlineMarkdown(line).map((token, i) => {
                if (token.code) {
                    return (
                        <Text key={i} style={{ fontFamily: MONOSPACE, backgroundColor: ds.inset, fontSize: type.small.fontSize }}>
                            {token.text}
                        </Text>
                    );
                }
                if (token.bold || token.italic) {
                    return (
                        <Text
                            key={i}
                            style={{
                                fontFamily: token.bold ? fontFamily.semibold : undefined,
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
                    case 'heading':
                        return (
                            <View key={index} style={{ marginTop: index > 0 ? space[2] : 0, marginBottom: space[1] }}>
                                {renderInline(block.text, { ...type.bodyStrong, color })}
                            </View>
                        );
                    case 'bullet':
                        return (
                            <View key={index} style={{ flexDirection: 'row', marginBottom: space[1], paddingLeft: block.indent * space[3] }}>
                                <Text style={[type.bodyNum, { color, marginRight: space[2], minWidth: block.ordered ? 18 : undefined }]}>
                                    {block.ordered ? `${block.number}.` : '•'}
                                </Text>
                                {renderInline(block.text, { ...type.body, color, flex: 1 })}
                            </View>
                        );
                    case 'blockquote':
                        return (
                            <View
                                key={index}
                                style={{ borderLeftWidth: 3, borderLeftColor: ds.text3, paddingLeft: space[2], marginVertical: space[1] }}
                            >
                                {renderInline(block.text, { ...type.small, color, fontStyle: 'italic' })}
                            </View>
                        );
                    case 'divider':
                        return <View key={index} style={{ height: StyleSheet.hairlineWidth, backgroundColor: ds.text3, marginVertical: space[2] }} />;
                    case 'paragraph':
                        return (
                            <View key={index} style={{ marginBottom: space[1] }}>
                                {renderInline(block.text, { ...type.body, color })}
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
