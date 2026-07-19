import { ContentItem } from '@constants/helpContent';

export interface InlineSegment {
    text: string;
    bold: boolean;
}

// Splits a line on **bold** markers into plain/bold runs, e.g. for rendering
// inline emphasis inside a <Text> without a full markdown-to-JSX library.
export const splitBoldSegments = (text: string): InlineSegment[] => {
    return text
        .split(/(\*\*.*?\*\*)/g)
        .filter(Boolean)
        .map(part => (part.startsWith('**') && part.endsWith('**'))
            ? { text: part.slice(2, -2), bold: true }
            : { text: part, bold: false }
        );
};

export const parseMarkdownToContentItems = (markdown: string): ContentItem[] => {
    const lines = markdown.split('\n');
    const items: ContentItem[] = [];

    lines.forEach(line => {
        if (!line.trim()) return;

        // Calculate indentation (number of leading spaces / 4)
        const leadingSpaces = line.search(/\S/);
        const indent = Math.floor(leadingSpaces / 4);
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('### ')) {
            items.push({ type: 'heading3', text: trimmedLine.replace('### ', '').trim() });
        } else if (trimmedLine.startsWith('## ')) {
            items.push({ type: 'heading2', text: trimmedLine.replace('## ', '').trim() });
        } else if (trimmedLine.startsWith('# ')) {
            items.push({ type: 'heading1', text: trimmedLine.replace('# ', '').trim() });
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            items.push({
                type: 'bullet',
                text: trimmedLine.substring(2).trim(),
                indent: indent > 0 ? indent : undefined
            });
        } else if (trimmedLine.startsWith('> ')) {
            items.push({ type: 'blockquote', text: trimmedLine.replace('> ', '').trim() });
        } else if (trimmedLine === '---') {
            items.push({ type: 'divider' });
        } else {
            // Check if it's a numeric list item which we'll treat as a bullet for now or paragraph
            // For now, simpler is better.
            items.push({ type: 'paragraph', text: trimmedLine });
        }
    });

    return items;
};
