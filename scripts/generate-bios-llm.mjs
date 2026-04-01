#!/usr/bin/env node
/**
 * Generate original bilingual author bios using Claude Haiku.
 *
 * For each author:
 *   1. Collects ALL raw material (Wikipedia ES/CA, Goodreads, book descriptions, signing data)
 *   2. Sends to Claude Haiku to generate a concise original bio in CA and ES
 *   3. Saves to authors.json as generatedBioCa / generatedBioEs
 *
 * Usage: node scripts/generate-bios-llm.mjs [--resume] [--limit N]
 * Requires: ANTHROPIC_API_KEY in .env
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUTHORS_PATH = resolve(ROOT, 'src/data/authors.json');
const SIGNINGS_PATH = resolve(ROOT, 'src/data/signings.json');

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const client = new Anthropic();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Collect raw Wikipedia bios ─────────────────────────────────────

async function fetchWikiBio(name, lang) {
  const base = name.replace(/ /g, '_');
  const noAccent = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const variants = [...new Set([
    base, noAccent,
    `${base}_(escritor)`, `${base}_(escritora)`,
    `${base}_(periodista)`, `${base}_(economista)`,
    `${base}_(escriptor)`, `${base}_(cantant)`,
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

// ─── Build context for each author ──────────────────────────────────

function collectMaterial(author, signings) {
  const parts = [];

  // Raw bios from all sources (collected by collect-raw-bios.mjs)
  const rb = author.rawBios || {};
  if (rb.wikiEs) parts.push(`[Wikipedia ES]\n${rb.wikiEs}`);
  if (rb.wikiCa) parts.push(`[Wikipedia CA]\n${rb.wikiCa}`);
  if (rb.goodreads) parts.push(`[Goodreads]\n${rb.goodreads}`);
  if (rb.planeta) parts.push(`[Planeta de Libros]\n${rb.planeta}`);

  // Fallback to previously stored bios
  if (!rb.wikiEs && author.bioEs) parts.push(`[Bio ES existent]\n${author.bioEs}`);
  if (!rb.wikiCa && author.bioCa) parts.push(`[Bio CA existent]\n${author.bioCa}`);

  // Book descriptions
  if (rb.bookDescriptions) parts.push(`[Descripcions dels llibres]\n${rb.bookDescriptions}`);

  // Books list
  if (author.books?.length > 0) {
    const bookLines = author.books.map(b => {
      let line = `- "${b.title}"`;
      if (b.publisher) line += ` (${b.publisher})`;
      if (b.publishedDate) line += ` [${b.publishedDate}]`;
      if (b.description && !rb.bookDescriptions) line += `\n  ${b.description}`;
      return line;
    });
    parts.push(`[Llibres / Libros]\n${bookLines.join('\n')}`);
  }

  // Signing info
  const authorSignings = signings.filter(s => s.author === author.name);
  if (authorSignings.length > 0) {
    const sigInfo = authorSignings.map(s =>
      `- ${s.location} (${s.startTime || '?'}-${s.endTime || '?'})${s.book ? ` — presentant "${s.book}"` : ''}`
    );
    parts.push(`[Firmes Sant Jordi 2026]\n${sigInfo.join('\n')}`);
  }

  if (author.presentingBook) {
    parts.push(`[Llibre que presenta] "${author.presentingBook}"`);
  }

  if (author.rating) {
    parts.push(`[Goodreads] Valoració mitjana: ${author.rating}/5`);
  }

  return parts.join('\n\n');
}

// ─── Generate bio with Claude ───────────────────────────────────────

async function generateBio(authorName, material) {
  const prompt = `Ets un redactor cultural expert per a una app de firmes de llibres de Sant Jordi 2026 a Barcelona.

Escriu dues biografies ORIGINALS sobre "${authorName}" — una en CATALÀ i una en CASTELLÀ.

INSTRUCCIONS:
- NO copiïs el text de les fonts. Sintetitza la informació en un text nou i original.
- Estil: càlid, cultural, com una guia literària de Barcelona. No enciclopèdic sec.
- Llargada: 2-4 frases (50-150 paraules). Prou per conèixer l'autor/a.
- Inclou: qui és (professió), d'on és, obres rellevants, premis si en té.
- Si presenta un llibre a Sant Jordi 2026, menciona-ho de manera natural.
- Si hi ha poca informació, fes el millor possible amb el que hi hagi. Mai inventis dades.
- Les dues bios han de dir el mateix però amb estil natural en cada idioma (no traducció literal).

MATERIAL DE REFERÈNCIA (usa com a context, no copiïs):
${material || `Només sabem el nom: "${authorName}". Escriu una bio mínima indicant que participa a Sant Jordi 2026.`}

Respon NOMÉS amb JSON vàlid, sense cap altre text:
{"ca": "bio en català aquí", "es": "bio en castellano aquí"}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text?.trim();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ca: parsed.ca || '', es: parsed.es || '' };
    }
  } catch (err) {
    console.error(`  API error: ${err.message}`);
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const signings = JSON.parse(readFileSync(SIGNINGS_PATH, 'utf-8'));
  const authors = Object.values(data);

  let processed = 0, generated = 0, skipped = 0;

  for (const author of authors) {
    if (processed >= limit) break;

    // Skip if already has LLM-generated bio and resuming
    if (resume && author.generatedBioCa && author.generatedBioCa.length > 30
        && !author.generatedBioCa.startsWith(author.name + ' és ')) {
      skipped++;
      continue;
    }

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${author.name}...`);

    // Collect all raw material
    const material = await collectMaterial(author, signings);

    // Generate with Claude
    const bio = await generateBio(author.name, material);
    if (bio) {
      author.generatedBioCa = bio.ca;
      author.generatedBioEs = bio.es;
      generated++;
      console.log(` ✓ ca:${bio.ca.length}ch es:${bio.es.length}ch`);
    } else {
      console.log(' ✗ failed');
    }

    // Save progress after each author
    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));

    // Small delay to respect rate limits
    await sleep(300);
  }

  console.log(`\n─── Done ───`);
  console.log(`Generated: ${generated} | Failed: ${processed - generated} | Skipped: ${skipped}`);
  console.log(`Output: ${AUTHORS_PATH}`);
}

main().catch(console.error);
