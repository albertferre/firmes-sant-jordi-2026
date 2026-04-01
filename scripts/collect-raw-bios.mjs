#!/usr/bin/env node
/**
 * Collects ALL available raw bios from every source and saves them
 * in authors.json under rawBios.{source} for later LLM synthesis.
 *
 * Sources:
 *   - Wikipedia ES (API)
 *   - Wikipedia CA (API)
 *   - Goodreads (scrape author page)
 *   - Planeta de Libros (scrape author page)
 *
 * Usage: node scripts/collect-raw-bios.mjs [--resume] [--limit N]
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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,ca;q=0.8',
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function strip(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Wikipedia ──────────────────────────────────────────────────────

const WIKI_HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (https://firmes-sant-jordi-2026.vercel.app; educational project)',
  'Accept': 'application/json',
};

async function fetchWiki(name, lang) {
  const base = name.replace(/ /g, '_');
  const noAccent = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const variants = [...new Set([
    base, noAccent,
    `${base}_(escritor)`, `${base}_(escritora)`,
    `${base}_(periodista)`, `${base}_(economista)`,
    `${base}_(escriptor)`, `${base}_(cantant)`,
    `${noAccent}_(escritor)`, `${noAccent}_(escritora)`,
  ])].join('|');
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(variants)}&prop=extracts&exintro=1&explaintext=1&format=json&origin=*&redirects=1`;
  try {
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (res.status === 429) { await sleep(5000); return ''; }
    if (!res.ok) return '';
    const text = await res.text();
    if (!text.startsWith('{')) return '';
    const data = JSON.parse(text);
    for (const page of Object.values(data.query?.pages || {})) {
      if (page.pageid > 0 && page.extract?.length > 20) return page.extract.slice(0, 3000);
    }
  } catch { /* */ }
  return '';
}

// ─── Goodreads ──────────────────────────────────────────────────────

async function fetchGoodreadsBio(authorUrl) {
  if (!authorUrl) return '';
  try {
    const res = await fetch(authorUrl, { headers: HEADERS, redirect: 'follow' });
    if (!res.ok) return '';
    const html = await res.text();

    // Try multiple patterns for bio text
    const patterns = [
      /<div[^>]*class="[^"]*aboutAuthorInfo[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<span[^>]*id="freeText[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      /<div[^>]*data-testid="description"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) {
        const text = strip(m[1]);
        if (text.length > 30 && !text.startsWith('edit data') && !text.startsWith('http')) {
          return text.slice(0, 2000);
        }
      }
    }
    // Fallback: og:description
    const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (ogMatch) {
      const text = strip(ogMatch[1]);
      if (text.length > 30) return text.slice(0, 2000);
    }
  } catch { /* */ }
  return '';
}

// ─── Planeta de Libros ──────────────────────────────────────────────

async function fetchPlanetaBio(planetaUrl) {
  if (!planetaUrl) return '';
  try {
    const res = await fetch(planetaUrl, { headers: HEADERS, redirect: 'follow' });
    if (!res.ok) return '';
    const html = await res.text();

    // Try all paragraph-like containers for bio
    const candidates = [];

    // Meta description
    const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (metaMatch) candidates.push(strip(metaMatch[1]));

    // OG description
    const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (ogMatch) candidates.push(strip(ogMatch[1]));

    // All paragraphs - look for the longest non-boilerplate one
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    for (const p of paragraphs) {
      const text = strip(p);
      if (text.length > 60
        && !text.includes('cookie') && !text.includes('Planeta de Libros')
        && !text.startsWith('Encuentra los últimos') && !text.startsWith('Descubre')
        && !text.includes('navegación') && !text.includes('suscripción')) {
        candidates.push(text);
      }
    }

    // Also try JSON-LD structured data
    const jsonLd = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLd) {
      for (const block of jsonLd) {
        try {
          const content = block.replace(/<\/?script[^>]*>/gi, '');
          const parsed = JSON.parse(content);
          if (parsed.description) candidates.push(strip(parsed.description));
          if (parsed.author?.description) candidates.push(strip(parsed.author.description));
        } catch { /* */ }
      }
    }

    // Return the longest candidate that looks like a real bio
    const best = candidates
      .filter(c => c.length > 40)
      .sort((a, b) => b.length - a.length)[0];
    if (!best) return '';
    // Clean nav prefix noise from Planeta pages
    return best.replace(/^.*?((?:[A-ZÀ-Ÿ][a-zà-ÿ]+\s+){1,3}(?:es |és |nac))/s, '$1').slice(0, 2000);
  } catch { /* */ }
  return '';
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const authors = Object.values(data);

  let processed = 0;
  let collected = { wikiEs: 0, wikiCa: 0, goodreads: 0, planeta: 0 };

  for (const author of authors) {
    if (processed >= limit) break;
    if (resume && author.rawBios && Object.values(author.rawBios).some(v => v)) {
      continue;
    }

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${author.name}...`);

    const rawBios = {};

    // Wikipedia ES + CA (sequential to avoid 429)
    const wEs = await fetchWiki(author.name, 'es');
    await sleep(500);
    const wCa = await fetchWiki(author.name, 'ca');
    await sleep(500);
    if (wEs) { rawBios.wikiEs = wEs; collected.wikiEs++; }
    if (wCa) { rawBios.wikiCa = wCa; collected.wikiCa++; }

    // Goodreads (rate limited)
    if (author.goodreadsUrl) {
      const gr = await fetchGoodreadsBio(author.goodreadsUrl);
      if (gr) { rawBios.goodreads = gr; collected.goodreads++; }
      await sleep(2000);
    }

    // Planeta (rate limited)
    if (author.planetaUrl) {
      const pl = await fetchPlanetaBio(author.planetaUrl);
      if (pl) { rawBios.planeta = pl; collected.planeta++; }
      await sleep(1500);
    }

    // Book descriptions as additional context
    const bookDescs = (author.books || [])
      .filter(b => b.description?.length > 30)
      .map(b => `"${b.title}": ${b.description}`)
      .slice(0, 3);
    if (bookDescs.length > 0) rawBios.bookDescriptions = bookDescs.join('\n');

    author.rawBios = rawBios;

    const sources = Object.keys(rawBios).filter(k => rawBios[k]);
    console.log(` ✓ [${sources.join(', ')}]`);

    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
    await sleep(200);
  }

  // Stats
  const total = Object.keys(data).length;
  const withAny = Object.values(data).filter(a => {
    const rb = a.rawBios || {};
    return Object.values(rb).some(v => v);
  }).length;

  console.log(`\n─── Results ───`);
  console.log(`Processed: ${processed} | With any raw bio: ${withAny}/${total}`);
  console.log(`Wiki ES: ${collected.wikiEs} | Wiki CA: ${collected.wikiCa} | Goodreads: ${collected.goodreads} | Planeta: ${collected.planeta}`);
}

main().catch(console.error);
