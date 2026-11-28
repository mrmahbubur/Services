/**
 * Shared Base64 & RFC 2397 Data URI utilities
 * Handles MIME type extraction, optional metadata parameters, whitespace,
 * multiline payloads, and URL-safe Base64 normalization consistently across
 * server bootstrap and API endpoints.
 */

export const DATA_URI_BASE64_PREFIX_RE =
  /^\s*data:(?:[^,;]*;)*\s*base64(?:\s*;[^,;]*)*\s*,\s*/i;

export const ANY_BASE64_PREFIX_RE =
  /^\s*(?:data:(?:[^,;]*;)*\s*)?base64(?:\s*;[^,;]*)*\s*[,:]\s*/i;

export const DATA_URI_BASE64_MATCH_RE =
  /^\s*data:(?:([^,;]*)(?:;[^,;]*)*;\s*)?base64(?:\s*;[^,;]*)*\s*,\s*([\s\S]+)$/i;

export interface StripBase64Options {
  /** Also strip bare `base64:` / `base64,` prefixes (used for env/config payloads). */
  allowBarePrefix?: boolean;
  /** Normalize URL-safe `-` / `_` characters to standard `+` / `/`. */
  normalizeUrlSafe?: boolean;
}

export function stripBase64DataUriPrefix(
  raw: string,
  options: StripBase64Options = {}
): string {
  const prefixRe = options.allowBarePrefix ? ANY_BASE64_PREFIX_RE : DATA_URI_BASE64_PREFIX_RE;
  let cleaned = String(raw || '')
    .trim()
    .replace(prefixRe, '')
    .replace(/\s+/g, '');

  if (options.normalizeUrlSafe) {
    cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  }
  return cleaned;
}

export function parseBase64DataUrl(
  dataUrl: string
): { mimeType: string; base64Data: string } | null {
  const match = String(dataUrl || '').match(DATA_URI_BASE64_MATCH_RE);
  if (!match) return null;
  const mimeType = (match[1] || '').trim() || 'application/octet-stream';
  const base64Data = match[2].replace(/\s+/g, '');
  if (!base64Data) return null;
  return { mimeType, base64Data };
}

export function decodeBase64JsonPayload(raw: string): Record<string, any> {
  let cleaned = String(raw || '').trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(ANY_BASE64_PREFIX_RE, '').trim();

  if (cleaned.startsWith('{')) {
    return JSON.parse(cleaned);
  }

  const normalizedB64 = stripBase64DataUriPrefix(cleaned, {
    allowBarePrefix: true,
    normalizeUrlSafe: true,
  });
  const decoded = Buffer.from(normalizedB64, 'base64').toString('utf8').trim();
  if (!decoded.startsWith('{')) {
    throw new Error('Payload is neither valid JSON nor base64-encoded JSON.');
  }
  return JSON.parse(decoded);
}
