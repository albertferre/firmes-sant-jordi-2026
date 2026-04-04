#!/usr/bin/env node
/**
 * Phase 1: Discover author page URLs on all sources.
 * Skips any author+source where a URL already exists in authors.json.
 *
 * Sources: Planeta de Libros, Wikipedia (ES+CA), Open Library, Goodreads
 *
 * Usage: node scripts/discover-authors.mjs [--limit N] [--source planeta|openlibrary|goodreads|wikipedia]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIGNINGS_PATH = resolve(ROOT, 'src/data/signings.json');
const AUTHORS_PATH = resolve(ROOT, 'src/data/authors.json');

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const sourceIdx = args.indexOf('--source');
const onlySource = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const SCRAPE_HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (https://firmes-sant-jordi-2026.vercel.app; educational project)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,ca;q=0.8',
};

const GR_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

function normalize(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Planeta de Libros ──────────────────────────────────────────────

async function searchPlaneta(authorName) {
  const url = `https://www.planetadelibros.com/?textoBuscador=${encodeURIComponent(authorName)}`;
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();
    const nameNorm = normalize(authorName);
    const particles = new Set(['de', 'del', 'la', 'el', 'i', 'y', 'les', 'los', 'las', 'en']);
    const nameParts = nameNorm.split(/\s+/).filter((p) => p.length > 2 && !particles.has(p));
    const authorLinks = [...html.matchAll(/\/autor\/([^/"]+)\/(\d+)/g)];
    const seen = new Set();
    for (const m of authorLinks) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const slug = m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matchCount = nameParts.filter((p) => slug.includes(p)).length;
      if (matchCount >= Math.min(2, nameParts.length)) {
        return `https://www.planetadelibros.com/autor/${m[1]}/${m[2]}`;
      }
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Wikipedia ──────────────────────────────────────────────────────

async function searchWikipedia(authorName) {
  const base = authorName.replace(/ /g, '_');
  const variants = [base, `${base}_(escritor)`, `${base}_(escritora)`, `${base}_(periodista)`];
  const results = { esUrl: '', caUrl: '' };

  for (const lang of ['es', 'ca']) {
    const titles = variants.join('|');
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&format=json&redirects=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const page of Object.values(pages)) {
        if (page.pageid && page.pageid > 0) {
          const wikiUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
          if (lang === 'es') results.esUrl = wikiUrl;
          else results.caUrl = wikiUrl;
          break;
        }
      }
    } catch { /* ignore */ }
  }

  return results.esUrl || results.caUrl || null;
}

// ─── Open Library ───────────────────────────────────────────────────

async function searchOpenLibrary(name) {
  const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    const nameNorm = normalize(name);
    for (const doc of data.docs) {
      const docName = normalize(doc.name || '');
      if (docName === nameNorm) {
        const olid = doc.key.replace('/authors/', '');
        return `https://openlibrary.org/authors/${olid}`;
      }
    }
    if (data.docs[0].work_count > 0) {
      const olid = data.docs[0].key.replace('/authors/', '');
      return `https://openlibrary.org/authors/${olid}`;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Goodreads (strict name matching) ───────────────────────────────

async function searchGoodreads(authorName) {
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(authorName)}`;
  try {
    const res = await fetch(url, { headers: GR_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    const pattern = /<a class="authorName"[^>]*href="([^"]+)"[^>]*><span[^>]*>([^<]+)<\/span>/gi;
    const matches = [...html.matchAll(pattern)];

    const authorNorm = normalize(authorName);
    const particles = new Set(['del', 'las', 'los', 'les', 'the', 'de', 'la', 'el', 'i', 'y']);
    const authorParts = authorNorm.split(' ').filter(p => p.length > 2 && !particles.has(p));

    // For names with ≤1 significant part (Nina, Zahara, Custodio), require exact full match
    const needsExactMatch = authorParts.length <= 1;

    const seen = new Set();
    for (const m of matches) {
      const grUrl = m[1];
      const displayName = m[2].trim();
      const key = displayName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const displayNorm = normalize(displayName);

      // Exact match mode for short/single-word names
      if (needsExactMatch) {
        if (displayNorm === authorNorm) {
          const fullUrl = grUrl.startsWith('http') ? grUrl : `https://www.goodreads.com${grUrl}`;
          return fullUrl.replace(/&amp;/g, '&');
        }
        continue;
      }

      const displayParts = displayNorm.split(' ').filter(p => p.length > 2);
      if (!displayParts.length) continue;

      // Count exact word matches (no prefix matching — too loose)
      let matchCount = 0;
      for (const ap of authorParts) {
        for (const dp of displayParts) {
          if (ap === dp) { matchCount++; break; }
        }
      }

      // Always require at least 2 matching parts
      const threshold = Math.max(2, Math.ceil(authorParts.length * 0.6));
      if (matchCount >= threshold) {
        const fullUrl = grUrl.startsWith('http') ? grUrl : `https://www.goodreads.com${grUrl}`;
        return fullUrl.replace(/&amp;/g, '&');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const signings = JSON.parse(readFileSync(SIGNINGS_PATH, 'utf-8'));
  const authorNames = [...new Set(signings.map((s) => s.author))].sort();

  // Load existing data
  let data = {};
  if (existsSync(AUTHORS_PATH)) {
    data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  }

  // Ensure all signing authors have an entry
  for (const name of authorNames) {
    if (!data[name]) data[name] = { name };
  }

  const shouldSearch = (source) => !onlySource || onlySource === source;

  let processed = 0;
  const stats = { planeta: 0, wikipedia: 0, openlibrary: 0, goodreads: 0, skipped: 0 };

  console.log(`Discovering URLs for ${authorNames.length} authors...`);
  if (onlySource) console.log(`Only searching: ${onlySource}`);

  for (const name of authorNames) {
    if (processed >= limit) break;
    const author = data[name];

    const needsPlaneta = shouldSearch('planeta') && !author.planetaUrl;
    const needsWiki = shouldSearch('wikipedia') && !author.wikiUrl;
    const needsOL = shouldSearch('openlibrary') && !author.openLibraryUrl;
    const needsGR = shouldSearch('goodreads') && !author.goodreadsUrl;

    if (!needsPlaneta && !needsWiki && !needsOL && !needsGR) {
      stats.skipped++;
      continue;
    }

    processed++;
    process.stdout.write(`[${processed}] ${name}...`);
    const found = [];

    // Planeta
    if (needsPlaneta) {
      const url = await searchPlaneta(name);
      if (url) { author.planetaUrl = url; stats.planeta++; found.push('planeta'); }
      await sleep(1000);
    }

    // Wikipedia (fast API, no rate limit)
    if (needsWiki) {
      const url = await searchWikipedia(name);
      if (url) { author.wikiUrl = url; stats.wikipedia++; found.push('wiki'); }
    }

    // Open Library
    if (needsOL) {
      const url = await searchOpenLibrary(name);
      if (url) { author.openLibraryUrl = url; stats.openlibrary++; found.push('OL'); }
      await sleep(500);
    }

    // Goodreads (strict matching, slow)
    if (needsGR) {
      const url = await searchGoodreads(name);
      if (url) { author.goodreadsUrl = url; stats.goodreads++; found.push('GR'); }
      await sleep(2000);
    }

    console.log(found.length > 0 ? ` ✓ ${found.join(', ')}` : ' (no new URLs)');
    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  // Summary
  const total = Object.keys(data).length;
  const withPlaneta = Object.values(data).filter(a => a.planetaUrl).length;
  const withWiki = Object.values(data).filter(a => a.wikiUrl).length;
  const withOL = Object.values(data).filter(a => a.openLibraryUrl).length;
  const withGR = Object.values(data).filter(a => a.goodreadsUrl).length;

  console.log(`\n─── Results ───`);
  console.log(`Total: ${total} authors`);
  console.log(`Planeta: ${withPlaneta}/${total} (${stats.planeta} new)`);
  console.log(`Wikipedia: ${withWiki}/${total} (${stats.wikipedia} new)`);
  console.log(`Open Library: ${withOL}/${total} (${stats.openlibrary} new)`);
  console.log(`Goodreads: ${withGR}/${total} (${stats.goodreads} new)`);
  console.log(`Skipped (all URLs known): ${stats.skipped}`);
}

main().catch(console.error);
