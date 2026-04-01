#!/usr/bin/env node
/**
 * COMPLETE AUTHOR DATA PIPELINE
 *
 * Runs all data collection and enrichment steps in order.
 * Can be re-run safely (idempotent with --resume).
 * Use this when adding new authors or refreshing all data.
 *
 * Steps:
 *   1. scrape-authors.mjs    — 4-source scraping (Planeta, Wikipedia, Google Books, Goodreads)
 *   2. fix-goodreads.mjs     — Validate/fix Goodreads links with strict name matching
 *   3. collect-raw-bios.mjs  — Gather raw bios from all sources
 *   4. generate-bios-llm.mjs — Generate original bilingual bios via Claude Haiku
 *   5. enrich-books.mjs      — Enrich books from Goodreads (title, year, cover, URL)
 *   6. fetch-social-links.mjs— Twitter/Instagram from Wikidata + Planeta
 *   7. fix-gaps.mjs          — Fill remaining gaps (photos, books, presentingBook)
 *   8. consolidate-links.mjs — Consolidate all links
 *   9. cleanup               — Remove publisher social links, placeholders, duplicates
 *
 * Usage:
 *   node scripts/pipeline.mjs                    # Full run
 *   node scripts/pipeline.mjs --resume           # Resume from where it left off
 *   node scripts/pipeline.mjs --step 5           # Run from step 5 onwards
 *   node scripts/pipeline.mjs --only 4           # Run only step 4
 *
 * Requires: ANTHROPIC_API_KEY in .env (for step 4)
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const resume = args.includes('--resume') ? '--resume' : '';
const stepIdx = args.indexOf('--step');
const startStep = stepIdx !== -1 ? parseInt(args[stepIdx + 1], 10) : 1;
const onlyIdx = args.indexOf('--only');
const onlyStep = onlyIdx !== -1 ? parseInt(args[onlyIdx + 1], 10) : 0;

const steps = [
  { n: 1, name: 'Scrape authors (Planeta, Wikipedia, Google Books, Goodreads)', cmd: `node ${resolve(__dirname, 'scrape-authors.mjs')} ${resume}` },
  { n: 2, name: 'Fix Goodreads links (strict validation)', cmd: `node ${resolve(__dirname, 'fix-goodreads.mjs')}` },
  { n: 3, name: 'Collect raw bios from all sources', cmd: `node ${resolve(__dirname, 'collect-raw-bios.mjs')} ${resume}` },
  { n: 4, name: 'Generate bilingual bios via Claude Haiku', cmd: `node ${resolve(__dirname, 'generate-bios-llm.mjs')} ${resume}` },
  { n: 5, name: 'Enrich books from Goodreads', cmd: `node ${resolve(__dirname, 'enrich-books.mjs')} ${resume}` },
  { n: 6, name: 'Fetch social links (Wikidata + Planeta)', cmd: `node ${resolve(__dirname, 'fetch-social-links.mjs')} ${resume}` },
  { n: 7, name: 'Fill gaps (photos, books, presentingBook)', cmd: `node ${resolve(__dirname, 'fix-gaps.mjs')}` },
  { n: 8, name: 'Consolidate links', cmd: `node ${resolve(__dirname, 'consolidate-links.mjs')}` },
  { n: 9, name: 'Cleanup (publisher links, placeholders, duplicates)', cmd: `node ${resolve(__dirname, 'cleanup.mjs')}` },
];

console.log('╔══════════════════════════════════════════════════╗');
console.log('║        AUTHOR DATA PIPELINE                     ║');
console.log('╚══════════════════════════════════════════════════╝\n');

for (const step of steps) {
  if (onlyStep && step.n !== onlyStep) continue;
  if (step.n < startStep) continue;

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`STEP ${step.n}/9: ${step.name}`);
  console.log('═'.repeat(50));

  try {
    execSync(step.cmd, { stdio: 'inherit', cwd: resolve(__dirname, '..'), timeout: 3600000 });
    console.log(`✓ Step ${step.n} complete`);
  } catch (err) {
    console.error(`✗ Step ${step.n} failed: ${err.message}`);
    if (!resume) {
      console.error('Run with --resume to continue from this step, or --step ' + step.n + ' to retry');
      process.exit(1);
    }
  }
}

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║        PIPELINE COMPLETE                        ║');
console.log('╚══════════════════════════════════════════════════╝');
