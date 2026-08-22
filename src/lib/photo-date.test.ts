import { describe, expect, test } from 'vitest';
import { extractExifDate, localIsoDate } from './photo-date';

describe('photo encounter date', () => {
  test('extracts the first EXIF-style DateTime value as an ISO date', () => {
    const bytes = new TextEncoder().encode('Exif\x00\x00DateTimeOriginal\x002026:08:14 14:30:02\x00');
    expect(extractExifDate(bytes.buffer)).toBe('2026-08-14');
  });

  test('returns null when the image prefix has no EXIF-style date', () => {
    expect(extractExifDate(new TextEncoder().encode('PNG image data').buffer)).toBeNull();
  });

  test('formats the calendar date in the runtime local timezone', () => {
    const date = new Date(2026, 7, 22, 0, 30);
    expect(localIsoDate(date)).toBe('2026-08-22');
  });
});
