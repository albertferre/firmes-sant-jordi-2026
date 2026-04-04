#!/usr/bin/env node
/**
 * Phase 4: Validate and clean author data quality.
 * Detects wrong Goodreads matches, homonym books, dead covers.
 *
 * Usage: node scripts/validate-authors.mjs [--dry-run] [--check-covers]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const checkCovers = args.includes('--check-covers');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function norm(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// ─── Known wrong GR matches (pen names are NOT in this list) ────────
// "Lola Vendetta" → Raquel Riba Rossy is correct (pen name)

// Pen names: GR URL uses real name, not pen name — these are CORRECT
// Pen names where GR URL correctly uses the real name
const PEN_NAMES = new Set([
  'Lola Vendetta',    // → Raquel Riba Rossy (correct GR match)
  'Boticaria García', // → Marián García (correct GR match)
]);

const WRONG_GR_MATCHES = new Set([
  'Andoni Luis Aduriz',
  'Aurelio Rojas',
  'Blue Jeans',
  'Custodio',
  'Dolores Redondo',
  'Hermanos Torres',
  'Ignacio Martínez de Pisón',
  'Isabel Rojas',
  'Javier Castillo',
  'José Luis Marín',
  'Luna Miguel',
  'María Lo',
  'Màrius Serra',
  'Nina',
  'Ray Loriga',
  'Roc Casagran',
  'Sergio Férnandez',
  'Susanna Isern',
  'Xavier Sala i Martín',
  'Zahara',
  'Òscar Sardà',
  // Co-authors with partial match
  'Albert Om i Marina Rossell',
  'Marina Rossell',
]);

// Known wrong book attributions (homonyms in Google Books)
const WRONG_BOOKS_AUTHORS = new Set([
  'Arnau París', 'Dr. Segarra', 'Joan Laporta', 'José Luis Marín', 'Vicent Flor',
]);

// English title patterns (Open Library homonyms)
const ENGLISH_TITLE_PATTERN = /^(The |A |An |My |How |What |Why |In |On |Of |It |Is |Do |I Am |I Was |I Have )/i;

// ─── Validation functions ───────────────────────────────────────────

function detectWrongGRUrl(name, author) {
  if (!author.goodreadsUrl) return false;
  if (PEN_NAMES.has(name)) return false; // Known pen name → GR URL uses real name
  if (WRONG_GR_MATCHES.has(name)) return true;

  // Auto-detect: extract slug and compare with name
  const rawSlug = decodeURIComponent(author.goodreadsUrl)
    .split('/').pop()
    .replace(/\?.*/, '').replace(/&amp;.*/, '').replace(/^\d+\./, '')
    .replace(/_/g, ' ');
  const slugNorm = norm(rawSlug);
  const nameNorm = norm(name);

  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[\s-]+/).filter(w => w.length > 2);
  const wordMatches = words.filter(w => slugNorm.includes(norm(w)));

  // Wrong if less than half of significant words match AND low character overlap
  if (words.length > 0 && wordMatches.length < words.length * 0.5) {
    const charOverlap = [...nameNorm].filter((_, i) => slugNorm.includes(nameNorm.slice(i, i + 3))).length / nameNorm.length;
    if (charOverlap < 0.4) return true;
  }
  return false;
}

function filterEnglishOLBooks(books) {
  return books.filter(b => {
    if (!b.url?.includes('openlibrary')) return true;
    if (ENGLISH_TITLE_PATTERN.test(b.title)) return false;
    return true;
  });
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const stats = { wrongGR: 0, wrongBooks: 0, englishOL: 0, deadCovers: 0 };

  console.log('Validating author data quality...\n');

  for (const [name, author] of Object.entries(data)) {
    const issues = [];

    // 1. Wrong GR URL
    if (detectWrongGRUrl(name, author)) {
      issues.push(`Wrong GR URL → ${author.goodreadsUrl?.split('/').pop()?.replace(/\?.*/, '')}`);
      if (!dryRun) {
        author.goodreadsUrl = '';
        author.goodreadsFollowers = 0;
        // Remove books that came from Goodreads
        author.books = (author.books || []).filter(b => !b.url?.includes('goodreads.com'));
      }
      stats.wrongGR++;
    }

    // 2. Wrong book attributions (known homonyms)
    if (WRONG_BOOKS_AUTHORS.has(name)) {
      if (author.books?.length > 0) {
        issues.push(`Known wrong book attribution — clearing ${author.books.length} books`);
        if (!dryRun) {
          author.books = [];
          author.presentingBook = '';
        }
        stats.wrongBooks++;
      }
    }

    // 3. English OL books (homonyms)
    const beforeCount = author.books?.length || 0;
    if (!dryRun) {
      author.books = filterEnglishOLBooks(author.books || []);
    }
    const removed = beforeCount - (dryRun ? filterEnglishOLBooks(author.books || []).length : author.books.length);
    if (removed > 0) {
      issues.push(`Removed ${removed} English OL books`);
      stats.englishOL += removed;
    }

    // 4. Cover URL validation (optional, slow — only with --check-covers)
    if (checkCovers && author.books?.length) {
      for (const book of author.books) {
        if (!book.cover) continue;
        try {
          const res = await fetch(book.cover, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          const size = parseInt(res.headers.get('content-length') || '0', 10);
          if (!res.ok || size < 500) {
            issues.push(`Dead cover: "${book.title}" (${res.status}, ${size}b)`);
            if (!dryRun) book.cover = '';
            stats.deadCovers++;
          }
        } catch {
          issues.push(`Dead cover (timeout): "${book.title}"`);
          if (!dryRun) book.cover = '';
          stats.deadCovers++;
        }
        await sleep(100);
      }
    }

    if (issues.length > 0) {
      console.log(`${name}:`);
      issues.forEach(i => console.log(`  ⚠ ${i}`));
    }
  }

  if (!dryRun) {
    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  console.log(`\n─── Validation Results ───`);
  console.log(`Wrong GR URLs cleaned: ${stats.wrongGR}`);
  console.log(`Wrong book attributions cleared: ${stats.wrongBooks}`);
  console.log(`English OL books removed: ${stats.englishOL}`);
  if (checkCovers) console.log(`Dead covers cleared: ${stats.deadCovers}`);
  console.log(dryRun ? '(dry run — no changes written)' : `Written to ${AUTHORS_PATH}`);
}

main().catch(console.error);
