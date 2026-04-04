# Lessons Learned

## Pipeline Architecture
- **Don't mix discovery and scraping in one step.** Separate finding URLs (search) from extracting data (scrape). This makes each step idempotent and debuggable.
- **Persist all discovered URLs in the JSON.** If we already have a Goodreads/Open Library URL for an author, never re-search — go directly to fetch.
- **Ratings belong at book level, not author level.** Author-level `rating`/`ratingsCount` is meaningless. Per-book ratings from Goodreads are what matters.
- **Extract full bibliographies from author pages.** Don't search for individual books when we already have the author's page URL — scrape the full book list from there.
- **Recover data from git before re-scraping.** When data exists in previous commits, `git show` + merge is instant vs. 45 min of network requests.
- **Store raw scraped data in a separate file.** IDE file watchers can overwrite `authors.json` when it's open. Use `raw-books.json` for intermediate pipeline data.

## Data Migration
- **Rename fields in data AND code simultaneously.** Renaming `goodreadsUrl` → `openLibraryUrl` in types/components without updating `authors.json` data = silent runtime breakage. TypeScript doesn't validate JSON import field names.
- **Kill background pipelines before modifying the same files.** A pipeline writing to `authors.json` in a loop will overwrite any manual changes.
- **ESM imports must be at the top of the file.** An `import` statement in the middle of an ESM module causes Node to silently not execute code after it. Always check imports are at the top level.

## LLM Bio Generation
- **Anti-hallucination prompts must be explicit and strict.** "Don't invent data" is not enough. Need specific prohibitions: no invented prizes, nationalities, dates, professions, book titles. And when source material is scarce, instruct to write a minimal bio rather than fill gaps with invented facts.

## Process
- **Plan before implementing non-trivial changes.** The Goodreads → Open Library migration was attempted without a plan, leaving code half-migrated when the crash happened.
- **When combining data sources, more is better than less.** Don't replace one source with another — combine both and deduplicate.
- **Run ALL pipeline steps, not just the new ones.** Social links, bios, and cleanup steps must run after the new bibliography pipeline or data will be incomplete.
