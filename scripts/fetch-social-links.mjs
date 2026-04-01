#!/usr/bin/env node
/**
 * Fetches social media links (Twitter/X, Instagram) for all authors.
 * Sources:
 *   1. Wikidata (structured data: P2002=Twitter, P2003=Instagram, P856=website)
 *   2. Planeta de Libros pages (social links in HTML)
 *   3. Goodreads author pages (links section)
 *
 * Usage: node scripts/fetch-social-links.mjs [--resume] [--limit N]
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const HEADERS = {
  'User-Agent': 'FirmesSantJordi2026/1.0 (educational project)',
  'Accept': 'application/json',
};
const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

// ─── Wikidata ───────────────────────────────────────────────────────

async function fetchWikidata(authorName) {
  // Search for the entity
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(authorName)}&language=es&type=item&limit=3&format=json&origin=*`;
  try {
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (res.status === 429) { await sleep(5000); return null; }
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.startsWith('{')) return null;
    const data = JSON.parse(text);

    for (const entity of data.search || []) {
      // Fetch claims for this entity
      const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entity.id}&format=json&origin=*`;
      const claimRes = await fetch(claimsUrl, { headers: HEADERS });
      if (!claimRes.ok) continue;
      const claimText = await claimRes.text();
      if (!claimText.startsWith('{')) continue;
      const claims = JSON.parse(claimText).claims || {};

      // Check P31 (instance of) to verify it's a human
      const isHuman = claims.P31?.some(c => c.mainsnak?.datavalue?.value?.id === 'Q5');
      if (!isHuman && claims.P31) continue; // Skip non-humans if P31 exists

      const result = {};

      // P2002 = Twitter username
      const twitter = claims.P2002?.[0]?.mainsnak?.datavalue?.value;
      if (twitter) result.twitter = `https://x.com/${twitter}`;

      // P2003 = Instagram username
      const instagram = claims.P2003?.[0]?.mainsnak?.datavalue?.value;
      if (instagram) result.instagram = `https://www.instagram.com/${instagram}`;

      // P856 = Official website
      const website = claims.P856?.[0]?.mainsnak?.datavalue?.value;
      if (website) result.website = website;

      // P4003 = Facebook page
      const facebook = claims.P4003?.[0]?.mainsnak?.datavalue?.value;
      if (facebook) result.facebook = `https://www.facebook.com/${facebook}`;

      // P1651 = YouTube channel ID
      const youtube = claims.P1651?.[0]?.mainsnak?.datavalue?.value;
      if (youtube) result.youtube = `https://www.youtube.com/channel/${youtube}`;

      // P7085 = TikTok username
      const tiktok = claims.P7085?.[0]?.mainsnak?.datavalue?.value;
      if (tiktok) result.tiktok = `https://www.tiktok.com/@${tiktok}`;

      if (Object.keys(result).length > 0) return result;
    }
  } catch { /* */ }
  return null;
}

// ─── Planeta page ───────────────────────────────────────────────────

async function fetchPlanetaSocial(planetaUrl) {
  if (!planetaUrl) return null;
  try {
    const res = await fetch(planetaUrl, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    const result = {};

    // Look for social links
    const twitterMatch = html.match(/href="(https?:\/\/(?:twitter|x)\.com\/[^"]+)"/i);
    if (twitterMatch) result.twitter = twitterMatch[1];

    const instaMatch = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i);
    if (instaMatch) result.instagram = instaMatch[1];

    const fbMatch = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i);
    if (fbMatch) result.facebook = fbMatch[1];

    const ytMatch = html.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/i);
    if (ytMatch) result.youtube = ytMatch[1];

    const tiktokMatch = html.match(/href="(https?:\/\/(?:www\.)?tiktok\.com\/[^"]+)"/i);
    if (tiktokMatch) result.tiktok = tiktokMatch[1];

    const webMatch = html.match(/href="(https?:\/\/(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\/?)"\s*[^>]*>.*?(?:web|oficial|personal)/i);
    if (webMatch) result.website = webMatch[1];

    return Object.keys(result).length > 0 ? result : null;
  } catch { /* */ }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const data = JSON.parse(readFileSync(AUTHORS_PATH, 'utf-8'));
  const authors = Object.values(data);

  let processed = 0;
  const stats = { wikidata: 0, planeta: 0, total: 0 };

  for (const author of authors) {
    if (processed >= limit) break;
    if (resume && author.links?.twitter) continue;

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${author.name}...`);

    let socialLinks = {};

    // 1. Wikidata (most reliable)
    const wd = await fetchWikidata(author.name);
    if (wd) {
      Object.assign(socialLinks, wd);
      stats.wikidata++;
    }
    await sleep(400);

    // 2. Planeta (supplement)
    if (author.planetaUrl && (!socialLinks.twitter || !socialLinks.instagram)) {
      const pl = await fetchPlanetaSocial(author.planetaUrl);
      if (pl) {
        // Only add what we don't have from Wikidata
        for (const [k, v] of Object.entries(pl)) {
          if (!socialLinks[k]) socialLinks[k] = v;
        }
        stats.planeta++;
      }
      await sleep(800);
    }

    // Merge into author.links
    if (Object.keys(socialLinks).length > 0) {
      author.links = { ...(author.links || {}), ...socialLinks };
      stats.total++;
    }

    const found = Object.keys(socialLinks);
    console.log(found.length ? ` ✓ [${found.join(', ')}]` : ' -');

    writeFileSync(AUTHORS_PATH, JSON.stringify(data, null, 2));
  }

  // Summary
  const total = authors.length;
  const withTwitter = authors.filter(a => a.links?.twitter).length;
  const withInsta = authors.filter(a => a.links?.instagram).length;
  const withWebsite = authors.filter(a => a.links?.website).length;
  const withAny = authors.filter(a => {
    const l = a.links || {};
    return l.twitter || l.instagram || l.website || l.facebook || l.tiktok || l.youtube;
  }).length;

  console.log(`\n─── Results ───`);
  console.log(`Sources: Wikidata ${stats.wikidata} | Planeta ${stats.planeta}`);
  console.log(`Twitter/X: ${withTwitter}/${total} | Instagram: ${withInsta}/${total} | Website: ${withWebsite}/${total}`);
  console.log(`Any social: ${withAny}/${total} (${Math.round(withAny*100/total)}%)`);
}

main().catch(console.error);
