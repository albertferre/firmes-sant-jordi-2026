#!/usr/bin/env node
/**
 * Generates original bilingual bios (CA + ES) for all authors.
 *
 * Strategy:
 *   1. Collect raw material from all sources (Wikipedia ES/CA, existing bios, book data)
 *   2. Extract structured facts (birthplace, year, profession, works, awards, etc.)
 *   3. Generate original bios in CA and ES from those facts
 *
 * Usage: node scripts/generate-bios.mjs [--limit N] [--only-missing]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUTHORS_PATH = resolve(ROOT, 'src/data/authors.json');
const SIGNINGS_PATH = resolve(ROOT, 'src/data/signings.json');

const args = process.argv.slice(2);
const onlyMissing = args.includes('--only-missing');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Collect raw Wikipedia data ─────────────────────────────────────

async function fetchWikiBio(name, lang) {
  const base = name.replace(/ /g, '_');
  const noAccent = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const variants = [...new Set([
    base, noAccent,
    `${base}_(escritor)`, `${base}_(escritora)`,
    `${base}_(periodista)`, `${base}_(economista)`,
    `${base}_(cantant)`, `${base}_(escriptor)`,
    `${noAccent}_(escritor)`, `${noAccent}_(escritora)`,
  ])].join('|');

  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(variants)}&prop=extracts&exintro=1&explaintext=1&format=json&redirects=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = await res.json();
    for (const page of Object.values(data.query?.pages || {})) {
      if (page.pageid > 0 && page.extract) return page.extract.slice(0, 2000);
    }
  } catch { /* ignore */ }
  return '';
}

// ─── Extract facts from raw text ────────────────────────────────────

function extractFacts(rawEs, rawCa, author) {
  const all = `${rawEs} ${rawCa}`.toLowerCase();
  const facts = { name: author.name };

  // Birth year
  const yearMatch = (rawEs + rawCa).match(/(\d{4})\)/);
  if (yearMatch) facts.birthYear = yearMatch[1];

  // Birthplace - look for patterns like "Nacido/a en X" or "(Ciudad, ..."
  const birthEs = rawEs.match(/\(([^,)]+),\s*(?:[^,)]+,\s*)?(\d{1,2}\s+de\s+\w+\s+de\s+)?\d{4}\)/);
  const birthCa = rawCa.match(/\(([^,)]+),\s*(?:[^,)]+,\s*)?(\d{1,2}\s+d[e']\w+\s+de\s+)?\d{4}\)/);
  if (birthEs) facts.birthPlace = birthEs[1].trim();
  else if (birthCa) facts.birthPlace = birthCa[1].trim();

  // Profession keywords
  const professions = [];
  const profMap = {
    'escritor': 'escriptor/a', 'escritora': 'escriptora', 'novelista': 'novel·lista',
    'poeta': 'poeta', 'periodista': 'periodista', 'economista': 'economista',
    'guionista': 'guionista', 'dramaturgo': 'dramaturg/a', 'filósofo': 'filòsof/a',
    'dibujante': 'dibuixant', 'ilustrador': 'il·lustrador/a', 'ilustradora': 'il·lustradora',
    'humorista': 'humorista', 'psicólogo': 'psicòleg/a', 'divulgador': 'divulgador/a',
    'actor': 'actor', 'actriz': 'actriu', 'cantante': 'cantant',
    'director': 'director/a', 'cocinero': 'cuiner/a', 'médico': 'metge/ssa',
    'profesor': 'professor/a', 'historiador': 'historiador/a',
    'ingeniero': 'enginyer/a', 'abogado': 'advocat/ada',
    'youtuber': 'youtuber', 'influencer': 'influencer',
  };
  const seenProf = new Set();
  for (const [es, ca] of Object.entries(profMap)) {
    const caBase = ca.split('/')[0];
    // Avoid matching substrings: require word boundary
    const esRe = new RegExp(`\\b${es}\\b`, 'i');
    if (esRe.test(rawEs) || esRe.test(rawCa) || new RegExp(`\\b${caBase}\\b`, 'i').test(rawCa)) {
      if (!seenProf.has(es)) {
        seenProf.add(es);
        professions.push({ es, ca: caBase });
      }
    }
  }
  // Limit to 3 most relevant professions
  if (professions.length > 0) facts.professions = professions.slice(0, 3);

  // Awards
  const awards = [];
  const awardPatterns = [
    /Premio?\s+Planeta/gi, /Premi\s+Planeta/gi,
    /Premio?\s+Nadal/gi, /Premio?\s+Nacional/gi,
    /Premio?\s+Anagrama/gi, /Premi\s+Sant\s+Jordi/gi,
    /Premio?\s+Alfaguara/gi, /Premio?\s+Cervantes/gi,
    /Premio?\s+(?:de la )?Crítica/gi, /Booker\s+Prize/gi,
    /bestseller/gi, /superventas/gi,
  ];
  for (const pat of awardPatterns) {
    const m = (rawEs + ' ' + rawCa).match(pat);
    if (m) awards.push(m[0]);
  }
  if (awards.length > 0) facts.awards = [...new Set(awards)];

  // Notable works from the raw text — only real titles (in quotes, proper length)
  const workMatches = [...(rawEs + rawCa).matchAll(/[«""]([^»""]{5,50})[»""]/g)];
  if (workMatches.length > 0) {
    // Filter out phrases that aren't book titles (contains "de", starts lowercase, etc.)
    const validWorks = workMatches
      .map(m => m[1])
      .filter(w => /^[A-ZÀ-ÿ]/.test(w) && !/\b(premio|esperada|conocid|llamad)\b/i.test(w));
    if (validWorks.length > 0) {
      facts.notableWorks = [...new Set(validWorks)].slice(0, 3);
    }
  }

  // Books from author data — clean Planeta slug titles
  if (author.books?.length > 0) {
    facts.books = author.books.slice(0, 3).map(b => {
      let t = b.title;
      // If title looks like Planeta slug (every word capitalized, no accents), use Google Books version if available
      if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(t) && !/[áéíóúàèòüïç]/i.test(t)) {
        // Check if there's a better version in other books
        const better = author.books.find(ob => {
          const normA = t.toLowerCase().replace(/[^a-z ]/g, '').trim();
          const normB = ob.title.toLowerCase().replace(/[^a-záéíóúàèòüïç ]/g, '').trim();
          return normB.includes(normA.slice(0, 15)) && ob.title !== t && /[áéíóúàèòüïç]/.test(ob.title);
        });
        if (better) t = better.title;
      }
      return t;
    });
  }
  if (author.presentingBook) {
    facts.presentingBook = author.presentingBook;
  }

  return facts;
}

// ─── Generate bios from facts ───────────────────────────────────────

function generateBioCa(facts) {
  const parts = [];

  // Opening: name + origin + profession
  let opening = facts.name;
  if (facts.birthPlace && facts.birthYear) {
    opening += ` (${facts.birthPlace}, ${facts.birthYear})`;
  } else if (facts.birthYear) {
    opening += ` (${facts.birthYear})`;
  }

  if (facts.professions?.length > 0) {
    const profs = facts.professions.map(p => p.ca);
    const profStr = profs.length <= 1 ? profs[0] : profs.slice(0, -1).join(', ') + ' i ' + profs.at(-1);
    opening += ` és ${profStr}`;
  } else {
    opening += ' és autor/a';
  }
  parts.push(opening + '.');

  // Awards
  if (facts.awards?.length > 0) {
    const a = facts.awards[0];
    if (/planeta/i.test(a)) parts.push(`Guardonat/da amb el Premi Planeta.`);
    else if (/nadal/i.test(a)) parts.push(`Guardonat/da amb el Premi Nadal.`);
    else if (/nacional/i.test(a)) parts.push(`Guardonat/da amb el Premi Nacional de Literatura.`);
    else if (/bestseller|superventas/i.test(a)) parts.push(`Les seves obres han estat supervendes internacionals.`);
    else parts.push(`Guardonat/da amb el ${a}.`);
  }

  // Notable works or books
  if (facts.presentingBook) {
    parts.push(`Presenta el llibre «${facts.presentingBook}» a Sant Jordi 2026.`);
  } else if (facts.notableWorks?.length > 0) {
    const works = facts.notableWorks.slice(0, 2).map(w => `«${w}»`).join(' i ');
    parts.push(`Entre les seves obres destaquen ${works}.`);
  } else if (facts.books?.length > 0) {
    const bk = facts.books[0];
    parts.push(`Autor/a de «${bk}», entre d'altres.`);
  }

  return parts.join(' ');
}

function generateBioEs(facts) {
  const parts = [];

  let opening = facts.name;
  if (facts.birthPlace && facts.birthYear) {
    opening += ` (${facts.birthPlace}, ${facts.birthYear})`;
  } else if (facts.birthYear) {
    opening += ` (${facts.birthYear})`;
  }

  if (facts.professions?.length > 0) {
    const profs = facts.professions.map(p => p.es);
    const profStr = profs.length <= 1 ? profs[0] : profs.slice(0, -1).join(', ') + ' y ' + profs.at(-1);
    opening += ` es ${profStr}`;
  } else {
    opening += ' es autor/a';
  }
  parts.push(opening + '.');

  if (facts.awards?.length > 0) {
    const a = facts.awards[0];
    if (/planeta/i.test(a)) parts.push(`Galardonado/a con el Premio Planeta.`);
    else if (/nadal/i.test(a)) parts.push(`Galardonado/a con el Premio Nadal.`);
    else if (/nacional/i.test(a)) parts.push(`Galardonado/a con el Premio Nacional de Literatura.`);
    else if (/bestseller|superventas/i.test(a)) parts.push(`Sus obras han sido superventas internacionales.`);
    else parts.push(`Galardonado/a con el ${a}.`);
  }

  if (facts.presentingBook) {
    parts.push(`Presenta el libro «${facts.presentingBook}» en Sant Jordi 2026.`);
  } else if (facts.notableWorks?.length > 0) {
    const works = facts.notableWorks.slice(0, 2).map(w => `«${w}»`).join(' y ');
    parts.push(`Entre sus obras destacan ${works}.`);
  } else if (facts.books?.length > 0) {
    const bk = facts.books[0];
    parts.push(`Autor/a de «${bk}», entre otras.`);
  }

  return parts.join(' ');
}

// ─── Gender detection for cleaner output ────────────────────────────

function refineGender(bio, rawEs, rawCa) {
  const all = (rawEs + ' ' + rawCa).toLowerCase();
  const isFemale = /\b(escritora|novelista|autora|nacida|elle?a|escriptora|periodista .*(valenciana|catalana|espanyola))\b/i.test(all)
    || /\bes una\b/i.test(rawEs) || /\bés una\b/i.test(rawCa);
  const isMale = /\b(escritor|novelista .*(español|colombiano|mexicano)|nacido|escriptor)\b/i.test(all)
    || /\bes un\b/i.test(rawEs) || /\bés un\b/i.test(rawCa);

  const replacements = isFemale && !isMale ? [
    [/\bAutor\/a\b/g, 'Autora'], [/\bautor\/a\b/g, 'autora'],
    [/\bGuardonat\/da\b/g, 'Guardonada'], [/\bGalardonado\/a\b/g, 'Galardonada'],
    [/\bescriptor\/a\b/g, 'escriptora'], [/\bescritor\b/g, 'escritora'],
    [/\bil·lustrador\/a\b/g, 'il·lustradora'], [/\bdivulgador\/a\b/g, 'divulgadora'],
    [/\bdirector\/a\b/g, 'directora'], [/\bhistoriador\/a\b/g, 'historiadora'],
    [/\bprofessor\/a\b/g, 'professora'], [/\benginyer\/a\b/g, 'enginyera'],
  ] : isMale ? [
    [/\bAutor\/a\b/g, 'Autor'], [/\bautor\/a\b/g, 'autor'],
    [/\bGuardonat\/da\b/g, 'Guardonat'], [/\bGalardonado\/a\b/g, 'Galardonado'],
    [/\bescriptor\/a\b/g, 'escriptor'],
    [/\bil·lustrador\/a\b/g, 'il·lustrador'], [/\bdivulgador\/a\b/g, 'divulgador'],
    [/\bdirector\/a\b/g, 'director'], [/\bhistoriador\/a\b/g, 'historiador'],
    [/\bprofessor\/a\b/g, 'professor'], [/\benginyer\/a\b/g, 'enginyer'],
  ] : [];
  for (const [pat, rep] of replacements) bio = bio.replace(pat, rep);
  return bio;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const signings = JSON.parse(readFileSync(SIGNINGS_PATH, 'utf-8'));

  // Get presenting book from signings
  const presentingMap = {};
  for (const s of signings) {
    if (s.book && !presentingMap[s.author]) presentingMap[s.author] = s.book;
  }

  const authors = Object.values(data);
  let processed = 0, generated = 0;

  for (const author of authors) {
    if (processed >= limit) break;
    if (onlyMissing && author.generatedBioCa && author.generatedBioEs) continue;

    // Add presenting book
    if (!author.presentingBook && presentingMap[author.name]) {
      author.presentingBook = presentingMap[author.name];
    }

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${author.name}...`);

    // Collect raw material from Wikipedia (re-fetch to get fresh, full intros)
    const [rawEs, rawCa] = await Promise.all([
      author.bioEs || fetchWikiBio(author.name, 'es'),
      author.bioCa || fetchWikiBio(author.name, 'ca'),
    ]);

    // Extract facts
    const facts = extractFacts(rawEs, rawCa, author);

    // Detect gender before generation
    const allRaw = (rawEs + ' ' + rawCa).toLowerCase();
    const isFemale = /\b(escritora|novelista\b.*\b(española|colombiana)|nacida|escriptora)\b/i.test(rawEs + rawCa)
      || /\bes una\b/i.test(rawEs) || /\bés una\b/i.test(rawCa);
    facts.gender = isFemale ? 'f' : 'm';

    // Generate bios
    let bioCa = generateBioCa(facts);
    let bioEs = generateBioEs(facts);

    // Refine gender markers
    bioCa = refineGender(bioCa, rawEs, rawCa);
    bioEs = refineGender(bioEs, rawEs, rawCa);

    author.generatedBioCa = bioCa;
    author.generatedBioEs = bioEs;
    generated++;

    console.log(` ✓ ca:${bioCa.length}ch es:${bioEs.length}ch facts:[${Object.keys(facts).filter(k=>k!=='name').join(',')}]`);

    await sleep(150);
  }

  writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));

  console.log(`\n─── Done ───`);
  console.log(`Generated: ${generated} bios`);
  console.log(`Output: ${AUTHORS_PATH}`);
}

main().catch(console.error);
