import { describe, expect, test } from 'vitest';
import {
  appendPipelineSignals,
  assessProvenance,
  pipelineSignalsForMatch,
  sha256Hex,
} from './provenance';

function concat(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
  segment.set(payload, 4);
  return segment;
}

function exifJpeg(fields: { make?: string; model?: string; software?: string }): Uint8Array {
  const entries = [
    fields.make ? { tag: 0x010f, value: fields.make } : null,
    fields.model ? { tag: 0x0110, value: fields.model } : null,
    fields.software ? { tag: 0x0131, value: fields.software } : null,
  ].filter((entry): entry is { tag: number; value: string } => Boolean(entry));
  const ifdSize = 2 + entries.length * 12 + 4;
  const strings = entries.map((entry) => concat(ascii(entry.value), new Uint8Array([0])));
  const tiff = new Uint8Array(8 + ifdSize + strings.reduce((total, value) => total + value.length, 0));
  const view = new DataView(tiff.buffer);
  tiff.set(ascii('II'), 0);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, entries.length, true);
  let stringOffset = 8 + ifdSize;
  entries.forEach((entry, index) => {
    const offset = 10 + index * 12;
    const value = strings[index]!;
    view.setUint16(offset, entry.tag, true);
    view.setUint16(offset + 2, 2, true);
    view.setUint32(offset + 4, value.length, true);
    view.setUint32(offset + 8, stringOffset, true);
    tiff.set(value, stringOffset);
    stringOffset += value.length;
  });
  view.setUint32(10 + entries.length * 12, 0, true);
  return concat(new Uint8Array([0xff, 0xd8]), jpegSegment(0xe1, concat(ascii('Exif'), new Uint8Array([0, 0]), tiff)), new Uint8Array([0xff, 0xd9]));
}

function png(width: number, height: number): Uint8Array {
  const header = new Uint8Array(33);
  const view = new DataView(header.buffer);
  header.set([137, 80, 78, 71, 13, 10, 26, 10]);
  view.setUint32(8, 13);
  header.set(ascii('IHDR'), 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  header.set([8, 2, 0, 0, 0], 24);
  return header;
}

function c2paJpeg(aiSpecific: boolean): Uint8Array {
  const manifest = ascii(`c2pa\0${aiSpecific ? 'c2pa.actions\0trainedAlgorithmicMedia' : 'signed-content'}`);
  const box = new Uint8Array(8 + manifest.length);
  new DataView(box.buffer).setUint32(0, box.length);
  box.set(ascii('jumb'), 4);
  box.set(manifest, 8);
  return concat(new Uint8Array([0xff, 0xd8]), jpegSegment(0xeb, box), new Uint8Array([0xff, 0xd9]));
}

function context(filename: string, mimeType: string, bytes: Uint8Array) {
  return { filename, mimeType, sizeBytes: bytes.byteLength };
}

describe('photo provenance assessment', () => {
  test('reads camera metadata without treating a missing thumbnail as suspicious', async () => {
    const bytes = exifJpeg({ make: 'Sony', model: 'ILCE-1', software: 'ILCE-1 v3.00' });

    const result = await assessProvenance(bytes, context('DSC00001.JPG', 'image/jpeg', bytes));

    expect(result.metadata).toMatchObject({ make: 'Sony', model: 'ILCE-1', software: 'ILCE-1 v3.00', hasExif: true });
    expect(result.signals.map((signal) => signal.code)).toEqual(['stripped_thumbnail']);
    expect(result.score).toBe(0);
  });

  test('flags a camera-less AI tool declaration with the maintained software rule', async () => {
    const bytes = exifJpeg({ software: 'Midjourney image generator' });

    const result = await assessProvenance(bytes, context('generated.jpg', 'image/jpeg', bytes));

    expect(result.signals.map((signal) => signal.code)).toEqual(['ai_software', 'no_camera', 'stripped_thumbnail']);
    expect(result.score).toBe(3);
  });

  test('combines format and common generator dimensions for a PNG without camera data', async () => {
    const bytes = png(1024, 1024);

    const result = await assessProvenance(bytes, context('image.png', 'image/png', bytes));

    expect(result.metadata).toMatchObject({ width: 1024, height: 1024, hasExif: false });
    expect(result.signals.map((signal) => signal.code)).toEqual(['no_exif', 'png_or_webp', 'ai_dimensions']);
    expect(result.score).toBe(3);
  });

  test('distinguishes informational Content Credentials from an AI-specific manifest', async () => {
    const neutral = c2paJpeg(false);
    const ai = c2paJpeg(true);

    const neutralResult = await assessProvenance(neutral, context('credentialed.jpg', 'image/jpeg', neutral));
    const aiResult = await assessProvenance(ai, context('credentialed-ai.jpg', 'image/jpeg', ai));

    expect(neutralResult.metadata.hasC2pa).toBe(true);
    expect(neutralResult.signals.map((signal) => signal.code)).toEqual(['no_exif', 'c2pa_present']);
    expect(aiResult.signals.map((signal) => signal.code)).toEqual(['c2pa_ai', 'no_exif']);
    expect(aiResult.score).toBe(3);
  });

  test('keeps an unreadable upload moving with a neutral result', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);

    await expect(assessProvenance(bytes, context('broken.jpg', 'image/jpeg', bytes))).resolves.toMatchObject({
      score: 0,
      signals: [{ code: 'unreadable', weight: 0 }],
      metadata: { hasExif: false },
      version: 1,
    });
  });

  test('appends detector and implausible-match signals idempotently and recomputes the cap', async () => {
    const bytes = exifJpeg({ make: 'Sony', model: 'ILCE-1' });
    const base = await assessProvenance(bytes, context('DSC00002.JPG', 'image/jpeg', bytes));
    const pipeline = [
      ...pipelineSignalsForMatch('no_shark', {}),
      ...pipelineSignalsForMatch('matched', { candidates: [{ score: 1 }, { score: 1 }] }),
    ];

    const once = appendPipelineSignals(base, pipeline);
    const twice = appendPipelineSignals(once, pipeline);

    expect(twice.signals.map((signal) => signal.code)).toEqual(['no_shark_detected', 'implausible_match', 'stripped_thumbnail']);
    expect(twice.score).toBe(2);
  });

  test('computes the upload hash from the original bytes', async () => {
    await expect(sha256Hex(ascii('abc'))).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
