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

## Conventions

- All code in English
- UI text in Catalan (default) and Spanish via i18n
- Strict TypeScript
- Functional components with hooks
- Mobile-first responsive design
- Component names in PascalCase
- Hook names prefixed with `use`
