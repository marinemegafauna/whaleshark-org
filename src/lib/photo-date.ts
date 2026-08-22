export function extractExifDate(buffer: ArrayBuffer): string | null {
  const text = new TextDecoder('latin1').decode(buffer);
  const match = text.match(/(20\d{2}):(\d{2}):(\d{2})[ T]\d{2}:\d{2}:\d{2}/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function dateFromExif(file: File): Promise<string | null> {
  if (!file.type.includes('jpeg') && !/\.jpe?g$/i.test(file.name)) return null;
  return extractExifDate(await file.slice(0, 131_072).arrayBuffer());
}
