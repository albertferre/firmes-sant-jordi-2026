#!/usr/bin/env node
/**
 * Phase 2: Scrape full bibliographies from all discovered source URLs.
 * For each author, extracts complete book lists + metadata from each source.
 * Stores raw per-source data in authors.json under `rawBooks`.
 *
 * Sources:
 *   - Planeta de Libros: photo, bio, books (from author page)
 *   - Wikipedia ES+CA: photo, bilingual bio
 *   - Google Books API: books with covers, ISBNs, descriptions (up to 20)
 *   - Open Library: works API (full bibliography), photo
 *   - Goodreads: books with per-book ratings, followers, photo
 *
 * Usage: node scripts/scrape-bibliographies.mjs [--resume] [--limit N] [--source planeta|google|openlibrary|goodreads|wikipedia]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUTHORS_PATH = resolve(ROOT, 'src/data/authors.json');
const RAW_BOOKS_PATH = resolve(ROOT, 'src/data/raw-books.json');

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const sourceIdx = args.indexOf('--source');
const onlySource = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const SCRAPE_HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (https://firmes-sant-jordi-2026.vercel.app; educational project)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,ca;q=0.8',
};

const OL_HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (https://firmes-sant-jordi-2026.vercel.app; educational project)',
  'Accept': 'application/json',
};

const GR_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

const shouldScrape = (source) => !onlySource || onlySource === source;

// ─── Planeta de Libros ──────────────────────────────────────────────

async function scrapePlaneta(planetaUrl) {
  try {
    const res = await fetch(planetaUrl, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    // Photo
    let photo = '';
    const photoMatch = html.match(/proassetspdlcom\.cdnstatics2\.com\/usuaris\/autores\/[^"]+\.(?:webp|jpg|png)/i);
    if (photoMatch) photo = `https://${photoMatch[0]}`;

    // Bio
    let bio = '';
    const bioMatch = html.match(/<div[^>]*class="[^"]*(?:autor-bio|biography|bio-text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<p[^>]*class="[^"]*(?:text-author|bio)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (bioMatch) bio = stripTags(bioMatch[1]);
    if (!bio || bio.length < 30) {
      const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      if (metaMatch) {
        const desc = stripTags(metaMatch[1]);
        if (desc.length > bio.length && !desc.startsWith('Planeta de')) bio = desc;
      }
    }
    if (!bio || bio.length < 30) {
      const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
      for (const p of paragraphs) {
        const text = stripTags(p);
        if (text.length > 60 && text.length > bio.length && !text.includes('cookie') && !text.includes('Planeta de Libros')) {
          bio = text.slice(0, 1000);
        }
      }
    }

    // Books (no artificial cap)
    const books = [];
    const bookMatches = html.matchAll(/\/libro-([^/"]+)\/(\d+)/g);
    const seenSlugs = new Set();
    for (const m of bookMatches) {
      if (seenSlugs.has(m[1])) continue;
      seenSlugs.add(m[1]);
      const title = m[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const coverRegex = new RegExp(`proassetspdlcom\\.cdnstatics2\\.com/usuaris/libros/[^"]*${m[1]}[^"]*\\.(?:webp|jpg|png)`, 'i');
      const coverMatch = html.match(coverRegex);
      books.push({ title, cover: coverMatch ? `https://${coverMatch[0]}` : '' });
    }

    return { photo, bio: bio.slice(0, 1000), books };
  } catch {
    return null;
  }
}

// ─── Wikipedia ──────────────────────────────────────────────────────

async function scrapeWikipedia(authorName) {
  const base = authorName.replace(/ /g, '_');
  const variants = [base, `${base}_(escritor)`, `${base}_(escritora)`, `${base}_(periodista)`];
  const result = { photo: '', bioEs: '', bioCa: '' };

  for (const lang of ['es', 'ca']) {
    const titles = variants.join('|');
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=500&format=json&redirects=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const page of Object.values(pages)) {
        if (page.pageid && page.pageid > 0) {
          if (!result.photo && page.thumbnail?.source) result.photo = page.thumbnail.source;
          if (lang === 'es') result.bioEs = (page.extract || '').slice(0, 1000);
          else result.bioCa = (page.extract || '').slice(0, 1000);
          break;
        }
      }
    } catch { /* ignore */ }
  }

  return result;
}

// ─── Google Books API ───────────────────────────────────────────────

async function scrapeGoogleBooks(authorName) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(`"${authorName}"`)}&langRestrict=es&maxResults=20&orderBy=relevance`;
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

      let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '';
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

// ─── Open Library (works API) ───────────────────────────────────────

async function scrapeOpenLibrary(openLibraryUrl) {
  const olid = openLibraryUrl.match(/authors\/(OL\w+)/)?.[1];
  if (!olid) return null;

  // Author metadata
  let photo = '';
  try {
    const photoUrl = `https://covers.openlibrary.org/a/olid/${olid}-L.jpg`;
    const photoRes = await fetch(photoUrl, { method: 'HEAD', headers: OL_HEADERS });
    const contentLength = parseInt(photoRes.headers.get('content-length') || '0', 10);
    if (photoRes.ok && contentLength > 1000) photo = photoUrl;
  } catch { /* ignore */ }

  // Works (full bibliography)
  const books = [];
  try {
    const url = `https://openlibrary.org/authors/${olid}/works.json?limit=50`;
    const res = await fetch(url, { headers: OL_HEADERS });
    if (!res.ok) return { photo, books };
    const data = await res.json();

    for (const entry of data.entries || []) {
      const title = typeof entry.title === 'string' ? entry.title : '';
      if (!title) continue;

      const coverId = entry.covers?.[0];
      const cover = coverId && coverId > 0
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : '';

      const workKey = entry.key || '';

      books.push({
        title,
        cover,
        firstPublishYear: entry.first_publish_date?.match(/\d{4}/)?.[0] || '',
        workKey,
      });
    }
  } catch { /* ignore */ }

  return { photo, books };
}

// ─── Goodreads (books + followers) ──────────────────────────────────

async function scrapeGoodreads(goodreadsUrl) {
  try {
    const res = await fetch(goodreadsUrl, { headers: GR_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    // Photo
    let photo = '';
    for (const pat of [
      /<img[^>]*src="(https:\/\/images\.gr-assets\.com\/authors\/[^"]+)"/i,
      /class="photo\/author[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i,
    ]) {
      const m = html.match(pat);
      if (m?.[1] && !m[1].includes('nophoto')) { photo = m[1].replace('p5/', 'p8/'); break; }
    }

    // Followers
    let followers = 0;
    const followMatch = html.match(/([\d,]+)\s*followers/i)
      || html.match(/followers[^<]*?([\d,]+)/i);
    if (followMatch) followers = parseInt(followMatch[1].replace(/,/g, ''), 10) || 0;

    // Books with per-book ratings
    const books = [];
    const seen = new Set();

    // Pattern 1: bookTitle class (standard Goodreads author page)
    const bookRegex = /<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]+)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/gi;
    let match;
    while ((match = bookRegex.exec(html)) !== null) {
      const title = stripTags(match[2]);
      if (seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      const bookUrl = match[1].startsWith('http') ? match[1] : `https://www.goodreads.com${match[1]}`;

      // Find nearby rating info (within ~2000 chars after the book title)
      const pos = match.index;
      const context = html.slice(pos, pos + 2000);

      const ratingMatch = context.match(/(\d\.\d{1,2})\s*avg\s*rating/i)
        || context.match(/minirating[^>]*>[^<]*?(\d\.\d{1,2})/i);
      const countMatch = context.match(/([\d,]+)\s*rating/i);

      // Cover image
      const coverMatch = context.match(/<img[^>]*src="(https:\/\/i\.gr-assets\.com\/images\/[^"]+)"/i);
      let cover = coverMatch?.[1] || '';
      if (cover) cover = cover.replace(/_S[XY]\d+_/g, '_SY475_').replace(/_S\d+_/g, '_SY475_');
      if (cover.includes('nophoto')) cover = '';

      books.push({
        title,
        url: bookUrl.replace(/&amp;/g, '&'),
        rating: ratingMatch?.[1] || '',
        ratingsCount: (countMatch?.[1] || '').replace(/,/g, ''),
        cover,
      });
    }

    // Pattern 2: fallback - /book/show/ links
    if (books.length === 0) {
      const altRegex = /<a[^>]*href="(\/book\/show\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
      while ((match = altRegex.exec(html)) !== null) {
        const title = stripTags(match[2]);
        if (title.length < 3 || seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());
        books.push({
          title,
          url: `https://www.goodreads.com${match[1]}`.replace(/&amp;/g, '&'),
          rating: '',
          ratingsCount: '',
          cover: '',
        });
      }
    }

    return { photo, followers, books };
  } catch {
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(AUTHORS_PATH)) {
    console.error('authors.json not found. Run discover-authors.mjs first.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const authors = Object.values(data).sort((a, b) => a.name.localeCompare(b.name));

  // rawBooks stored separately to avoid IDE/watcher overwriting
  let rawData = {};
  if (existsSync(RAW_BOOKS_PATH)) {
    rawData = JSON.parse(readFileSync(RAW_BOOKS_PATH, 'utf-8'));
  }

  let processed = 0;
  const stats = { planeta: 0, wiki: 0, google: 0, ol: 0, gr: 0 };

  console.log(`Scraping bibliographies for ${authors.length} authors...`);

  for (const author of authors) {
    if (processed >= limit) break;
    const name = author.name;

    // Check which sources need scraping
    const raw = rawData[name] || {};
    const needsPlaneta = shouldScrape('planeta') && author.planetaUrl && !raw.planeta;
    const needsWiki = shouldScrape('wikipedia') && !raw._wikiScraped;
    const needsGoogle = shouldScrape('google') && !raw.googleBooks;
    const needsOL = shouldScrape('openlibrary') && author.openLibraryUrl && !raw.openLibrary;
    const needsGR = shouldScrape('goodreads') && author.goodreadsUrl && !raw.goodreads;

    if (resume && !needsPlaneta && !needsWiki && !needsGoogle && !needsOL && !needsGR) continue;

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${name}...`);
    if (!rawData[name]) rawData[name] = {};
    const found = [];

    // Planeta
    if (needsPlaneta) {
      const result = await scrapePlaneta(author.planetaUrl);
      if (result) {
        rawData[name].planeta = result.books;
        if (result.photo && !author.photo) author.photo = result.photo;
        if (result.bio && !author.bioEs) author.bioEs = result.bio;
        stats.planeta++;
        found.push(`planeta(${result.books.length})`);
      }
      await sleep(1000);
    }

    // Wikipedia
    if (needsWiki) {
      const result = await scrapeWikipedia(name);
      if (result.photo && !author.photo) author.photo = result.photo;
      if (result.bioEs && !author.bioEs) author.bioEs = result.bioEs;
      if (result.bioCa && !author.bioCa) author.bioCa = result.bioCa;
      rawData[name]._wikiScraped = true;
      stats.wiki++;
      found.push('wiki');
    }

    // Google Books
    if (needsGoogle) {
      const books = await scrapeGoogleBooks(name);
      if (books.length > 0) {
        rawData[name].googleBooks = books;
        stats.google++;
        found.push(`google(${books.length})`);
      }
      await sleep(300);
    }

    // Open Library
    if (needsOL) {
      const result = await scrapeOpenLibrary(author.openLibraryUrl);
      if (result) {
        if (result.books.length > 0) rawData[name].openLibrary = result.books;
        if (result.photo && !author.photo) author.photo = result.photo;
        stats.ol++;
        found.push(`OL(${result.books.length})`);
      }
      await sleep(500);
    }

    // Goodreads
    if (needsGR) {
      const result = await scrapeGoodreads(author.goodreadsUrl);
      if (result) {
        if (result.books.length > 0) rawData[name].goodreads = result.books;
        if (result.photo && !author.photo) author.photo = result.photo;
        rawData[name].goodreadsFollowers = result.followers || 0;
        stats.gr++;
        found.push(`GR(${result.books.length}${result.followers ? ',f:' + result.followers : ''})`);
      }
      await sleep(2000);
    }

    console.log(found.length > 0 ? ` ${found.join(' · ')}` : ' (skipped)');
    writeFileSync(RAW_BOOKS_PATH, JSON.stringify(rawData, null, 2));
    // Only write authors.json for photo/bio updates
    data[name] = author;
    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  // Summary
  const withRaw = Object.values(rawData).filter(r => Object.keys(r).filter(k => k !== '_wikiScraped' && k !== 'goodreadsFollowers').length > 0);
  console.log(`\n─── Results ───`);
  console.log(`Processed: ${processed} | With rawBooks: ${withRaw.length}/${authors.length}`);
  console.log(`Sources — Planeta: ${stats.planeta} | Wiki: ${stats.wiki} | Google: ${stats.google} | OL: ${stats.ol} | GR: ${stats.gr}`);
  console.log(`Raw data: ${RAW_BOOKS_PATH}`);
}

main().catch(console.error);
