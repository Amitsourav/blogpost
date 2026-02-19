/**
 * Post-processes AI-generated markdown to fix formatting issues that break
 * on website renderers (bold inside bullets, markdown tables).
 */
export function postProcessContent(content: string): string {
  let result = stripBoldFromBullets(content);
  result = convertMarkdownTablesToHtml(result);
  result = removeUnwantedSections(result);
  return result;
}

/**
 * Removes **bold** formatting from inside bullet points.
 * "- **Label:** text" → "- Label: text"
 * Leaves standalone bold paragraphs untouched (e.g., "**Typical advantages:**").
 */
function stripBoldFromBullets(content: string): string {
  return content.replace(/^(\s*[-*]\s.*)$/gm, (line) => {
    return line.replace(/\*\*(.+?)\*\*/g, '$1');
  });
}

/**
 * Converts markdown pipe tables to HTML <table> tags.
 * This ensures tables render on websites whose markdown renderer
 * doesn't support GFM tables, while our Notion mapper handles HTML tables too.
 */
function convertMarkdownTablesToHtml(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect table start: line with pipes + next line is separator (|---|)
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().match(/^\|[\s-:|]+\|$/)
    ) {
      const tableHtml = parseMarkdownTable(lines, i);
      result.push(tableHtml.html);
      i = tableHtml.endIndex;
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

function parseMarkdownTable(
  lines: string[],
  startIndex: number,
): { html: string; endIndex: number } {
  // Parse header row
  const headerCells = parsePipeRow(lines[startIndex]);

  // Skip separator row
  let i = startIndex + 1;
  if (i < lines.length && lines[i].trim().match(/^\|[\s-:|]+\|$/)) {
    i++;
  }

  // Parse data rows
  const dataRows: string[][] = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    if (lines[i].trim().match(/^\|[\s-:|]+\|$/)) {
      i++;
      continue;
    }
    dataRows.push(parsePipeRow(lines[i]));
    i++;
  }

  // Build HTML
  const headerHtml = headerCells
    .map((cell) => `<th>${escapeHtml(cell)}</th>`)
    .join('');
  const bodyHtml = dataRows
    .map(
      (row) =>
        '<tr>' +
        row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join('') +
        '</tr>',
    )
    .join('\n');

  const html = `<table>
<thead><tr>${headerHtml}</tr></thead>
<tbody>
${bodyHtml}
</tbody>
</table>`;

  return { html, endIndex: i };
}

function parsePipeRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

/**
 * Removes "Sources Checked" and "FundMyCampus Mention" (or similar) sections
 * that should not appear on the public blog. Strips from the heading to the
 * next heading or end of content.
 */
function removeUnwantedSections(content: string): string {
  // Pattern: ## heading that matches unwanted sections, up to the next ## heading or end
  const unwantedHeadings = [
    /^##\s+sources?\s*(checked|referenced|cited|used)/im,
    /^##\s+fundmycampus\s+mention/im,
    /^##\s+brand\s+mention/im,
    /^##\s+references?/im,
  ];

  let result = content;
  for (const pattern of unwantedHeadings) {
    result = result.replace(
      new RegExp(
        // Match the heading line + everything until the next ## heading or end of string
        `${pattern.source}[\\s\\S]*?(?=\\n##\\s|$)`,
        'im',
      ),
      '',
    );
  }

  // Clean up multiple consecutive blank lines left behind
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
