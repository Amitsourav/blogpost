import { BlogOutput, SEOMetadata } from '../../../common/types';

type RichText = {
  type: 'text';
  text: { content: string; link?: { url: string } };
  annotations?: Record<string, boolean>;
};

type NotionBlock = {
  object: 'block';
  type: string;
  [key: string]: any;
};

export function mapBlogToNotionProperties(blog: BlogOutput, seo: SEOMetadata, coverImageUrl?: string) {
  const properties: Record<string, any> = {
    Title: {
      title: [{ text: { content: blog.title } }],
    },
    Slug: {
      rich_text: [{ text: { content: blog.slug } }],
    },
    Excerpt: {
      rich_text: [{ text: { content: blog.excerpt } }],
    },
    Author: {
      rich_text: [{ text: { content: blog.author } }],
    },
    Date: {
      date: { start: new Date().toISOString().split('T')[0] },
    },
    Catogery: {
      select: { name: blog.tags[0] || 'General' },
    },
    Tags: {
      multi_select: blog.tags.map((tag) => ({ name: tag })),
    },
    'Read Time': {
      rich_text: [{ text: { content: `${blog.readTimeMinutes} min read` } }],
    },
    Published: {
      checkbox: true,
    },
    'SEO title': {
      rich_text: [{ text: { content: seo.metaTitle } }],
    },
    'SEO Description': {
      rich_text: [{ text: { content: seo.metaDescription } }],
    },
    'SEO keyword': {
      rich_text: [{ text: { content: seo.focusKeyword } }],
    },
  };

  if (coverImageUrl) {
    properties['Cover image'] = {
      files: [
        {
          type: 'external',
          name: 'cover-image',
          external: { url: coverImageUrl },
        },
      ],
    };
  }

  return properties;
}

export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split('\n');
  const blocks: NotionBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // HTML table: <table> ... </table> (from post-processor)
    if (line.trim().startsWith('<table')) {
      const htmlTableBlock = parseHtmlTable(lines, i);
      if (htmlTableBlock) {
        blocks.push(htmlTableBlock.block);
        i = htmlTableBlock.endIndex;
        continue;
      }
    }

    // Skip HTML table inner tags that might be on their own lines
    if (line.trim().match(/^<\/?(thead|tbody|tr|th|td|table)>/)) {
      i++;
      continue;
    }

    // Markdown table fallback: starts with | and has a separator row (|---|)
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1]?.trim().match(/^\|[\s-:|]+\|$/)) {
      const tableBlock = parseTable(lines, i);
      if (tableBlock) {
        blocks.push(tableBlock.block);
        i = tableBlock.endIndex;
        continue;
      }
    }

    // Skip standalone separator rows (|---|---|)
    if (line.trim().match(/^\|[\s-:|]+\|$/)) {
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: parseInlineFormatting(line.slice(4).trim()),
        },
      });
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: parseInlineFormatting(line.slice(3).trim()),
        },
      });
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: parseInlineFormatting(line.slice(2).trim()),
        },
      });
      i++;
      continue;
    }

    // Bulleted list (- item or * item, but not **bold**) — also handles indented bullets
    if (line.match(/^\s*[-]\s/) || (line.match(/^\s*\*\s/) && !line.trimStart().startsWith('**'))) {
      const content = line.replace(/^\s*[-*]\s/, '');
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseInlineFormatting(content),
        },
      });
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: parseInlineFormatting(line.replace(/^\d+\.\s/, '')),
        },
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: parseInlineFormatting(line.slice(2).trim()),
        },
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim().match(/^[-*_]{3,}$/)) {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {},
      });
      i++;
      continue;
    }

    // Default: paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseInlineFormatting(line),
      },
    });
    i++;
  }

  return blocks;
}

function parseTable(lines: string[], startIndex: number): { block: NotionBlock; endIndex: number } | null {
  const headerLine = lines[startIndex]?.trim();
  if (!headerLine || !headerLine.startsWith('|')) return null;

  // Parse header cells
  const headerCells = parsePipeLine(headerLine);
  if (headerCells.length === 0) return null;

  const tableWidth = headerCells.length;

  // Skip separator row (|---|---|)
  let i = startIndex + 1;
  if (i < lines.length && lines[i].trim().match(/^\|[\s-:|]+\|$/)) {
    i++;
  }

  // Parse data rows
  const rows: string[][] = [headerCells];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    if (lines[i].trim().match(/^\|[\s-:|]+\|$/)) {
      i++;
      continue;
    }
    const cells = parsePipeLine(lines[i].trim());
    // Pad or trim to match header width
    while (cells.length < tableWidth) cells.push('');
    rows.push(cells.slice(0, tableWidth));
    i++;
  }

  // Build Notion table block
  const tableRows = rows.map((row, rowIndex) => ({
    object: 'block' as const,
    type: 'table_row',
    table_row: {
      cells: row.map((cell) => parseInlineFormatting(cell)),
    },
  }));

  const block: NotionBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: true,
      has_row_header: false,
      children: tableRows,
    },
  };

  return { block, endIndex: i };
}

function parsePipeLine(line: string): string[] {
  // Remove leading/trailing pipes and split
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function parseHtmlTable(lines: string[], startIndex: number): { block: NotionBlock; endIndex: number } | null {
  // Collect all lines until </table>
  let i = startIndex;
  let tableHtml = '';
  while (i < lines.length) {
    tableHtml += lines[i] + '\n';
    if (lines[i].trim().includes('</table>')) {
      i++;
      break;
    }
    i++;
  }

  // Extract header cells from <th> tags
  const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/);
  const headerCells: string[] = [];
  if (headerMatch) {
    const thRegex = /<th>(.*?)<\/th>/g;
    let thMatch;
    while ((thMatch = thRegex.exec(headerMatch[1])) !== null) {
      headerCells.push(unescapeHtml(thMatch[1]));
    }
  }

  if (headerCells.length === 0) return null;
  const tableWidth = headerCells.length;

  // Extract body rows from <td> tags
  const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/);
  const dataRows: string[][] = [];
  if (bodyMatch) {
    const trRegex = /<tr>([\s\S]*?)<\/tr>/g;
    let trMatch;
    while ((trMatch = trRegex.exec(bodyMatch[1])) !== null) {
      const row: string[] = [];
      const tdRegex = /<td>(.*?)<\/td>/g;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        row.push(unescapeHtml(tdMatch[1]));
      }
      while (row.length < tableWidth) row.push('');
      dataRows.push(row.slice(0, tableWidth));
    }
  }

  // Build Notion table block
  const allRows = [headerCells, ...dataRows];
  const tableRows = allRows.map((row) => ({
    object: 'block' as const,
    type: 'table_row',
    table_row: {
      cells: row.map((cell) => parseInlineFormatting(cell)),
    },
  }));

  const block: NotionBlock = {
    object: 'block',
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: true,
      has_row_header: false,
      children: tableRows,
    },
  };

  return { block, endIndex: i };
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function parseInlineFormatting(text: string): RichText[] {
  const segments: RichText[] = [];

  // Regex to match: **bold**, *italic*, [link text](url), or plain text
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) {
        segments.push({ type: 'text', text: { content: plain } });
      }
    }

    if (match[2]) {
      // Bold: **text**
      segments.push({
        type: 'text',
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3]) {
      // Italic: *text*
      segments.push({
        type: 'text',
        text: { content: match[3] },
        annotations: { italic: true },
      });
    } else if (match[4] && match[5]) {
      // Link: [text](url)
      segments.push({
        type: 'text',
        text: { content: match[4], link: { url: match[5] } },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) {
      segments.push({ type: 'text', text: { content: remaining } });
    }
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: { content: text } }];
}
