// Pure, framework-free helpers for the bookmarks feature.
//
// These functions do not touch the DOM or browser storage APIs directly —
// callers (the client-side <script> in Bookmarks.astro) own that side of
// things. Keeping this module pure lets it be unit tested with plain Node,
// no browser required.

export const STORAGE_KEY = 'mona-bookmarks';

export const SEPARATOR = ' :: ';

const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface Bookmark {
  url: string;
  slug: string;
}

/**
 * Normalise user input into an absolute URL string. Accepts input with or
 * without a scheme (e.g. "example.com" and "https://example.com" both
 * normalise to the same saved value). Returns null when the input can't be
 * parsed as a URL at all.
 */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

/**
 * Generate a short base62 slug with a "mona-" prefix, e.g. "mona-7fK2pQ".
 * Accepts a set of slugs already in use so callers can avoid collisions.
 */
export function generateSlug(existingSlugs: ReadonlySet<string> = new Set(), length = 6): string {
  let slug: string;
  do {
    let random = '';
    for (let i = 0; i < length; i++) {
      random += BASE62_ALPHABET[Math.floor(Math.random() * BASE62_ALPHABET.length)];
    }
    slug = `mona-${random}`;
  } while (existingSlugs.has(slug));
  return slug;
}

/** True when `value` looks like a well-formed bookmark record. */
export function isBookmark(value: unknown): value is Bookmark {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { url?: unknown }).url === 'string' &&
    (value as { url: string }).url.trim().length > 0 &&
    typeof (value as { slug?: unknown }).slug === 'string' &&
    (value as { slug: string }).slug.trim().length > 0
  );
}

/**
 * Parse a raw (untrusted) localStorage value into a clean bookmark array.
 * Never throws: empty, corrupted (invalid JSON), legacy (unexpected shape),
 * and non-array values all safely resolve to an empty list, and any
 * malformed entries within an otherwise-valid array are dropped.
 */
export function parseStoredBookmarks(raw: string | null): Bookmark[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isBookmark).map((entry) => ({ url: entry.url, slug: entry.slug }));
}

/** Serialize bookmarks for storage. */
export function serializeBookmarks(bookmarks: readonly Bookmark[]): string {
  return JSON.stringify(bookmarks);
}

/** Render a bookmark's display text as "<url> :: <slug>". */
export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}
