import { ContentItem } from '@constants/helpContent';

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
