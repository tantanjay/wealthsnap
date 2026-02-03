import { ContentItem } from '@constants/helpContent';

export const parseMarkdownToContentItems = (markdown: string): ContentItem[] => {
    const lines = markdown.split('\n');
    const items: ContentItem[] = [];

    lines.forEach(line => {
        const timmedLine = line.trim();

        if (!timmedLine) return;

        if (timmedLine.startsWith('### ')) {
            items.push({ type: 'heading3', text: timmedLine.replace('### ', '').trim() });
        } else if (timmedLine.startsWith('## ')) {
            items.push({ type: 'heading2', text: timmedLine.replace('## ', '').trim() });
        } else if (timmedLine.startsWith('# ')) {
            items.push({ type: 'heading1', text: timmedLine.replace('# ', '').trim() });
        } else if (timmedLine.startsWith('- ') || timmedLine.startsWith('* ')) {
            items.push({ type: 'bullet', text: timmedLine.substring(2).trim() });
        } else if (timmedLine.startsWith('> ')) {
            items.push({ type: 'blockquote', text: timmedLine.replace('> ', '').trim() });
        } else if (timmedLine === '---') {
            items.push({ type: 'divider' });
        } else {
            // Check if it's a numeric list item which we'll treat as a bullet for now or paragraph
            // For now, simpler is better.
            items.push({ type: 'paragraph', text: timmedLine });
        }
    });

    return items;
};
