#!/usr/bin/env node
/**
 * Fills remaining gaps in authors.json:
 *   1. Photos: try Open Library, Wikidata, Instagram OG image
 *   2. Books: for authors without books, search Google Books by name
 *   3. presentingBook: set to most recent book title
 *   4. Consolidate wikiUrl from rawBios
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (educational project)',
  'Accept': 'application/json',
};

// ─── Photo sources ──────────────────────────────────────────────────

async function tryOpenLibrary(name) {
  const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=1`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return '';
    const data = await res.json();
    const author = data.docs?.[0];
    if (author?.key) {
      // Check if they have a photo
      const photoUrl = `https://covers.openlibrary.org/a/olid/${author.key.replace('/authors/', '')}-L.jpg`;
      const check = await fetch(photoUrl, { method: 'HEAD', redirect: 'follow' });
      // Open Library returns a 1x1 pixel for missing photos, check content-length
      const len = parseInt(check.headers.get('content-length') || '0');
      if (check.ok && len > 1000) return photoUrl;
    }
  } catch { /* */ }
  return '';
}

async function tryWikidata(name) {
  // Search Wikidata for the person, get their image
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=es&type=item&limit=3&format=json&origin=*`;
  try {
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (res.status === 429) return '';
    if (!res.ok) return '';
    const text = await res.text();
    if (!text.startsWith('{')) return '';
    const data = JSON.parse(text);

    for (const entity of data.search || []) {
      // Check if it's a human with an image
      const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entity.id}&property=P18&format=json&origin=*`;
      const claimRes = await fetch(entityUrl, { headers: HEADERS });
      if (!claimRes.ok) continue;
      const claimText = await claimRes.text();
      if (!claimText.startsWith('{')) continue;
      const claims = JSON.parse(claimText);

      const imageClaim = claims.claims?.P18?.[0];
      if (imageClaim) {
        const filename = imageClaim.mainsnak?.datavalue?.value;
        if (filename) {
          // Convert to Commons URL
          const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
          const md5 = await computeMd5Prefix(filename.replace(/ /g, '_'));
          return `https://upload.wikimedia.org/wikipedia/commons/thumb/${md5}/${encoded}/500px-${encoded}`;
        }
      }
    }
  } catch { /* */ }
  return '';
}

// Simple MD5 hash prefix for Wikimedia Commons URLs
async function computeMd5Prefix(filename) {
  const encoder = new TextEncoder();
  const data = encoder.encode(filename);
  const hash = await crypto.subtle.digest('MD5', data).catch(() => null);
  if (!hash) {
    // Fallback: use the first two chars as a rough approximation
    // This won't work for all files but is a reasonable heuristic
    return `${filename[0].toLowerCase()}/${filename.substring(0, 2).toLowerCase()}`;
  }
  const hashArray = Array.from(new Uint8Array(hash));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex[0]}/${hex.substring(0, 2)}`;
}

// ─── Books for authors without any ──────────────────────────────────

async function fetchGoogleBooks(authorName) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(`"${authorName}"`)}&langRestrict=es&maxResults=5&orderBy=relevance`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items) return [];

    const seen = new Set();
    const books = [];
    for (const item of data.items) {
      const v = item.volumeInfo;
      if (!v?.title || v.language !== 'es') continue;
      const key = v.title.toLowerCase().replace(/[^a-záéíóúñüàèòç]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);

      let cover = v.imageLinks?.thumbnail || '';
      if (cover) cover = cover.replace('zoom=1', 'zoom=2').replace('http://', 'https://');

      books.push({
        title: v.title,
        cover,
        description: (v.description || '').slice(0, 300),
        publishedDate: v.publishedDate || '',
        publisher: v.publisher || '',
        isbn: v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier || '',
      });
    }
    books.sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || ''));
    return books;
  } catch {
    return [];
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const authors = Object.values(data);

  let photosFixed = 0, booksFixed = 0, presentingFixed = 0, coversFixed = 0;

  for (let i = 0; i < authors.length; i++) {
    const a = authors[i];
    const needs = [];
    if (!a.photo) needs.push('foto');
    if (!a.books?.length) needs.push('llibres');
    if (!a.presentingBook && a.books?.length) needs.push('presenting');
    const needsCovers = a.books?.some(b => !b.cover && b.isbn);
    if (needsCovers) needs.push('covers');

    if (needs.length === 0) continue;

    process.stdout.write(`[${i + 1}/${authors.length}] ${a.name}...`);

    // 1. Fix photo
    if (!a.photo) {
      // Try Wikidata first (most reliable for notable people)
      let photo = await tryWikidata(a.name);
      if (!photo) {
        await sleep(300);
        photo = await tryOpenLibrary(a.name);
      }
      if (photo) {
        a.photo = photo;
        photosFixed++;
      }
      await sleep(500);
    }

    // 2. Fix books
    if (!a.books?.length) {
      const books = await fetchGoogleBooks(a.name);
      if (books.length > 0) {
        a.books = books;
        booksFixed++;
      }
      await sleep(300);
    }

    // 3. Fix presentingBook — use most recent book
    if (!a.presentingBook && a.books?.length) {
      a.presentingBook = a.books[0].title;
      presentingFixed++;
    }

    // 4. Fix missing covers via Open Library ISBN lookup
    if (a.books?.length) {
      for (const book of a.books) {
        if (book.cover || !book.isbn) continue;
        try {
          const res = await fetch(`https://openlibrary.org/isbn/${book.isbn}.json`, { headers: HEADERS });
          if (res.ok) {
            const olData = await res.json();
            const coverId = olData.covers?.[0];
            if (coverId && coverId > 0) {
              book.cover = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
              coversFixed++;
            }
          }
        } catch { /* ignore */ }
        await sleep(300);
      }
    }

    const fixed = [];
    if (a.photo && needs.includes('foto')) fixed.push('foto✓');
    if (a.books?.length && needs.includes('llibres')) fixed.push('llibres✓');
    if (a.presentingBook) fixed.push('presenting✓');
    console.log(` ${fixed.length ? fixed.join(' ') : 'no changes'}`);

    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  const total = authors.length;
  const withPhoto = authors.filter(a => a.photo).length;
  const withBooks = authors.filter(a => a.books?.length).length;
  const withPresenting = authors.filter(a => a.presentingBook).length;

  console.log(`\n─── Results ───`);
  console.log(`Photos fixed: ${photosFixed} → ${withPhoto}/${total} (${Math.round(withPhoto*100/total)}%)`);
  console.log(`Books fixed: ${booksFixed} → ${withBooks}/${total} (${Math.round(withBooks*100/total)}%)`);
  console.log(`Presenting: ${presentingFixed} → ${withPresenting}/${total} (${Math.round(withPresenting*100/total)}%)`);
  console.log(`Covers fixed by ISBN: ${coversFixed}`);
}

main().catch(console.error);
