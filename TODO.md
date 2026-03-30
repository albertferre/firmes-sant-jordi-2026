# TODO - Firmes Sant Jordi 2026

## Fase 1: Setup inicial
- [x] Create CLAUDE.md with project docs
- [x] Create TODO.md with task plan
- [x] Setup Vite + React + TypeScript
- [x] Configure Tailwind CSS
- [x] Base folder structure

## Fase 2: Data
- [x] Define TypeScript types (Signing interface)
- [x] Create JSON with sample signings (realistic Barcelona data)

## Fase 3: UI Core
- [x] Header component with Sant Jordi branding
- [x] SigningCard component (individual signing card)
- [x] SigningList component (signing list)
- [x] SearchBar component (real-time search)

## Fase 4: Filters
- [x] Filter by author
- [x] Filter by location (bookshop/stand)
- [x] Filter by time slot
- [x] useFilters hook for filter state management

## Fase 5: Map
- [x] Integrate Leaflet with OpenStreetMap
- [x] MapView component with location markers
- [x] Popups with signing info on marker click
- [x] Toggle between list and map views

## Fase 6: i18n & Code quality
- [x] Refactor all code to English
- [x] Add i18n support (Catalan default + Spanish)
- [x] Language toggle in header

## Fase 7: Deployment
- [x] Configure Vercel (vercel.json)
- [x] Deploy to Vercel
- [ ] Custom domain (optional)

## Fase 8: Favorites, Share & PWA
- [x] Add favorites with localStorage persistence
- [x] Favorites view tab in header with heart icon and counter
- [x] Share signing via Web Share API / WhatsApp fallback
- [x] PWA with vite-plugin-pwa (manifest, service worker, installable)
- [x] PWA icons and theme color

## Future improvements (backlog)
- [ ] Notifications (alert X minutes before a signing)
- [ ] Dark mode
- [ ] Real Sant Jordi 2026 data when available
