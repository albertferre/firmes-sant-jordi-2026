#!/usr/bin/env node
/**
 * Final cleanup pass for authors.json:
 *   - Remove publisher social links (Planeta, etc.)
 *   - Remove Google Books placeholder covers
 *   - Deduplicate books (packs, bilingual variants, editions)
 *   - Reorder books (covers first)
 *   - Remove JSON-LD from rawBios.planeta
 *   - Remove unused fields (facebook, youtube, tiktok, wikimediaCommons from links)
 *   - Set presentingBook from first book if missing
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalize as unicodeNormalize } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

function norm(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split('/')[0].split(':')[0]
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\bedicion\s*\w*/gi, '')
    .replace(/\bespecial\b/gi, '')
    .replace(/\bed\s+\w+/gi, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
const stats = { publisherLinks: 0, placeholderCovers: 0, dupBooks: 0, reordered: 0, planetaJson: 0 };

const badDomains = ['planetadelibros', 'planetacomic', 'destino_', 'diana_editorial'];
const unwantedLinkKeys = ['facebook', 'youtube', 'tiktok', 'wikimediaCommons'];
const packPattern = /\b(estuche|pack|cofre|box set)\b/i;

for (const a of Object.values(data)) {
  const links = a.links || {};

  // 1. Remove unwanted social link fields
  for (const k of unwantedLinkKeys) {
    if (k in links) { delete links[k]; stats.publisherLinks++; }
  }
  // Remove publisher accounts from twitter/instagram
  for (const k of ['twitter', 'instagram', 'website']) {
    if (links[k] && badDomains.some(d => links[k].toLowerCase().includes(d))) {
      delete links[k]; stats.publisherLinks++;
    }
  }

  // 2. Clean rawBios.planeta JSON-LD
  const rb = a.rawBios || {};
  if (rb.planeta && (rb.planeta.startsWith('{') || rb.planeta.startsWith('['))) {
    rb.planeta = '';
    stats.planetaJson++;
  }

  // 3. Remove placeholder Google Books covers
  for (const b of a.books || []) {
    if (b.cover && b.cover.includes('books.google.com') && (b.cover.includes('CAAJ') || b.cover.includes('AAAJ'))) {
      b.cover = '';
      stats.placeholderCovers++;
    }
  }

  // 4. Deduplicate books
  if (a.books?.length > 1) {
    const seen = {};
    const clean = [];
    const individualTitles = new Set(a.books.filter(b => !packPattern.test(b.title)).map(b => norm(b.title)));

    for (const b of a.books) {
      const key = norm(b.title);
      if (!key) continue;
      // Skip packs if we have individual books
      if (packPattern.test(b.title) && individualTitles.size >= 2) { stats.dupBooks++; continue; }
      if (key in seen) {
        const existing = seen[key];
        const sNew = (b.cover ? 10 : 0) + (b.isbn ? 3 : 0) + (b.description ? 1 : 0) + (b.url ? 2 : 0) + (b.title.length < 50 ? 1 : 0);
        const sOld = (existing.cover ? 10 : 0) + (existing.isbn ? 3 : 0) + (existing.description ? 1 : 0) + (existing.url ? 2 : 0) + (existing.title.length < 50 ? 1 : 0);
        if (sNew > sOld) { clean[clean.indexOf(existing)] = b; seen[key] = b; }
        stats.dupBooks++;
        continue;
      }
      seen[key] = b;
      clean.append ? clean.push(b) : clean.push(b);
    }
    if (clean.length < a.books.length) a.books = clean;
  }

  // 5. Reorder: books with covers first
  if (a.books?.length > 1) {
    const withCover = a.books.filter(b => b.cover);
    const without = a.books.filter(b => !b.cover);
    if (without.length && withCover.length) {
      a.books = [...withCover, ...without];
      stats.reordered++;
    }
  }

  // 6. Clean bilingual suffixes from titles
  for (const b of a.books || []) {
    if (b.title.includes('/') && b.title.split('/')[0].trim().length > 10) {
      b.title = b.title.split('/')[0].trim();
    }
  }

  // 7. presentingBook fallback
  if (!a.presentingBook && a.books?.length) {
    a.presentingBook = a.books[0].title;
  }
}

// 8. Validate book attribution — remove books that don't belong to the author
let wrongBooks = 0;
for (const a of Object.values(data)) {
  if (!a.books?.length) continue;
  const hasPlanetaBooks = a.books.some(b => (b.cover || '').includes('proassetspdlcom'));
  const hasGrBooks = a.books.some(b => (b.url || '').includes('goodreads.com'));
  if (hasPlanetaBooks || hasGrBooks) continue; // These sources are reliable

  // Check if any book title appears in raw bios or generated bio
  const rb = a.rawBios || {};
  const allText = [rb.wikiEs, rb.wikiCa, rb.goodreads, rb.planeta, rb.bookDescriptions,
    a.generatedBioCa, a.generatedBioEs].filter(Boolean).join(' ').toLowerCase();

  const anyMatch = a.books.some(b => {
    const words = b.title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 2);
    return words.some(w => allText.includes(w));
  });

  if (!anyMatch) {
    wrongBooks++;
    a.books = [];
    a.presentingBook = '';
  }
}

// 9. Remove duplicate signings
const signingsPath = AUTHORS_PATH.replace('authors.json', 'signings.json');
try {
  const signings = JSON.parse(readFileSync(signingsPath, 'utf-8'));
  const seen = new Set();
  const cleanSignings = [];
  let dupSignings = 0;
  for (const s of signings) {
    const key = `${s.author}|${s.startTime || ''}|${s.endTime || ''}|${s.location}`;
    if (seen.has(key)) { dupSignings++; continue; }
    seen.add(key);
    cleanSignings.push(s);
  }
  if (dupSignings > 0) {
    writeFileSync(signingsPath, JSON.stringify(cleanSignings, null, 2));
  }
  stats.dupSignings = dupSignings;
} catch { stats.dupSignings = 0; }

writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));

console.log('Cleanup results:');
console.log(`  Publisher links removed: ${stats.publisherLinks}`);
console.log(`  Placeholder covers cleared: ${stats.placeholderCovers}`);
console.log(`  Duplicate books removed: ${stats.dupBooks}`);
console.log(`  Wrong book attributions cleared: ${wrongBooks}`);
console.log(`  Duplicate signings removed: ${stats.dupSignings}`);
console.log(`  Authors reordered (covers first): ${stats.reordered}`);
console.log(`  Planeta JSON-LD cleaned: ${stats.planetaJson}`);
