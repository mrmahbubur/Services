/**
 * MRS Core — Binary Evidence Inspector, Metadata Stripper & Perceptual Hash Engine
 * Verifies real magic bytes, enforces minimum pixel resolution, re-encodes images cleanly
 * to strip EXIF/XMP/IPTC metadata, and computes SHA-256 + 64-bit pHash for duplicate detection.
 */

import crypto from 'crypto';
import { Jimp, JimpMime, compareHashes } from 'jimp';

export interface InspectedEvidence {
  mimeType: string;
  sanitizedBase64: string;
  dataUrl: string;
  sha256: string;
  pHash?: string;
  width?: number;
  height?: number;
  resolutionOk: boolean;
  reencoded: boolean;
  detail: string;
}

export function detectMagicMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function areHashesPerceptuallySimilar(hashA?: string, hashB?: string, maxDistance = 0.14): boolean {
  if (!hashA || !hashB) return false;
  if (hashA === hashB) return true;
  try {
    return compareHashes(hashA, hashB) <= maxDistance;
  } catch {
    return false;
  }
}

export const DATA_URI_BASE64_PREFIX_RE =
  /^\s*data:(?:[^,;]*;)*\s*base64(?:\s*;[^,;]*)*\s*,\s*/i;

export const DATA_URI_BASE64_MATCH_RE =
  /^\s*data:([^,;]*)(?:;[^,;]*)*;\s*base64(?:\s*;[^,;]*)*\s*,\s*([\s\S]+)$/i;

export function stripBase64DataUriPrefix(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(DATA_URI_BASE64_PREFIX_RE, '')
    .replace(/\s+/g, '');
}

export function parseBase64DataUrl(
  dataUrl: string
): { mimeType: string; base64Data: string } | null {
  const match = String(dataUrl || '').match(DATA_URI_BASE64_MATCH_RE);
  if (!match) return null;
  const mimeType = match[1].trim() || 'application/octet-stream';
  const base64Data = match[2].replace(/\s+/g, '');
  if (!base64Data) return null;
  return { mimeType, base64Data };
}

export async function inspectAndSanitizeEvidence(
  rawBase64: string,
  opts: { minWidth?: number; minHeight?: number } = {}
): Promise<InspectedEvidence> {
  const minWidth = opts.minWidth ?? 160;
  const minHeight = opts.minHeight ?? 160;

  const cleanB64 = stripBase64DataUriPrefix(rawBase64);
  const buf = Buffer.from(cleanB64, 'base64');
  if (buf.length === 0) {
    throw new Error('Uploaded receipt file is empty.');
  }
  if (buf.length > 5 * 1024 * 1024) {
    throw new Error('Evidence file must be under 5 MB.');
  }

  const detectedMime = detectMagicMime(buf);
  if (!detectedMime) {
    throw new Error('Unsupported evidence format. Allowed: PNG, JPEG, WebP, or PDF.');
  }

  if (detectedMime === 'application/pdf') {
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    return {
      mimeType: detectedMime,
      sanitizedBase64: cleanB64,
      dataUrl: `data:${detectedMime};base64,${cleanB64}`,
      sha256,
      resolutionOk: buf.length >= 512,
      reencoded: false,
      detail: `Verified PDF receipt (${Math.round(buf.length / 1024)} KB).`,
    };
  }

  // Image path (PNG / JPEG / WebP): decode pixels, compute pHash, verify resolution, re-encode cleanly (strips EXIF/metadata)
  try {
    const image = await Jimp.read(buf);
    const width = image.width || 0;
    const height = image.height || 0;
    const pHash = image.pHash();

    // Downscale oversized screenshots mildly for storage hygiene while preserving crisp readability
    if (width > 1800) {
      image.resize({ w: 1800 });
    }

    const outMime = detectedMime === 'image/jpeg' ? JimpMime.jpeg : JimpMime.png;
    const cleanBuffer = await image.getBuffer(outMime);
    const sanitizedBase64 = cleanBuffer.toString('base64');
    const sha256 = crypto.createHash('sha256').update(cleanBuffer).digest('hex');
    const resolutionOk = width >= minWidth && height >= minHeight;

    return {
      mimeType: outMime,
      sanitizedBase64,
      dataUrl: `data:${outMime};base64,${sanitizedBase64}`,
      sha256,
      pHash,
      width,
      height,
      resolutionOk,
      reencoded: true,
      detail: `Re-encoded ${outMime} (${width}x${height}px), EXIF stripped, pHash & SHA-256 computed.`,
    };
  } catch {
    // Fallback if exotic WebP bitstream fails pure-JS decode: still keep magic-byte check & SHA-256
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    return {
      mimeType: detectedMime,
      sanitizedBase64: cleanB64,
      dataUrl: `data:${detectedMime};base64,${cleanB64}`,
      sha256,
      resolutionOk: buf.length >= 1024,
      reencoded: false,
      detail: `Verified ${detectedMime} binary receipt (${Math.round(buf.length / 1024)} KB).`,
    };
  }
}
