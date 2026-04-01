#!/usr/bin/env node
/**
 * Second-pass enrichment for authors.json:
 *   1. Re-try Wikipedia for authors missing bio (catches transient failures)
 *   2. Cross-translate: ES→CA bio via CA Wikipedia, CA→ES via ES Wikipedia
 *   3. Fallback: use first book description as bio snippet
 *   4. Re-try photo from Wikipedia for authors without one
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'src/data/authors.json');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Wikipedia fetch with multiple title strategies ─────────────────

async function fetchWiki(authorName, lang) {
  // Try multiple title variants
  const base = authorName.replace(/ /g, '_');
  const noAccent = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const variants = [
    base,
    noAccent,
    `${base}_(escritor)`, `${base}_(escritora)`,
    `${base}_(periodista)`, `${base}_(economista)`,
    `${noAccent}_(escritor)`, `${noAccent}_(escritora)`,
  ];
  const titles = [...new Set(variants)].join('|');
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=500&format=json&redirects=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages)) {
      if (page.pageid && page.pageid > 0 && (page.extract || page.thumbnail)) {
        return {
          photo: page.thumbnail?.source || '',
          bio: (page.extract || '').slice(0, 1000),
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function main() {
  const data = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
  const authors = Object.values(data);
  let fixedBio = 0, fixedPhoto = 0, translated = 0, bookFallback = 0;

  for (let i = 0; i < authors.length; i++) {
    const a = authors[i];
    const needsBio = !a.bioEs && !a.bioCa;
    const needsPhoto = !a.photo;
    const needsTranslation = (a.bioEs && !a.bioCa) || (!a.bioEs && a.bioCa);

    if (!needsBio && !needsPhoto && !needsTranslation) continue;

    process.stdout.write(`[${i + 1}/${authors.length}] ${a.name}...`);

    // 1. Re-try Wikipedia for missing bio/photo
    if (needsBio || needsPhoto) {
      const [es, ca] = await Promise.all([
        fetchWiki(a.name, 'es'),
        fetchWiki(a.name, 'ca'),
      ]);

      if (needsBio) {
        if (es?.bio) { a.bioEs = es.bio; fixedBio++; }
        if (ca?.bio) { a.bioCa = ca.bio; fixedBio++; }
      }
      if (needsPhoto) {
        const photo = es?.photo || ca?.photo || '';
        if (photo) { a.photo = photo; a.sources.photo = 'wikipedia'; fixedPhoto++; }
      }
      // Update bio source
      if (a.bioEs || a.bioCa) {
        a.sources.bio = a.bioEs ? 'wikipedia_es' : 'wikipedia_ca';
      }
    }

    // 2. Cross-translate: if we have one language, try to get the other
    if (a.bioEs && !a.bioCa) {
      const ca = await fetchWiki(a.name, 'ca');
      if (ca?.bio) { a.bioCa = ca.bio; translated++; }
    } else if (a.bioCa && !a.bioEs) {
      const es = await fetchWiki(a.name, 'es');
      if (es?.bio) { a.bioEs = es.bio; translated++; }
    }

    // 3. Fallback: use first book description as bio snippet
    if (!a.bioEs && !a.bioCa && a.books?.length > 0) {
      const desc = a.books.find((b) => b.description && b.description.length > 30)?.description;
      if (desc) {
        a.bioEs = desc;
        a.sources.bio = 'book_description';
        bookFallback++;
      }
    }

    console.log(` bioEs:${a.bioEs ? `${a.bioEs.length}ch` : '-'} bioCa:${a.bioCa ? `${a.bioCa.length}ch` : '-'} photo:${a.photo ? 'yes' : 'no'}`);

    // Small delay to not hammer Wikipedia
    await sleep(200);
  }

  // Save
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

  // Stats
  const total = authors.length;
  const withPhoto = authors.filter((a) => a.photo).length;
  const withBioEs = authors.filter((a) => a.bioEs).length;
  const withBioCa = authors.filter((a) => a.bioCa).length;
  const withAnyBio = authors.filter((a) => a.bioEs || a.bioCa).length;

  console.log(`\n─── Enrichment Results ───`);
  console.log(`Fixed bios: ${fixedBio} | Translated: ${translated} | Book fallback: ${bookFallback}`);
  console.log(`Fixed photos: ${fixedPhoto}`);
  console.log(`Total: ${total} | Photo: ${withPhoto} (${Math.round(withPhoto * 100 / total)}%) | Bio ES: ${withBioEs} | Bio CA: ${withBioCa} | Any bio: ${withAnyBio} (${Math.round(withAnyBio * 100 / total)}%)`);
}

main().catch(console.error);
