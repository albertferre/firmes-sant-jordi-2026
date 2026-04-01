#!/usr/bin/env node
/**
 * Re-scrape Goodreads for authors with missing/cleared URLs.
 * Uses STRICT name validation to prevent misattribution.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORS_PATH = resolve(__dirname, '..', 'src/data/authors.json');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

function normalize(s) {
  // Strip accents, lowercase, remove punctuation
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validateGoodreadsMatch(authorName, html) {
  /**
   * Extract the actual author name from search results and validate.
   * Returns { url, matchedName } or null if no valid match.
   */
  // Find all author links with their display names
  const authorPattern = /<a[^>]*href="(\/author\/show\/\d+\.[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const matches = [...html.matchAll(authorPattern)];

  const authorNorm = normalize(authorName);
  const authorParts = authorNorm.split(' ').filter(p => p.length > 2 && !['del','las','los','les','the'].includes(p));

  for (const m of matches) {
    const url = m[1];
    const displayName = m[2].trim();
    const displayNorm = normalize(displayName);
    const displayParts = displayNorm.split(' ').filter(p => p.length > 2);

    if (!displayParts.length) continue;

    // Count matching significant parts
    let matchCount = 0;
    for (const ap of authorParts) {
      for (const dp of displayParts) {
        if (ap === dp || (ap.length > 3 && dp.startsWith(ap)) || (dp.length > 3 && ap.startsWith(dp))) {
          matchCount++;
          break;
        }
      }
    }

    // Require at least 2 matching parts, or all parts if author has only 1-2
    const threshold = Math.min(2, authorParts.length);
    if (matchCount >= threshold) {
      return {
        url: `https://www.goodreads.com${url}`,
        matchedName: displayName,
      };
    }
  }
  return null;
}

async function searchGoodreads(authorName) {
  // Search by books (not authors) — returns authorName spans with real display names
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(authorName)}`;
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract author links with display names from book search results
    const pattern = /<a class="authorName"[^>]*href="([^"]+)"[^>]*><span[^>]*>([^<]+)<\/span>/gi;
    const matches = [...html.matchAll(pattern)];

    const authorNorm = normalize(authorName);
    const authorParts = authorNorm.split(' ').filter(p => p.length > 2 && !['del','las','los','les','the'].includes(p));

    // Find first author that matches our name
    const seen = new Set();
    for (const m of matches) {
      const grUrl = m[1];
      const displayName = m[2].trim();
      const key = displayName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const displayNorm = normalize(displayName);
      const displayParts = displayNorm.split(' ').filter(p => p.length > 2);
      if (!displayParts.length) continue;

      let matchCount = 0;
      for (const ap of authorParts) {
        for (const dp of displayParts) {
          if (ap === dp || (ap.length > 3 && dp.startsWith(ap)) || (dp.length > 3 && ap.startsWith(dp))) {
            matchCount++;
            break;
          }
        }
      }

      const threshold = Math.min(2, authorParts.length);
      if (matchCount >= threshold) {
        const fullUrl = grUrl.startsWith('http') ? grUrl : `https://www.goodreads.com${grUrl}`;
        return { url: fullUrl.replace(/&amp;/g, '&'), matchedName: displayName };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchRating(grUrl) {
  try {
    const res = await fetch(grUrl, { headers: HEADERS, redirect: 'follow' });
    if (!res.ok) return {};
    const html = await res.text();
    const rating = html.match(/Average rating:\s*(\d\.\d{1,2})/i)?.[1] || '';
    const count = (html.match(/([\d,]+)\s*ratings/i)?.[1] || '').replace(/,/g, '');
    return { rating, ratingsCount: count };
  } catch {
    return {};
  }
}

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const needsGR = Object.values(data).filter(a => !a.goodreadsUrl);

  console.log(`${needsGR.length} authors need Goodreads links`);
  let found = 0, notFound = 0;

  for (let i = 0; i < needsGR.length; i++) {
    const a = needsGR[i];
    process.stdout.write(`[${i + 1}/${needsGR.length}] ${a.name}...`);

    const result = await searchGoodreads(a.name);
    if (result) {
      a.goodreadsUrl = result.url;
      a.links = a.links || {};
      a.links.goodreads = result.url;

      // Also fetch rating
      await sleep(1500);
      const { rating, ratingsCount } = await fetchRating(result.url);
      if (rating) { a.rating = rating; a.ratingsCount = ratingsCount; }

      found++;
      console.log(` ✓ ${result.matchedName} (${rating || '-'})`);
    } else {
      notFound++;
      console.log(` ✗ no valid match`);
    }

    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
    await sleep(2000);
  }

  console.log(`\nDone: ${found} found, ${notFound} not found`);
  console.log(`Total with GR: ${Object.values(data).filter(a => a.goodreadsUrl).length}/${Object.keys(data).length}`);
}

main().catch(console.error);
