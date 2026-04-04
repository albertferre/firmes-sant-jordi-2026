#!/usr/bin/env node
/**
 * Enriches book data from Open Library (API) + Goodreads (scraping fallback):
 *   - Proper title (with accents)
 *   - Publication year
 *   - Cover image (large)
 *   - Book URL (Open Library or Goodreads)
 *
 * Usage: node scripts/enrich-books.mjs [--limit N] [--resume]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const OL_HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (https://firmes-sant-jordi-2026.vercel.app; educational project)',
  'Accept': 'application/json',
};

const GR_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

async function searchBookOnGoodreads(bookTitle, authorName) {
  const cleanTitle = bookTitle
    .replace(/\s*Edicion\s+\w+/gi, '')
    .replace(/\s*Ed\s+\w+/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const q = `${cleanTitle} ${authorName}`;
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { headers: GR_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    const bookMatch = html.match(/<a class="bookTitle"[^>]*href="([^"]+)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
    if (!bookMatch) return null;

    const grBookUrl = `https://www.goodreads.com${bookMatch[1]}`;
    const realTitle = bookMatch[2].trim();

    const rowStart = html.indexOf(bookMatch[0]);
    const rowEnd = html.indexOf('</tr>', rowStart);
    const row = html.slice(Math.max(0, rowStart - 500), rowEnd > 0 ? rowEnd + 5 : rowStart + 3000);

    const yearMatch = row.match(/published\s+(\d{4})/i) || row.match(/>(\d{4})<\/span>/);
    const year = yearMatch?.[1] || '';

    const imgPattern = /<img[^>]*src="(https:\/\/i\.gr-assets\.com\/images\/[^"]+)"[^>]*>/gi;
    const imgs = [...row.matchAll(imgPattern)];
    let cover = '';
    for (const img of imgs) {
      const src = img[1];
      if (src.includes('._S') || src.includes('/books/')) {
        cover = src.replace(/_S[XY]\d+_/g, '_SY475_').replace(/_S\d+_/g, '_SY475_');
        break;
      }
    }
    if (cover.includes('nophoto')) cover = '';

    return { realTitle, year, cover, bookUrl: grBookUrl };
  } catch {
    return null;
  }
}

async function searchBookOnOpenLibrary(bookTitle, authorName) {
  // Clean Planeta slug-style titles
  const cleanTitle = bookTitle
    .replace(/\s*Edicion\s+\w+/gi, '')
    .replace(/\s*Ed\s+\w+/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(authorName)}&limit=3`;

  try {
    const res = await fetch(url, { headers: OL_HEADERS });
    if (!res.ok) return null;
    const json = await res.json();

    if (!json.docs?.length) return null;

    const best = json.docs[0];

    const realTitle = best.title || '';
    const year = best.first_publish_year ? String(best.first_publish_year) : '';
    const cover = best.cover_i
      ? `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`
      : '';
    const olBookUrl = best.key
      ? `https://openlibrary.org${best.key}`
      : '';

    return { realTitle, year, cover, bookUrl: olBookUrl };
  } catch {
    return null;
  }
}

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const authors = Object.values(data);

  let processed = 0, enriched = 0, booksFixed = 0;

  for (const author of authors) {
    if (!author.books?.length) continue;
    if (processed >= limit) break;

    // Skip if already enriched
    const needsEnrich = author.books.some(b =>
      !b.publishedDate || !b.cover || /^[A-Z][a-z]+ [A-Z]/.test(b.title)
    );
    if (resume && !needsEnrich) continue;

    processed++;
    process.stdout.write(`[${processed}] ${author.name} (${author.books.length} books)...`);

    let fixed = 0;
    for (const book of author.books) {
      // Try Open Library first (API), then Goodreads (scraping) for gaps
      let result = await searchBookOnOpenLibrary(book.title, author.name);
      await sleep(1000);

      const needsMore = !result || !result.cover || !result.year;
      if (needsMore) {
        const gr = await searchBookOnGoodreads(book.title, author.name);
        if (gr) {
          if (!result) {
            result = gr;
          } else {
            // Merge: fill gaps from Goodreads
            if (!result.cover && gr.cover) result.cover = gr.cover;
            if (!result.year && gr.year) result.year = gr.year;
            if (!result.realTitle && gr.realTitle) result.realTitle = gr.realTitle;
            if (!result.bookUrl && gr.bookUrl) result.bookUrl = gr.bookUrl;
          }
        }
        await sleep(1500);
      }

      if (!result) { await sleep(500); continue; }

      // Update title if the enriched one is better (has accents, proper casing)
      const isPlanetaSlug = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(book.title) && !/[áéíóúàèòüïçñ]/i.test(book.title);
      if (isPlanetaSlug && result.realTitle) {
        book.title = result.realTitle;
      }

      // Fill missing data
      if (!book.publishedDate && result.year) book.publishedDate = result.year;
      if (!book.cover && result.cover) book.cover = result.cover;
      if (result.bookUrl) book.url = result.bookUrl;

      fixed++;
      await sleep(1000);
    }

    if (fixed > 0) {
      enriched++;
      booksFixed += fixed;
    }

    console.log(` ${fixed} books enriched`);
    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  console.log(`\n─── Done ───`);
  console.log(`Authors processed: ${processed} | Enriched: ${enriched} | Books fixed: ${booksFixed}`);
}

main().catch(console.error);
