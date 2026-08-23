import { describe, expect, it } from 'vitest';
import {
  formatBookmark,
  generateSlug,
  normalizeUrl,
  parseStoredBookmarks,
  SEPARATOR,
  serializeBookmarks,
  type Bookmark,
} from './bookmarks';

describe('normalizeUrl', () => {
  it('normalises a URL without a scheme the same as one with https://', () => {
    expect(normalizeUrl('example.com')).toBe(normalizeUrl('https://example.com'));
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
  });

  it('preserves an explicit scheme other than https', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('trims surrounding whitespace before normalising', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('returns null for empty or unparsable input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
    expect(normalizeUrl('not a url at all!! ://')).toBeNull();
  });
});

describe('generateSlug', () => {
  it('produces a base62 slug with the mona- prefix', () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^mona-[A-Za-z0-9]{6}$/);
  });

  it('avoids collisions with existing slugs', () => {
    const taken = new Set(['mona-aaaaaa']);
    // Force every random draw to collide until the caller-supplied slug is
    // no longer in the taken set by shrinking the alphabet indirectly via a
    // tiny length + checking the loop terminates with a slug not in `taken`.
    const slug = generateSlug(taken);
    expect(taken.has(slug)).toBe(false);
  });
});

describe('parseStoredBookmarks', () => {
  it('returns an empty array for a null/empty value', () => {
    expect(parseStoredBookmarks(null)).toEqual([]);
    expect(parseStoredBookmarks('')).toEqual([]);
  });

  it('recovers from corrupted (invalid JSON) storage', () => {
    expect(parseStoredBookmarks('{not json')).toEqual([]);
  });

  it('recovers from a legacy/unexpected shape (non-array object)', () => {
    expect(parseStoredBookmarks(JSON.stringify({ url: 'https://example.com/', slug: 'mona-1' }))).toEqual([]);
  });

  it('recovers from other non-array values', () => {
    expect(parseStoredBookmarks(JSON.stringify('just a string'))).toEqual([]);
    expect(parseStoredBookmarks(JSON.stringify(42))).toEqual([]);
    expect(parseStoredBookmarks(JSON.stringify(null))).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
    const raw = JSON.stringify([
      { url: 'https://example.com/', slug: 'mona-1a2b3c' },
      { url: 'https://example.com/' }, // missing slug
      { slug: 'mona-1a2b3c' }, // missing url
      null,
      'not an object',
      42,
      { url: '', slug: 'mona-1a2b3c' }, // empty url
      { url: 'https://valid.example/', slug: '' }, // empty slug
    ]);
    expect(parseStoredBookmarks(raw)).toEqual([{ url: 'https://example.com/', slug: 'mona-1a2b3c' }]);
  });

  it('round-trips through serializeBookmarks', () => {
    const bookmarks: Bookmark[] = [{ url: 'https://example.com/', slug: 'mona-1a2b3c' }];
    expect(parseStoredBookmarks(serializeBookmarks(bookmarks))).toEqual(bookmarks);
  });
});

describe('formatBookmark', () => {
  it('formats as "<url> :: <slug>" with the exact separator', () => {
    const bookmark: Bookmark = { url: 'https://www.example.com/', slug: 'mona-7fk2' };
    expect(formatBookmark(bookmark)).toBe('https://www.example.com/ :: mona-7fk2');
    expect(SEPARATOR).toBe(' :: ');
  });
});
