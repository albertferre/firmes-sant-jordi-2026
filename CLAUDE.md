# Firmes Sant Jordi 2026

## Project description

Web app to browse book signing events for Sant Jordi 2026 in Barcelona.
Shows which author signs, what book, where and at what time.

## Tech stack

- **Frontend**: React + Vite + TypeScript
- **Styles**: Tailwind CSS 4
- **Map**: Leaflet + OpenStreetMap
- **Data**: Static JSON (`src/data/signings.json`)
- **i18n**: Catalan (default) + Spanish, via React Context
- **Deployment**: Vercel

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

## Project structure

```
src/
├── components/      # React components (Header, SigningCard, SigningList, Filters, MapView, SearchBar)
├── data/            # Signing data JSON
├── i18n/            # Translations and I18nContext
├── types/           # TypeScript types
├── hooks/           # Custom hooks (useFilters)
├── App.tsx          # Main component
├── main.tsx         # Entry point
└── index.css        # Global styles + Tailwind
```

## Data model

Each signing has: `id`, `author`, `book`, `publisher`, `location`, `address`, `coordinates` (lat/lng), `startTime`, `endTime`, `image` (optional).

## Author data pipeline

Data for 288 authors is collected from 5 sources and enriched via LLM.

```bash
# Full pipeline (all steps)
node scripts/pipeline.mjs

# Resume interrupted run
node scripts/pipeline.mjs --resume

# Run single step
node scripts/pipeline.mjs --only 4
```

### Pipeline architecture

The pipeline follows a 3-phase approach:

1. **Discover** — Find each author's main page URL on each source. If URL already exists in `authors.json`, skip the search.
2. **Scrape bibliographies** — From each saved URL, extract the full bibliography + metadata (followers, work count, ratings per book).
3. **Dedup & merge** — Combine books from all sources, deduplicate by ISBN or fuzzy title match.

Subsequent steps handle bios (LLM), social links, gap filling, and cleanup.

### Pipeline steps

1. **discover-authors.mjs** — Find author URLs on Planeta, Wikipedia, Google Books, Open Library, Goodreads. Skips if URL already in JSON.
2. **scrape-bibliographies.mjs** — From saved URLs, extract full bibliography from each source + author metadata (GR followers, OL work count, photos, bios).
3. **dedup-books.mjs** — Merge books across sources, deduplicate by ISBN/title similarity, pick best metadata per book.
4. **collect-raw-bios.mjs** — Gather raw bios from all sources into `rawBios` field.
5. **generate-bios-llm.mjs** — Generate original bilingual bios via Claude Haiku (requires `ANTHROPIC_API_KEY` in `.env`).
6. **fetch-social-links.mjs** — Twitter/Instagram from Wikidata + Planeta.
7. **fix-gaps.mjs** — Fill remaining gaps (photos via Wikidata/Open Library, books, presentingBook).
8. **consolidate-links.mjs** — Consolidate all links per author.
9. **cleanup.mjs** — Remove publisher social links, placeholder covers.

### Data sources per field

| Field | Source 1 (priority) | Source 2 | Source 3 | Source 4 |
|-------|-------------------|----------|----------|----------|
| Photo | Planeta | Wikipedia | Goodreads | Open Library |
| Bio CA+ES | Claude Haiku (from raw material) | Wikipedia | — | — |
| Books + covers | Goodreads (full bibliography) | Open Library | Planeta | Google Books |
| Book ratings | Goodreads (per book) | — | — | — |
| Author popularity | Goodreads followers | Open Library work count | — | — |
| Social links | Wikidata | Planeta | — | — |

### Data model principles

- All discovered URLs are persisted in `authors.json` to avoid redundant searches
- `rating` / `ratingsCount` belong at **book level**, not author level
- `goodreadsFollowers` at author level = popularity indicator
- Books are deduplicated across sources; best metadata wins per field

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Conventions

- All code in English
- UI text in Catalan (default) and Spanish via i18n
- Strict TypeScript
- Functional components with hooks
- Mobile-first responsive design
- Component names in PascalCase
- Hook names prefixed with `use`
