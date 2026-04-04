#!/usr/bin/env node
/**
 * Phase 3: Deduplicate and merge books from all sources.
 * Reads rawBooks per source, combines them, deduplicates by ISBN/title,
 * picks best metadata per field, and produces final books[].
 *
 * Usage: node scripts/dedup-books.mjs [--limit N] [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');
const RAW_BOOKS_PATH = resolve(__dirname, '..', 'src/data/raw-books.json');

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const dryRun = args.includes('--dry-run');

const packPattern = /\b(estuche|pack|cofre|box set)\b/i;

// Authors with confirmed wrong book attributions (homonyms in Google Books)
const WRONG_BOOKS_BLOCKLIST = new Set(['Arnau París', 'Dr. Segarra', 'Joan Laporta', 'José Luis Marín', 'Vicent Flor']);

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

/**
 * Normalize all rawBooks into a common format: { title, cover, description, publishedDate, publisher, isbn, rating, ratingsCount, url, _source }
 */
function normalizeSource(books, source) {
  if (!Array.isArray(books)) return [];
  return books.map(b => ({
    title: b.title || '',
    cover: b.cover || '',
    description: b.description || '',
    publishedDate: b.publishedDate || b.firstPublishYear || '',
    publisher: b.publisher || '',
    isbn: b.isbn || '',
    rating: b.rating || '',
    ratingsCount: b.ratingsCount || '',
    url: b.url || (b.workKey ? `https://openlibrary.org${b.workKey}` : ''),
    _source: source,
    _normTitle: norm(b.title || ''),
  }));
}

/**
 * Merge multiple book candidates (same book, different sources) into one.
 * Priority per field defined by source order.
 */
function mergeBook(candidates) {
  // Sort candidates by source priority
  const priority = { goodreads: 0, openLibrary: 1, googleBooks: 2, planeta: 3 };
  candidates.sort((a, b) => (priority[a._source] ?? 9) - (priority[b._source] ?? 9));

  // Title: prefer Goodreads > OL > Google > Planeta (Planeta has slug-style titles)
  const title = candidates.find(c => c.title && c._source === 'goodreads')?.title
    || candidates.find(c => c.title && c._source === 'openLibrary')?.title
    || candidates.find(c => c.title && c._source === 'googleBooks')?.title
    || candidates[0].title;

  // Cover: prefer Planeta (HD) > Goodreads > OL > Google
  const cover = candidates.find(c => c.cover && c._source === 'planeta')?.cover
    || candidates.find(c => c.cover && c._source === 'goodreads')?.cover
    || candidates.find(c => c.cover && c._source === 'openLibrary')?.cover
    || candidates.find(c => c.cover)?.cover
    || '';

  // ISBN: prefer Google Books (best for ISBNs)
  const isbn = candidates.find(c => c.isbn && c._source === 'googleBooks')?.isbn
    || candidates.find(c => c.isbn)?.isbn
    || '';

  // Description: prefer Google Books
  const description = candidates.find(c => c.description && c._source === 'googleBooks')?.description
    || candidates.find(c => c.description)?.description
    || '';

  // Rating + ratingsCount: only from Goodreads (per-book)
  const rating = candidates.find(c => c.rating && c._source === 'goodreads')?.rating || '';
  const ratingsCount = candidates.find(c => c.ratingsCount && c._source === 'goodreads')?.ratingsCount || '';

  // URL: Goodreads > Open Library
  const url = candidates.find(c => c.url && c._source === 'goodreads')?.url
    || candidates.find(c => c.url && c._source === 'openLibrary')?.url
    || candidates.find(c => c.url)?.url
    || '';

  // PublishedDate: Open Library (first_publish_year) > Google > others
  const publishedDate = candidates.find(c => c.publishedDate && c._source === 'openLibrary')?.publishedDate
    || candidates.find(c => c.publishedDate && c._source === 'googleBooks')?.publishedDate
    || candidates.find(c => c.publishedDate)?.publishedDate
    || '';

  const publisher = candidates.find(c => c.publisher)?.publisher || '';

  return { title, cover, description, publishedDate, publisher, isbn, rating, ratingsCount, url };
}

/**
 * Merge and deduplicate books from all sources.
 */
function mergeAllBooks(rawBooks) {
  // Collect all books with normalized titles
  const allBooks = [
    ...normalizeSource(rawBooks?.goodreads, 'goodreads'),
    ...normalizeSource(rawBooks?.openLibrary, 'openLibrary'),
    ...normalizeSource(rawBooks?.googleBooks, 'googleBooks'),
    ...normalizeSource(rawBooks?.planeta, 'planeta'),
  ];

  if (allBooks.length === 0) return [];

  // Group by ISBN first, then by normalized title
  const groups = new Map(); // normTitle -> candidates[]

  for (const book of allBooks) {
    if (!book.title || !book._normTitle) continue;

    // Try to find existing group by ISBN
    let matched = false;
    if (book.isbn) {
      for (const [key, group] of groups) {
        if (group.some(c => c.isbn && c.isbn === book.isbn)) {
          group.push(book);
          matched = true;
          break;
        }
      }
    }

    // Try to find existing group by normalized title
    if (!matched) {
      const existingKey = [...groups.keys()].find(k =>
        k === book._normTitle
        || (k.length > 5 && book._normTitle.length > 5 && (k.includes(book._normTitle) || book._normTitle.includes(k)))
      );
      if (existingKey) {
        groups.get(existingKey).push(book);
      } else {
        groups.set(book._normTitle, [book]);
      }
    }
  }

  // Merge each group and filter
  const merged = [];
  for (const [, candidates] of groups) {
    const book = mergeBook(candidates);
    // Skip packs/box sets if we have 2+ individual books
    if (packPattern.test(book.title)) continue;
    merged.push(book);
  }

  // Sort: books with cover first, then by publishedDate (newest first)
  merged.sort((a, b) => {
    if (a.cover && !b.cover) return -1;
    if (!a.cover && b.cover) return 1;
    return (b.publishedDate || '').localeCompare(a.publishedDate || '');
  });

  return merged;
}

// ─── Main ───────────────────────────────────────────────────────────

const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));

// Load raw books from separate file
let rawData = {};
if (existsSync(RAW_BOOKS_PATH)) {
  rawData = JSON.parse(readFileSync(RAW_BOOKS_PATH, 'utf-8'));
}

let processed = 0, totalBefore = 0, totalAfter = 0, authorsWithBooks = 0;

for (const [name, author] of Object.entries(data)) {
  if (processed >= limit) break;

  const rawBooks = rawData[name];
  if (!rawBooks) continue;

  if (WRONG_BOOKS_BLOCKLIST.has(name)) {
    author.books = [];
    author.presentingBook = '';
    continue;
  }

  processed++;
  const oldCount = author.books?.length || 0;
  totalBefore += oldCount;

  const merged = mergeAllBooks(rawBooks);
  totalAfter += merged.length;
  if (merged.length > 0) authorsWithBooks++;

  if (dryRun) {
    if (merged.length !== oldCount) {
      console.log(`${name}: ${oldCount} → ${merged.length} books`);
    }
  } else {
    author.books = merged;

    // Goodreads followers
    if (rawBooks.goodreadsFollowers) {
      author.goodreadsFollowers = rawBooks.goodreadsFollowers;
    }

    // Clean up fields that don't belong at author level
    delete author.rating;
    delete author.ratingsCount;
    delete author.sources;
  }
}

if (!dryRun) {
  writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
}

console.log(`\n─── Dedup Results ───`);
console.log(`Authors processed: ${processed}`);
console.log(`Authors with books: ${authorsWithBooks}`);
console.log(`Books before: ${totalBefore} → after: ${totalAfter}`);
console.log(dryRun ? '(dry run — no changes written)' : `Written to ${AUTHORS_PATH}`);
