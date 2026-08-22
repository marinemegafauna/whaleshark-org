export function fillTemplate(value: string, replacements: Record<string, string | number>): string {
  const result = value.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key]) : match,
  );
  const unresolved = result.match(/\{([a-zA-Z][a-zA-Z0-9]*)\}/);
  if (unresolved) throw new Error(`Unresolved placeholder: ${unresolved[0]}`);
  return result;
}

export function renderMarkdownBlocks(value: string): string {
  return value.trim().split(/\r?\n\s*\r?\n/).map((paragraph) => {
    const escaped = paragraph
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\r?\n/g, ' ');
    return `<p>${escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
  }).join('');
}
