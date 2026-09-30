export function safeMatchingReturn(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/app/matching/') || /\/\/|\\|[a-z][a-z\d+.-]*:|[\u0000-\u0020]/i.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/\/\/|\\|[a-z][a-z\d+.-]*:|[\u0000-\u001f]/i.test(decoded)) return null;
    return value;
  } catch { return null; }
}
