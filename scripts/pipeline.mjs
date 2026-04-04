#!/usr/bin/env node
/**
 * COMPLETE AUTHOR DATA PIPELINE
 *
 * Runs all data collection and enrichment steps in order.
 * Can be re-run safely (idempotent with --resume).
 * Use this when adding new authors or refreshing all data.
 *
 * Phase 1: Discover author URLs on all sources
 * Phase 2: Scrape full bibliographies from each source
 * Phase 3: Deduplicate and merge books across sources
 * Then: bios, social links, gap filling, cleanup
 *
 * Steps:
 *   1. discover-authors.mjs       — Find URLs on Planeta, Wikipedia, OL, Goodreads
 *   2. scrape-bibliographies.mjs  — Full bibliography from each source URL
 *   3. dedup-books.mjs            — Merge + deduplicate books across sources
 *   4. collect-raw-bios.mjs       — Gather raw bios from all sources
 *   5. generate-bios-llm.mjs      — Bilingual bios via Claude Haiku
 *   6. fetch-social-links.mjs     — Twitter/Instagram from Wikidata + Planeta
 *   7. fix-gaps.mjs               — Fill remaining gaps (photos, presentingBook)
 *   8. consolidate-links.mjs      — Consolidate all links
 *   9. cleanup.mjs                — Remove publisher links, placeholders
 *
 * Usage:
 *   node scripts/pipeline.mjs                    # Full run
 *   node scripts/pipeline.mjs --resume           # Resume from where it left off
 *   node scripts/pipeline.mjs --step 5           # Run from step 5 onwards
 *   node scripts/pipeline.mjs --only 3           # Run only step 3
 *
 * Requires: ANTHROPIC_API_KEY in .env (for step 5)
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
  { n: 1, name: 'Discover author URLs on all sources', cmd: `node ${resolve(__dirname, 'discover-authors.mjs')}` },
  { n: 2, name: 'Scrape full bibliographies from all sources', cmd: `node ${resolve(__dirname, 'scrape-bibliographies.mjs')} ${resume}` },
  { n: 3, name: 'Deduplicate and merge books across sources', cmd: `node ${resolve(__dirname, 'dedup-books.mjs')}` },
  { n: 4, name: 'Validate data quality (wrong GR, homonyms)', cmd: `node ${resolve(__dirname, 'validate-authors.mjs')}` },
  { n: 5, name: 'Collect raw bios from all sources', cmd: `node ${resolve(__dirname, 'collect-raw-bios.mjs')} ${resume}` },
  { n: 6, name: 'Generate bilingual bios via Claude Haiku', cmd: `node ${resolve(__dirname, 'generate-bios-llm.mjs')} ${resume}` },
  { n: 7, name: 'Fetch social links (Wikidata + Planeta)', cmd: `node ${resolve(__dirname, 'fetch-social-links.mjs')} ${resume}` },
  { n: 8, name: 'Fill gaps (photos, presentingBook)', cmd: `node ${resolve(__dirname, 'fix-gaps.mjs')}` },
  { n: 9, name: 'Consolidate links', cmd: `node ${resolve(__dirname, 'consolidate-links.mjs')}` },
  { n: 10, name: 'Cleanup (publisher links, placeholders)', cmd: `node ${resolve(__dirname, 'cleanup.mjs')}` },
  { n: 11, name: 'Verify data integrity', cmd: `node ${resolve(__dirname, 'test-pipeline.mjs')}` },
  { n: 12, name: 'Split author data for lazy loading', cmd: `node ${resolve(__dirname, 'split-author-data.mjs')}` },
];

console.log('╔══════════════════════════════════════════════════╗');
console.log('║        AUTHOR DATA PIPELINE                     ║');
console.log('╚══════════════════════════════════════════════════╝\n');

for (const step of steps) {
  if (onlyStep && step.n !== onlyStep) continue;
  if (step.n < startStep) continue;

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`STEP ${step.n}/${steps.length}: ${step.name}`);
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
