#!/usr/bin/env node
/**
 * Multi-source author data scraper (priority order):
 *   1. Planeta de Libros — photo (HD) + bio (ES) + books with covers
 *   2. Wikipedia ES + CA — photo (HD) + bilingual bio
 *   3. Google Books API — books with covers, descriptions, ISBNs
 *   4. Goodreads — author link, rating, fallback photo
 *
 * Usage: node scripts/scrape-authors.mjs [--resume] [--limit N] [--skip-goodreads]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIGNINGS_PATH = resolve(ROOT, 'src/data/signings.json');
const OUTPUT_PATH = resolve(ROOT, 'src/data/authors.json');

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const skipGoodreads = args.includes('--skip-goodreads');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,ca;q=0.8',
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Planeta de Libros ──────────────────────────────────────────────

async function searchPlaneta(authorName) {
  const url = `https://www.planetadelibros.com/?textoBuscador=${encodeURIComponent(authorName)}`;
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();
    // Find author page URL: /autor/name-slug/id
    const nameNorm = authorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Get significant name parts (skip particles like "de", "i", "del", "la")
    const particles = new Set(['de', 'del', 'la', 'el', 'i', 'y', 'les', 'los', 'las', 'en']);
    const nameParts = nameNorm.split(/\s+/).filter((p) => p.length > 2 && !particles.has(p));
    const authorLinks = [...html.matchAll(/\/autor\/([^/"]+)\/(\d+)/g)];
    // Deduplicate links
    const seen = new Set();
    for (const m of authorLinks) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const slug = m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Match if slug contains at least surname (last significant part) + one other part
      const matchCount = nameParts.filter((p) => slug.includes(p)).length;
      if (matchCount >= Math.min(2, nameParts.length)) {
        return `https://www.planetadelibros.com/autor/${m[1]}/${m[2]}`;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchPlanetaAuthor(planetaUrl) {
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
    if (bioMatch) {
      bio = stripTags(bioMatch[1]);
    }
    // Fallback: look for meta description
    if (!bio || bio.length < 30) {
      const metaMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      if (metaMatch) {
        const desc = stripTags(metaMatch[1]);
        if (desc.length > bio.length && !desc.startsWith('Planeta de')) bio = desc;
      }
    }
    // Fallback: largest paragraph
    if (!bio || bio.length < 30) {
      const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
      for (const p of paragraphs) {
        const text = stripTags(p);
        if (text.length > 60 && text.length > bio.length && !text.includes('cookie') && !text.includes('Planeta de Libros')) {
          bio = text.slice(0, 1000);
        }
      }
    }

    // Books
    const books = [];
    const bookMatches = html.matchAll(/\/libro-([^/"]+)\/(\d+)/g);
    const seenSlugs = new Set();
    for (const m of bookMatches) {
      if (seenSlugs.has(m[1]) || books.length >= 6) continue;
      seenSlugs.add(m[1]);
      const title = m[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      // Try to find cover image for this book
      const coverRegex = new RegExp(`proassetspdlcom\\.cdnstatics2\\.com/usuaris/libros/[^"]*${m[1]}[^"]*\\.(?:webp|jpg|png)`, 'i');
      const coverMatch = html.match(coverRegex);
      books.push({
        title,
        cover: coverMatch ? `https://${coverMatch[0]}` : '',
        description: '',
        publishedDate: '',
        publisher: '',
        isbn: '',
      });
    }

    return { photo, bio: bio.slice(0, 1000), books, planetaUrl };
  } catch {
    return null;
  }
}

// ─── Wikipedia ES + CA (bilingual) ──────────────────────────────────

function wikiTitleVariants(name) {
  const base = name.replace(/ /g, '_');
  return [base, `${base}_(escritor)`, `${base}_(escritora)`, `${base}_(periodista)`];
}

async function fetchWikiLang(authorName, lang) {
  const variants = wikiTitleVariants(authorName);
  const titles = variants.join('|');
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=500&format=json&redirects=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages)) {
      if (page.pageid && page.pageid !== -1) {
        return {
          photo: page.thumbnail?.source || '',
          bio: (page.extract || '').slice(0, 1000),
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchWikipediaBilingual(authorName) {
  const [es, ca] = await Promise.all([
    fetchWikiLang(authorName, 'es'),
    fetchWikiLang(authorName, 'ca'),
  ]);
  return {
    wikiPhoto: es?.photo || ca?.photo || '',
    bioEs: es?.bio || '',
    bioCa: ca?.bio || '',
    wikiUrl: es?.url || ca?.url || '',
  };
}

// ─── Google Books API ───────────────────────────────────────────────

async function fetchGoogleBooks(authorName) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(`"${authorName}"`)}&langRestrict=es&maxResults=10&orderBy=relevance`;
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
    return books.slice(0, 6);
  } catch {
    return [];
  }
}

// ─── Goodreads ──────────────────────────────────────────────────────

async function searchGoodreads(name) {
  const url = `https://www.goodreads.com/search?q=${encodeURIComponent(name)}&search_type=books`;
  try {
    const res = await fetch(url, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/\/author\/show\/(\d+\.[^"]+)/);
    return match ? `https://www.goodreads.com/author/show/${match[1]}` : null;
  } catch {
    return null;
  }
}

async function fetchGoodreadsPage(authorUrl) {
  try {
    const res = await fetch(authorUrl, { headers: SCRAPE_HEADERS, redirect: 'follow' });
    if (!res.ok) return null;
    const html = await res.text();

    let photo = '';
    for (const pat of [
      /class="photo\/author[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i,
      /<img[^>]*src="(https:\/\/images\.gr-assets\.com\/authors\/[^"]+)"/i,
    ]) {
      const m = html.match(pat);
      if (m?.[1] && !m[1].includes('nophoto')) { photo = m[1].replace('p5/', 'p8/'); break; }
    }

    const rating = html.match(/Average rating:\s*(\d\.\d{1,2})/i)?.[1] || '';
    const ratingsCount = (html.match(/([\d,]+)\s*ratings/i)?.[1] || '').replace(/,/g, '');

    return { grPhoto: photo, rating, ratingsCount };
  } catch {
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const signings = JSON.parse(readFileSync(SIGNINGS_PATH, 'utf-8'));
  const authors = [...new Set(signings.map((s) => s.author))].sort();

  const presentingBooks = {};
  for (const s of signings) {
    if (s.book && !presentingBooks[s.author]) presentingBooks[s.author] = s.book;
  }

  let existing = {};
  if (resume && existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Resuming — ${Object.keys(existing).length} authors already scraped`);
  }

  const results = { ...existing };
  let processed = 0;
  const stats = { planeta: 0, wiki: 0, gbooks: 0, gr: 0 };

  for (const author of authors) {
    if (processed >= limit) break;
    if (resume && results[author]?.sources?.photo) continue;

    processed++;
    process.stdout.write(`[${processed}/${Math.min(authors.length, limit)}] ${author}...`);

    // 1. Planeta de Libros (rate-limited scraping)
    let planeta = null;
    const planetaUrl = await searchPlaneta(author);
    if (planetaUrl) {
      await sleep(800);
      planeta = await fetchPlanetaAuthor(planetaUrl);
      if (planeta?.bio) stats.planeta++;
      await sleep(800);
    }

    // 2. Wikipedia ES + CA (fast API, no rate limit)
    const wiki = await fetchWikipediaBilingual(author);
    if (wiki.bioEs || wiki.bioCa) stats.wiki++;

    // 3. Google Books (fast API)
    const gbooks = await fetchGoogleBooks(author);
    if (gbooks.length > 0) stats.gbooks++;

    // 4. Goodreads (slow)
    let gr = null;
    let grUrl = '';
    if (!skipGoodreads) {
      grUrl = await searchGoodreads(author) || '';
      if (grUrl) {
        await sleep(1200);
        gr = await fetchGoodreadsPage(grUrl);
        if (gr) stats.gr++;
        await sleep(1500);
      } else {
        await sleep(600);
      }
    }

    // ─── Merge with priority ───
    // Photo: Planeta > Wikipedia > Goodreads
    const photo = planeta?.photo || wiki.wikiPhoto || gr?.grPhoto || '';
    const photoSource = planeta?.photo ? 'planeta' : wiki.wikiPhoto ? 'wikipedia' : gr?.grPhoto ? 'goodreads' : 'none';

    // Bio: Wikipedia > Planeta (Planeta often has generic "Encuentra los últimos libros..." text)
    const planetaBioUsable = planeta?.bio && !planeta.bio.startsWith('Encuentra los') && planeta.bio.length > 50;
    const bioEs = wiki.bioEs || (planetaBioUsable ? planeta.bio : '') || '';
    const bioCa = wiki.bioCa || '';

    // Books: Planeta (presenting) > Google Books
    let books = gbooks;
    if (planeta?.books?.length && planeta.books.some((b) => b.cover)) {
      // Merge: Planeta books first (they have better covers), then fill with Google Books
      const planetaTitles = new Set(planeta.books.map((b) => b.title.toLowerCase()));
      const extra = gbooks.filter((b) => !planetaTitles.has(b.title.toLowerCase()));
      books = [...planeta.books, ...extra].slice(0, 6);
    }

    results[author] = {
      name: author,
      photo,
      bioEs,
      bioCa,
      presentingBook: presentingBooks[author] || '',
      books,
      goodreadsUrl: grUrl,
      rating: gr?.rating || '',
      ratingsCount: gr?.ratingsCount || '',
      wikiUrl: wiki.wikiUrl || '',
      planetaUrl: planeta?.planetaUrl || '',
      sources: {
        photo: photoSource,
        bio: planeta?.bio ? 'planeta' : wiki.bioEs ? 'wikipedia_es' : wiki.bioCa ? 'wikipedia_ca' : 'none',
        books: planeta?.books?.length ? 'planeta+google' : gbooks.length > 0 ? 'google_books' : 'none',
      },
    };

    console.log(` ✓ foto:${photoSource} · bio:${bioEs ? 'es' : ''}${bioCa ? '+ca' : ''} · ${books.length} books · gr:${gr?.rating || '-'}`);
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  }

  const total = Object.keys(results).length;
  const withPhoto = Object.values(results).filter((a) => a.photo).length;
  const withBio = Object.values(results).filter((a) => a.bioEs || a.bioCa).length;
  const withBooks = Object.values(results).filter((a) => a.books?.length > 0).length;

  console.log(`\n─── Results ───`);
  console.log(`Total: ${total} | Photo: ${withPhoto} (${Math.round(withPhoto * 100 / total)}%) | Bio: ${withBio} (${Math.round(withBio * 100 / total)}%) | Books: ${withBooks} (${Math.round(withBooks * 100 / total)}%)`);
  console.log(`Sources — Planeta: ${stats.planeta} | Wiki: ${stats.wiki} | GBooks: ${stats.gbooks} | GR: ${stats.gr}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);
