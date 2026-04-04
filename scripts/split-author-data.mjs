#!/usr/bin/env node
/**
 * Splits authors.json into:
 *   - src/data/authors-index.json  — lightweight index for list views (~130 KB)
 *   - public/data/authors.json     — full data loaded on demand (~1.9 MB)
 *
 * Run after dedup-books.mjs or at the end of the pipeline.
 *
 * Usage: node scripts/split-author-data.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUTHORS_PATH = resolve(ROOT, 'src/data/authors.json');
const INDEX_PATH = resolve(ROOT, 'src/data/authors-index.json');
const PUBLIC_PATH = resolve(ROOT, 'public/data/authors.json');

const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));

// Generate lightweight index (only fields needed for list/card views)
const index = {};
for (const [name, author] of Object.entries(data)) {
  index[name] = {
    name: author.name,
    photo: author.photo || '',
    presentingBook: author.presentingBook || '',
    goodreadsFollowers: author.goodreadsFollowers || 0,
    goodreadsUrl: author.goodreadsUrl || '',
    openLibraryUrl: author.openLibraryUrl || '',
    wikiUrl: author.wikiUrl || '',
    planetaUrl: author.planetaUrl || '',
  };
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
const indexSize = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0);

// Copy full data to public/ for fetch()
mkdirSync(dirname(PUBLIC_PATH), { recursive: true });
writeFileSync(PUBLIC_PATH, JSON.stringify(data));
const fullSize = (Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(0);

console.log(`authors-index.json: ${indexSize} KB (${Object.keys(index).length} authors)`);
console.log(`public/data/authors.json: ${fullSize} KB (minified, for lazy loading)`);
