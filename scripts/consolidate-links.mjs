#!/usr/bin/env node
/**
 * Consolidates all known links per author into a `links` object.
 * Also splits wikiUrl into wikiEs/wikiCa based on rawBios content.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));

for (const a of Object.values(data)) {
  const links = {};
  const nameSlug = a.name.replace(/ /g, '_');

  // Wikipedia — both languages if we have rawBios
  const rb = a.rawBios || {};
  if (rb.wikiEs) links.wikipediaEs = `https://es.wikipedia.org/wiki/${encodeURIComponent(nameSlug)}`;
  if (rb.wikiCa) links.wikipediaCa = `https://ca.wikipedia.org/wiki/${encodeURIComponent(nameSlug)}`;
  // Fallback from existing wikiUrl
  if (!links.wikipediaEs && !links.wikipediaCa && a.wikiUrl) {
    if (a.wikiUrl.includes('ca.wikipedia')) links.wikipediaCa = a.wikiUrl;
    else links.wikipediaEs = a.wikiUrl;
  }

  // Goodreads
  if (a.goodreadsUrl) links.goodreads = a.goodreadsUrl;

  // Planeta
  if (a.planetaUrl) links.planeta = a.planetaUrl;

  // Open Library (if photo came from there)
  if (a.photo?.includes('openlibrary.org')) {
    const olid = a.photo.match(/olid\/([^-]+)/)?.[1];
    if (olid) links.openLibrary = `https://openlibrary.org/authors/${olid}`;
  }

  // Wikidata (if photo came from there or we found it)
  if (a.photo?.includes('wikimedia.org/wikipedia/commons') && !links.wikipediaEs && !links.wikipediaCa) {
    // Photo from Wikidata but no Wikipedia — note it
    links.wikimediaCommons = true;
  }

  // Google Books (construct search link)
  if (a.books?.length && a.books.some(b => b.isbn)) {
    const isbn = a.books.find(b => b.isbn)?.isbn;
    if (isbn) links.googleBooks = `https://books.google.com/books?vid=ISBN${isbn}`;
  }

  a.links = links;
}

writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));

// Stats
const total = Object.keys(data).length;
const counts = {};
for (const a of Object.values(data)) {
  for (const k of Object.keys(a.links || {})) {
    counts[k] = (counts[k] || 0) + 1;
  }
}
console.log('Links consolidats:');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}/${total}`);
}
