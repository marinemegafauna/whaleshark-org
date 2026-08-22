export function fillTemplate(value: string, replacements: Record<string, string | number>): string {
  const result = value.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key]) : match,
  );
  const unresolved = result.match(/\{([a-zA-Z][a-zA-Z0-9]*)\}/);
  if (unresolved) throw new Error(`Unresolved placeholder: ${unresolved[0]}`);
  return result;
}

export function renderMarkdownInline(value: string): string {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, ' ');
  const linked = escaped.replace(
      /\[([^\]]+)\]\(((?:\/|https:\/\/|mailto:)[^)]+)\)/g,
      '<a href="$2">$1</a>',
  );
  const strong = linked.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return strong.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function renderMarkdownBlocks(value: string): string {
  return value.trim().split(/\r?\n\s*\r?\n/).map((paragraph) => `<p>${renderMarkdownInline(paragraph)}</p>`).join('');
}
