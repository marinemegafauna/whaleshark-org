import exifr from 'exifr';
import { parse } from 'yaml';
import provenanceSource from '../../content/pages/provenance.md?raw';

export type ProvenanceSignalCode =
  | 'no_exif'
  | 'no_camera'
  | 'ai_software'
  | 'c2pa_ai'
  | 'c2pa_present'
  | 'heavy_edit'
  | 'png_or_webp'
  | 'ai_dimensions'
  | 'stripped_thumbnail'
  | 'unreadable'
  | 'no_shark_detected'
  | 'implausible_match'
  | 'duplicate_in_batch'
  | 'known_catalogue_image';

export type ProvenanceSignal = {
  code: ProvenanceSignalCode;
  weight: 0 | 1 | 2;
  label: string;
  detail?: string;
};

export type ProvenanceMetadata = {
  make?: string;
  model?: string;
  lens?: string;
  software?: string;
  dateTimeOriginal?: string;
  gps?: { lat: number; lon: number };
  width?: number;
  height?: number;
  hasExif: boolean;
  hasXmp: boolean;
  hasIptc: boolean;
  hasC2pa: boolean;
};

export type ProvenanceResult = {
  score: 0 | 1 | 2 | 3;
  signals: ProvenanceSignal[];
  metadata: ProvenanceMetadata;
  version: 1;
};

export type PipelineSignal = Pick<ProvenanceSignal, 'code' | 'weight' | 'detail'>;

type ProvenanceConfig = {
  aiTools: string[];
  signals: Record<ProvenanceSignalCode, string>;
};

const frontmatter = provenanceSource.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
if (!frontmatter) throw new Error('Provenance content requires YAML frontmatter');
const config = parse(frontmatter) as ProvenanceConfig;

const parserOptions = {
  tiff: true,
  exif: true,
  gps: true,
  xmp: true,
  iptc: true,
  icc: false,
  jfif: true,
  ihdr: true,
};

const editorNames = ['photoshop', 'lightroom', 'luminar', 'topaz', 'affinity', 'gimp', 'pixelmator', 'snapseed'];
const generatorDimensions = new Set([
  '512x512', '768x768', '1024x1024', '1536x1536', '2048x2048',
  '1024x1792', '1792x1024', '1344x768', '768x1344', '1152x896', '896x1152',
]);

function bytesView(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function decoded(input: Uint8Array): string {
  return new TextDecoder('latin1').decode(input);
}

function imageSignature(bytes: Uint8Array): boolean {
  const ascii = decoded(bytes.subarray(0, 16));
  return (bytes[0] === 0xff && bytes[1] === 0xd8)
    || (bytes[0] === 0x89 && ascii.slice(1, 4) === 'PNG')
    || ascii.startsWith('II*\0')
    || ascii.startsWith('MM\0*')
    || (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')
    || ascii.slice(4, 8) === 'ftyp';
}

function numberValue(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function searchableValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(searchableValue);
  if (value && typeof value === 'object') return Object.values(value).flatMap(searchableValue);
  const string = stringValue(value);
  return string ? [string] : [];
}

function manifestText(bytes: Uint8Array): string | null {
  const text = decoded(bytes);
  let offset = text.indexOf('jumb');
  while (offset >= 0) {
    if (offset >= 4) {
      const length = new DataView(bytes.buffer, bytes.byteOffset + offset - 4, 4).getUint32(0);
      const start = offset - 4;
      const end = start + length;
      if (length >= 8 && end <= bytes.length) {
        const boxText = decoded(bytes.subarray(start, end));
        if (/c2pa/i.test(boxText)) return boxText;
      }
    }
    offset = text.indexOf('jumb', offset + 4);
  }
  return null;
}

function hasAscii(text: string, pattern: string): boolean {
  return text.includes(pattern);
}

function signal(code: ProvenanceSignalCode, weight: 0 | 1 | 2, detail?: string): ProvenanceSignal {
  return { code, weight, label: config.signals[code], ...(detail ? { detail } : {}) };
}

function sortedSignals(signals: ProvenanceSignal[]): ProvenanceSignal[] {
  return signals.map((entry, index) => ({ entry, index }))
    .sort((left, right) => right.entry.weight - left.entry.weight || left.index - right.index)
    .map(({ entry }) => entry);
}

function result(signals: ProvenanceSignal[], metadata: ProvenanceMetadata): ProvenanceResult {
  const score = Math.min(3, signals.reduce((sum, entry) => sum + entry.weight, 0)) as ProvenanceResult['score'];
  return { score, signals: sortedSignals(signals), metadata, version: 1 };
}

function unreadableResult(): ProvenanceResult {
  return result([signal('unreadable', 0)], { hasExif: false, hasXmp: false, hasIptc: false, hasC2pa: false });
}

export async function assessProvenance(
  input: ArrayBuffer | Uint8Array,
  ctx: { filename: string; mimeType: string; sizeBytes: number },
): Promise<ProvenanceResult> {
  const bytes = bytesView(input);
  if (!imageSignature(bytes)) return unreadableResult();

  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await exifr.parse(bytes, parserOptions) ?? {}) as Record<string, unknown>;
  } catch {
    return unreadableResult();
  }

  const text = decoded(bytes);
  const make = stringValue(parsed.Make);
  const model = stringValue(parsed.Model);
  const lens = stringValue(parsed.LensModel ?? parsed.Lens);
  const software = stringValue(parsed.Software ?? parsed.CreatorTool ?? parsed['xmp:CreatorTool'] ?? parsed.OriginatingProgram ?? parsed.Program);
  const dateTimeOriginal = stringValue(parsed.DateTimeOriginal);
  const lat = numberValue(parsed.latitude ?? parsed.GPSLatitude);
  const lon = numberValue(parsed.longitude ?? parsed.GPSLongitude);
  const width = numberValue(parsed.ExifImageWidth ?? parsed.ImageWidth ?? parsed.PixelXDimension);
  const height = numberValue(parsed.ExifImageHeight ?? parsed.ImageHeight ?? parsed.PixelYDimension);
  const hasExif = hasAscii(text, 'Exif\0\0') || /^[IM]{2}/.test(text.slice(0, 2)) || [parsed.ExifVersion, parsed.DateTimeOriginal, parsed.Make, parsed.Model].some((value) => value !== undefined);
  const hasXmp = /<x:xmpmeta|ns\.adobe\.com\/xap\/1\.0|xmp:CreatorTool/i.test(text)
    || [parsed.CreatorTool, parsed['xmp:CreatorTool'], parsed.DigitalSourceType].some((value) => value !== undefined);
  const hasIptc = hasAscii(text, '8BIM') || hasAscii(text, '\u001c\u0002') || [parsed.OriginatingProgram, parsed.Program].some((value) => value !== undefined);
  const c2pa = manifestText(bytes);
  const metadata: ProvenanceMetadata = {
    ...(make ? { make } : {}),
    ...(model ? { model } : {}),
    ...(lens ? { lens } : {}),
    ...(software ? { software } : {}),
    ...(dateTimeOriginal ? { dateTimeOriginal } : {}),
    ...(lat !== undefined && lon !== undefined ? { gps: { lat, lon } } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    hasExif,
    hasXmp,
    hasIptc,
    hasC2pa: Boolean(c2pa),
  };

  const signals: ProvenanceSignal[] = [];
  if (!hasExif) signals.push(signal('no_exif', 1));
  if (hasExif && !make && !model) signals.push(signal('no_camera', 1));

  const sourceFields = [
    parsed.Software, parsed.CreatorTool, parsed['xmp:CreatorTool'], parsed.OriginatingProgram, parsed.Program,
    parsed['dc:description'], parsed.Description, parsed['Iptc4xmpExt:DigitalSourceType'], parsed.DigitalSourceType,
  ].flatMap(searchableValue);
  const aiDeclaration = sourceFields.find((value) => {
    const lower = value.toLocaleLowerCase();
    return /trainedalgorithmicmedia|compositewithtrainedalgorithmicmedia/.test(lower)
      || config.aiTools.some((tool) => lower.includes(tool.toLocaleLowerCase()));
  });
  if (aiDeclaration) signals.push(signal('ai_software', 2, aiDeclaration));

  if (c2pa) {
    if (/(?:c2pa\.actions|c2pa\.created)[\s\S]*trainedalgorithmicmedia/i.test(c2pa)) signals.push(signal('c2pa_ai', 2));
    else signals.push(signal('c2pa_present', 0));
  }
  if (software && !make && !model && editorNames.some((editor) => software.toLocaleLowerCase().includes(editor))) {
    signals.push(signal('heavy_edit', 1, software));
  }
  if (ctx.mimeType.toLocaleLowerCase() === 'image/png' || ctx.mimeType.toLocaleLowerCase() === 'image/webp') {
    signals.push(signal('png_or_webp', 1));
  }
  if (width !== undefined && height !== undefined && generatorDimensions.has(`${width}x${height}`)) {
    signals.push(signal('ai_dimensions', 1, `${width}×${height}`));
  }
  if (hasExif && !(numberValue(parsed.ThumbnailOffset) !== undefined && numberValue(parsed.ThumbnailLength) !== undefined)) {
    signals.push(signal('stripped_thumbnail', 0));
  }
  return result(signals, metadata);
}

export function appendPipelineSignals(base: ProvenanceResult, additions: PipelineSignal[]): ProvenanceResult {
  const byCode = new Map(base.signals.map((entry) => [entry.code, entry]));
  for (const addition of additions) byCode.set(addition.code, signal(addition.code, addition.weight, addition.detail));
  return result([...byCode.values()], base.metadata);
}

export function pipelineSignalsForMatch(status: string, match: Record<string, unknown>): PipelineSignal[] {
  const additions: PipelineSignal[] = [];
  if (status === 'no_shark') additions.push({ code: 'no_shark_detected', weight: 1 });

  const candidates = Array.isArray(match.candidates) ? match.candidates.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object') : [];
  const candidateScores = candidates.map((candidate) => numberValue(candidate.score)).filter((score): score is number => score !== undefined);
  const perfectNoGap = candidateScores.length >= 2 && candidateScores[0]! >= 0.999999 && Math.abs(candidateScores[0]! - candidateScores[1]!) < 1e-9;
  const viewpoints = Array.isArray(match.viewpoints) ? match.viewpoints.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object') : [];
  const viewpointScores = viewpoints.map((viewpoint) => {
    const nested = Array.isArray(viewpoint.candidates) && viewpoint.candidates[0] && typeof viewpoint.candidates[0] === 'object'
      ? numberValue((viewpoint.candidates[0] as Record<string, unknown>).score)
      : numberValue(viewpoint.topScore ?? viewpoint.score);
    return nested;
  });
  const perfectEveryViewpoint = viewpointScores.length > 0 && viewpointScores.every((score) => score !== undefined && score >= 0.995);
  if (perfectNoGap || perfectEveryViewpoint) additions.push({ code: 'implausible_match', weight: 1 });
  return additions;
}

export function parseProvenanceResult(value: string | null | undefined): ProvenanceResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ProvenanceResult;
    if (parsed?.version !== 1 || !Array.isArray(parsed.signals) || !parsed.metadata || typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytesView(input)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
