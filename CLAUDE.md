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
# Full pipeline (all steps, ~45 min)
node scripts/pipeline.mjs

# Resume interrupted run
node scripts/pipeline.mjs --resume

# Run single step
node scripts/pipeline.mjs --only 4
```

### Pipeline steps

1. **scrape-authors.mjs** — Planeta de Libros, Wikipedia ES/CA, Google Books, Goodreads
2. **fix-goodreads.mjs** — Validate Goodreads links (strict name matching vs search results)
3. **collect-raw-bios.mjs** — Gather raw bios from all sources into `rawBios` field
4. **generate-bios-llm.mjs** — Generate original bilingual bios via Claude Haiku (requires `ANTHROPIC_API_KEY` in `.env`)
5. **enrich-books.mjs** — Enrich books from Goodreads (proper titles, years, covers, URLs)
6. **fetch-social-links.mjs** — Twitter/Instagram from Wikidata + Planeta
7. **fix-gaps.mjs** — Fill remaining gaps (photos via Wikidata/Open Library, books, presentingBook)
8. **consolidate-links.mjs** — Consolidate all links per author
9. **cleanup.mjs** — Remove publisher social links, placeholder covers, duplicate books

### Data sources per field

| Field | Source 1 (priority) | Source 2 | Source 3 |
|-------|-------------------|----------|----------|
| Photo | Planeta | Wikipedia | Wikidata/Goodreads |
| Bio CA+ES | Claude Haiku (from raw material) | Wikipedia | — |
| Books + covers | Goodreads (enrichment) | Planeta | Google Books |
| Social links | Wikidata | Planeta | — |
| Rating | Goodreads | — | — |

## Conventions

- All code in English
- UI text in Catalan (default) and Spanish via i18n
- Strict TypeScript
- Functional components with hooks
- Mobile-first responsive design
- Component names in PascalCase
- Hook names prefixed with `use`
