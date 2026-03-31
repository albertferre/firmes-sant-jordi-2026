#!/usr/bin/env node
/**
 * Scrapes Goodreads for author info (bio, photo, rating, top books).
 * Outputs src/data/authors.json
 *
 * Usage: node scripts/scrape-goodreads.mjs [--resume] [--limit N]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIGNINGS_PATH = resolve(ROOT, 'src/data/signings.json');
const OUTPUT_PATH = resolve(ROOT, 'src/data/authors.json');

const DELAY_MS = 2500;
const args = process.argv.slice(2);
const resume = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9,ca;q=0.8,es;q=0.7',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extracts text between two markers in HTML */
function between(html, start, end) {
  const i = html.indexOf(start);
  if (i === -1) return '';
  const j = html.indexOf(end, i + start.length);
  if (j === -1) return '';
  return html.slice(i + start.length, j);
}

/** Strip HTML tags */
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
}

/** Search Goodreads for an author, return their author page URL */
async function searchAuthor(name) {
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(name)}&search_type=books`;
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) return null;
  const html = await res.text();

  // Look for author link pattern: /author/show/NNNN.Name
  const match = html.match(/\/author\/show\/(\d+\.[^"]+)/);
  if (!match) return null;

  return {
    authorUrl: `https://www.goodreads.com/author/show/${match[1]}`,
    authorId: match[1],
  };
}

/** Fetch author page and extract bio, photo, rating, books */
async function fetchAuthorPage(authorUrl) {
  const res = await fetch(authorUrl, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) return null;
  const html = await res.text();

  // Photo - multiple patterns for different GR layouts
  let photo = '';
  const photoPatterns = [
    /class="photo\/author[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i,
    /<img[^>]*src="(https:\/\/images\.gr-assets\.com\/authors\/[^"]+)"/i,
    /<img[^>]*src="(https:\/\/i\.gr-assets\.com\/images\/[^"]+authors[^"]+)"/i,
    /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
    /<img[^>]*class="[^"]*authorPhoto[^"]*"[^>]*src="([^"]+)"/i,
  ];
  for (const pat of photoPatterns) {
    const m = html.match(pat);
    if (m && m[1] && !m[1].includes('nophoto')) { photo = m[1]; break; }
  }

  // Bio - multiple patterns
  let bio = '';
  const bioPatterns = [
    /<div[^>]*class="[^"]*aboutAuthorInfo[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*id="freeText[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*data-testid="description"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pat of bioPatterns) {
    const m = html.match(pat);
    if (m) {
      const text = stripTags(m[1]);
      if (text.length > 20 && !text.startsWith('edit data') && !text.startsWith('http') && !text.startsWith('www.')) { bio = text.slice(0, 800); break; }
    }
  }
  // Fallback: og:description
  if (!bio) {
    const ogDesc = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (ogDesc) {
      const text = stripTags(ogDesc[1]);
      if (text.length > 20) bio = text.slice(0, 800);
    }
  }

  // Born info
  let bornInfo = '';
  const bornMatch = html.match(/Born\s*(?:in\s+)?([^<\n]+)/i)
    || html.match(/<div[^>]*>\s*Born\s*<\/div>\s*<div[^>]*>([^<]+)/i);
  if (bornMatch) bornInfo = stripTags(bornMatch[1]).slice(0, 200);

  // Rating - "Average rating: X.XX"
  let rating = '';
  const ratingMatch = html.match(/Average rating:\s*(\d\.\d{1,2})/i)
    || html.match(/(\d\.\d{1,2})\s*avg\s*rating/i)
    || html.match(/"ratingValue":\s*"?([\d.]+)"?/i);
  if (ratingMatch) rating = ratingMatch[1];

  // Ratings count
  let ratingsCount = '';
  const countMatch = html.match(/([\d,]+)\s*ratings/i);
  if (countMatch) ratingsCount = countMatch[1].replace(/,/g, '');

  // Books - extract from the author page book list
  const books = [];
  const bookRegex = /<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]+)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/gi;
  let bookMatch;
  while ((bookMatch = bookRegex.exec(html)) !== null && books.length < 5) {
    books.push({
      title: stripTags(bookMatch[2]),
      url: `https://www.goodreads.com${bookMatch[1]}`,
    });
  }

  // If no books found with bookTitle class, try alternative patterns
  if (books.length === 0) {
    const altBookRegex = /\/book\/show\/[^"]+"\s*>([^<]+)</gi;
    let altMatch;
    const seen = new Set();
    while ((altMatch = altBookRegex.exec(html)) !== null && books.length < 5) {
      const title = stripTags(altMatch[1]);
      if (title.length > 2 && !seen.has(title)) {
        seen.add(title);
        books.push({ title, url: '' });
      }
    }
  }

  // Genres
  const genres = [];
  const genreRegex = /\/genres\/([^"]+)"\s*>([^<]+)</gi;
  let genreMatch;
  const seenGenres = new Set();
  while ((genreMatch = genreRegex.exec(html)) !== null && genres.length < 5) {
    const g = stripTags(genreMatch[2]);
    if (!seenGenres.has(g)) {
      seenGenres.add(g);
      genres.push(g);
    }
  }

  return { photo, bio, bornInfo, rating, ratingsCount, books, genres };
}

async function main() {
  const signings = JSON.parse(readFileSync(SIGNINGS_PATH, 'utf-8'));
  const authors = [...new Set(signings.map((s) => s.author))].sort();

  // Load existing data if resuming
  let existing = {};
  if (resume && existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Resuming — ${Object.keys(existing).length} authors already scraped`);
  }

  const results = { ...existing };
  let processed = 0;
  let found = 0;
  let skipped = 0;

  for (const author of authors) {
    if (processed >= limit) break;

    if (resume && results[author] && results[author].goodreadsUrl) {
      skipped++;
      continue;
    }

    processed++;
    console.log(`[${processed}/${Math.min(authors.length, limit)}] ${author}...`);

    try {
      const search = await searchAuthor(author);
      if (!search) {
        console.log(`  ✗ Not found on Goodreads`);
        results[author] = { name: author, goodreadsUrl: '', photo: '', bio: '', bornInfo: '', rating: '', ratingsCount: '', books: [], genres: [] };
        await sleep(DELAY_MS);
        continue;
      }

      await sleep(1500); // Brief delay between search and page fetch

      const info = await fetchAuthorPage(search.authorUrl);
      if (!info) {
        console.log(`  ✗ Could not fetch author page`);
        results[author] = { name: author, goodreadsUrl: search.authorUrl, photo: '', bio: '', bornInfo: '', rating: '', ratingsCount: '', books: [], genres: [] };
        await sleep(DELAY_MS);
        continue;
      }

      results[author] = {
        name: author,
        goodreadsUrl: search.authorUrl,
        ...info,
      };

      found++;
      const bookCount = info.books.length;
      console.log(`  ✓ ${info.rating ? `★${info.rating}` : 'no rating'} · ${bookCount} books · bio ${info.bio ? `${info.bio.length}ch` : 'none'} · photo ${info.photo ? 'yes' : 'no'}`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      results[author] = { name: author, goodreadsUrl: '', photo: '', bio: '', bornInfo: '', rating: '', ratingsCount: '', books: [], genres: [], error: err.message };
    }

    // Save progress after each author
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    await sleep(DELAY_MS);
  }

  console.log(`\nDone! ${found} found, ${processed - found} not found, ${skipped} skipped (resumed)`);
  console.log(`Total authors in file: ${Object.keys(results).length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);
