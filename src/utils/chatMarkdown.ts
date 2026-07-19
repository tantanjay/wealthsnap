// A small but more complete markdown parser for rendering LLM chat replies -
// separate from markdownParser.ts's ContentItem parser (which is shaped
// around the curated, hand-authored help-content/changelog system and
// shouldn't be bent to fit arbitrary model output). Supports:
//   - Headings level 1-6 (# through ######)
//   - Unordered (-, *, +) and ordered (1.) lists, with basic indent nesting
//   - Blockquotes and dividers
//   - Inline bold (**/__), italic (*/_), bold+italic (***), and `code`,
//     applied uniformly to every block type - not just paragraphs.

export type ChatBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'bullet'; text: string; indent: number; ordered: boolean; number?: number }
    | { type: 'blockquote'; text: string }
    | { type: 'divider' }
    | { type: 'paragraph'; text: string };

export interface InlineToken {
    text: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
}

const INLINE_PATTERN = /(\*\*\*.+?\*\*\*)|(\*\*.+?\*\*)|(__.+?__)|(\*.+?\*)|(_.+?_)|(`.+?`)/g;

export const parseInlineMarkdown = (text: string): InlineToken[] => {
    const tokens: InlineToken[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    INLINE_PATTERN.lastIndex = 0;
    while ((match = INLINE_PATTERN.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ text: text.slice(lastIndex, match.index) });
        }

        const raw = match[0];
        if (raw.startsWith('***') && raw.endsWith('***')) {
            tokens.push({ text: raw.slice(3, -3), bold: true, italic: true });
        } else if (raw.startsWith('**') && raw.endsWith('**')) {
            tokens.push({ text: raw.slice(2, -2), bold: true });
        } else if (raw.startsWith('__') && raw.endsWith('__')) {
            tokens.push({ text: raw.slice(2, -2), bold: true });
        } else if (raw.startsWith('`') && raw.endsWith('`')) {
            tokens.push({ text: raw.slice(1, -1), code: true });
        } else if (raw.startsWith('*') && raw.endsWith('*')) {
            tokens.push({ text: raw.slice(1, -1), italic: true });
        } else if (raw.startsWith('_') && raw.endsWith('_')) {
            tokens.push({ text: raw.slice(1, -1), italic: true });
        } else {
            tokens.push({ text: raw });
        }

        lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
        tokens.push({ text: text.slice(lastIndex) });
    }

    return tokens.length > 0 ? tokens : [{ text }];
};

// Best-effort cleanup for stray LaTeX in model output. The system prompt asks
// the model not to use it, but LLMs don't always comply - this degrades
// gracefully into plain text instead of showing raw commands like \text{} or
// \quad, rather than trying to typeset math (no renderer for that here).
const LATEX_COMMAND_REPLACEMENTS: [RegExp, string][] = [
    [/\\text\{([^}]*)\}/g, '$1'],
    [/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)'],
    [/\\left|\\right/g, ''],
    [/\\quad|\\qquad/g, ' '],
    [/\\longleftrightarrow|\\leftrightarrow/g, '↔'],
    [/\\Rightarrow|\\rightarrow|\\to/g, '→'],
    [/\\times/g, '×'],
    [/\\cdot/g, '·'],
    [/\\div/g, '÷'],
    [/\\approx/g, '≈'],
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\pm/g, '±']
];

export const stripLatexArtifacts = (text: string): string => {
    let result = text
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]+?)\$/g, '$1');

    LATEX_COMMAND_REPLACEMENTS.forEach(([pattern, replacement]) => {
        result = result.replace(pattern, replacement);
    });

    // Catch-all for any remaining unrecognized LaTeX commands, e.g. \sum{x} or \alpha
    return result
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, '');
};

export const parseChatMarkdown = (markdown: string): ChatBlock[] => {
    const lines = stripLatexArtifacts(markdown).split('\n');
    const blocks: ChatBlock[] = [];

    lines.forEach(line => {
        if (!line.trim()) return;

        const leadingSpaces = line.search(/\S/);
        const indent = leadingSpaces > 0 ? Math.floor(leadingSpaces / 2) : 0;
        const trimmed = line.trim();

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
            return;
        }

        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            blocks.push({ type: 'divider' });
            return;
        }

        if (trimmed.startsWith('> ')) {
            blocks.push({ type: 'blockquote', text: trimmed.slice(2).trim() });
            return;
        }

        const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
        if (orderedMatch) {
            blocks.push({
                type: 'bullet',
                text: orderedMatch[2].trim(),
                indent,
                ordered: true,
                number: parseInt(orderedMatch[1], 10)
            });
            return;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
            blocks.push({ type: 'bullet', text: trimmed.slice(2).trim(), indent, ordered: false });
            return;
        }

        blocks.push({ type: 'paragraph', text: trimmed });
    });

    return blocks;
};
