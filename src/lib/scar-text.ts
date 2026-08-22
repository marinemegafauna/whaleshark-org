import type { Species } from './species';

const SCAR_KEYWORDS = /\b(?:scar|injur|wound|cut|bite|prop|rope|net|amput|missing|damage|heal|fresh|abras|lacer|fin)\w*/i;

function plainText(value: string): string {
  return value
    .replace(/<\/(?:p|div|li|br|tr|h[1-6])\s*>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\.+/g, '$1')
    .trim();
}

export function extractScarSentences(...values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const matches: string[] = [];
  for (const value of values) {
    if (!value?.trim()) continue;
    for (const sentence of plainText(value).split(/(?<=[.!?])\s+/)) {
      const clean = sentence.trim();
      if (!clean || !SCAR_KEYWORDS.test(clean) || seen.has(clean)) continue;
      seen.add(clean);
      matches.push(clean);
    }
  }
  return matches;
}

export function suggestScarFields(text: string, species: Species): Record<string, string> {
  const allowed = new Map(species.fields.map((field) => [field.id, new Set((field.options ?? []).map((option) => option.id))]));
  const suggestions: Record<string, string> = {};
  for (const hint of species.text_hints) {
    if (!new RegExp(hint.pattern, 'i').test(text)) continue;
    for (const [fieldId, optionId] of Object.entries(hint.values)) {
      if (allowed.get(fieldId)?.has(optionId)) suggestions[fieldId] = optionId;
    }
  }
  return suggestions;
}
