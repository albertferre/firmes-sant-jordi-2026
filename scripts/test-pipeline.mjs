#!/usr/bin/env node
/**
 * Pipeline data integrity tests.
 * Verifies authors.json conforms to schema and data quality thresholds.
 *
 * Usage: node scripts/test-pipeline.mjs
 * Exit code 0 = all pass, 1 = failures
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
const authors = Object.values(data);
const n = authors.length;

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}: ${result}`);
    }
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) return msg;
  return true;
}

// Title normalization for dedup check
function norm(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\s*\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Schema Tests ───────────────────────────────────────────────────

console.log('\n📋 SCHEMA TESTS');

test('No author has "rating" at author level', () => {
  const bad = authors.filter(a => 'rating' in a);
  return assert(bad.length === 0, `${bad.length} authors have rating: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('No author has "ratingsCount" at author level', () => {
  const bad = authors.filter(a => 'ratingsCount' in a);
  return assert(bad.length === 0, `${bad.length} authors have ratingsCount: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('No author has "sources" at author level', () => {
  const bad = authors.filter(a => 'sources' in a);
  return assert(bad.length === 0, `${bad.length} authors have sources: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('No author has "rawBooks" at author level', () => {
  const bad = authors.filter(a => 'rawBooks' in a);
  return assert(bad.length === 0, `${bad.length} authors have rawBooks`);
});

test('No author has "rawBios" at author level', () => {
  const bad = authors.filter(a => 'rawBios' in a);
  return assert(bad.length === 0, `${bad.length} authors have rawBios: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('Every author has "name" (non-empty string)', () => {
  const bad = authors.filter(a => typeof a.name !== 'string' || !a.name);
  return assert(bad.length === 0, `${bad.length} authors missing name`);
});

test('Every author has "books" (array)', () => {
  const bad = authors.filter(a => !Array.isArray(a.books));
  return assert(bad.length === 0, `${bad.length} authors missing books array`);
});

test('Every author has "goodreadsFollowers" (number)', () => {
  const bad = authors.filter(a => typeof a.goodreadsFollowers !== 'number');
  return assert(bad.length === 0, `${bad.length} authors missing goodreadsFollowers: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('"presentingBook" is string for all authors', () => {
  const bad = authors.filter(a => 'presentingBook' in a && typeof a.presentingBook !== 'string');
  return assert(bad.length === 0, `${bad.length} authors have non-string presentingBook`);
});

// ─── Data Quality Tests ─────────────────────────────────────────────

console.log('\n📊 DATA QUALITY TESTS');

test(`>= 270 authors have at least 1 book (have: ${authors.filter(a => a.books?.length > 0).length})`, () => {
  return assert(authors.filter(a => a.books?.length > 0).length >= 270, 'Too few authors with books');
});

test(`>= 200 authors have photo (have: ${authors.filter(a => a.photo).length})`, () => {
  return assert(authors.filter(a => a.photo).length >= 200, 'Too few authors with photos');
});

test(`>= 80 authors have twitter (have: ${authors.filter(a => a.links?.twitter).length})`, () => {
  return assert(authors.filter(a => a.links?.twitter).length >= 80, 'Too few authors with twitter');
});

test(`>= 60 authors have instagram (have: ${authors.filter(a => a.links?.instagram).length})`, () => {
  return assert(authors.filter(a => a.links?.instagram).length >= 60, 'Too few authors with instagram');
});

test('Every book has non-empty title', () => {
  const bad = [];
  authors.forEach(a => a.books?.forEach((b, i) => {
    if (!b.title) bad.push(`${a.name} book[${i}]`);
  }));
  return assert(bad.length === 0, `${bad.length} books with empty title: ${bad.slice(0, 3).join(', ')}`);
});

test('Books with rating also have ratingsCount', () => {
  const bad = [];
  authors.forEach(a => a.books?.forEach(b => {
    if (b.rating && !b.ratingsCount) bad.push(`${a.name}: "${b.title}"`);
  }));
  return assert(bad.length === 0, `${bad.length} books with rating but no ratingsCount`);
});

test('All book URLs start with https://', () => {
  const bad = [];
  authors.forEach(a => a.books?.forEach(b => {
    if (b.url && !b.url.startsWith('https://')) bad.push(`${a.name}: ${b.url}`);
  }));
  return assert(bad.length === 0, `${bad.length} books with bad URL: ${bad.slice(0, 3).join(', ')}`);
});

test('Twitter links use valid domain', () => {
  const bad = authors.filter(a => a.links?.twitter &&
    !a.links.twitter.startsWith('https://x.com/') &&
    !a.links.twitter.startsWith('https://twitter.com/'));
  return assert(bad.length === 0, `${bad.length} bad twitter URLs: ${bad.slice(0, 3).map(a => a.links.twitter).join(', ')}`);
});

test('Instagram links use valid domain', () => {
  const bad = authors.filter(a => a.links?.instagram &&
    !a.links.instagram.startsWith('https://www.instagram.com/') &&
    !a.links.instagram.startsWith('https://instagram.com/'));
  return assert(bad.length === 0, `${bad.length} bad instagram URLs: ${bad.slice(0, 3).map(a => a.links.instagram).join(', ')}`);
});

// ─── Consistency Tests ──────────────────────────────────────────────

console.log('\n🔗 CONSISTENCY TESTS');

test('Authors with goodreadsUrl → links.goodreads exists', () => {
  const bad = authors.filter(a => a.goodreadsUrl && !a.links?.goodreads);
  return assert(bad.length === 0, `${bad.length} missing links.goodreads: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('Authors with openLibraryUrl → links.openLibrary exists', () => {
  const bad = authors.filter(a => a.openLibraryUrl && !a.links?.openLibrary);
  return assert(bad.length === 0, `${bad.length} missing links.openLibrary: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('Authors with wikiUrl → links.wikipediaEs or links.wikipediaCa exists', () => {
  const bad = authors.filter(a => a.wikiUrl && !a.links?.wikipediaEs && !a.links?.wikipediaCa);
  return assert(bad.length === 0, `${bad.length} missing wikipedia link: ${bad.slice(0, 5).map(a => a.name).join(', ')}`);
});

test('No duplicate books within same author (by normalized title)', () => {
  const bad = [];
  authors.forEach(a => {
    const seen = new Set();
    a.books?.forEach(b => {
      const key = norm(b.title);
      if (key && seen.has(key)) bad.push(`${a.name}: "${b.title}"`);
      if (key) seen.add(key);
    });
  });
  return assert(bad.length === 0, `${bad.length} duplicate books: ${bad.slice(0, 5).join(', ')}`);
});

test('goodreadsFollowers >= 0 for all authors', () => {
  const bad = authors.filter(a => typeof a.goodreadsFollowers === 'number' && a.goodreadsFollowers < 0);
  return assert(bad.length === 0, `${bad.length} authors with negative followers`);
});

// ─── Summary ────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

if (failed > 0) {
  console.log('\n⚠️  Some tests failed. Fix issues before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
}
