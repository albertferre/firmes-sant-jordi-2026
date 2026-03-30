# Firmes Sant Jordi 2026

## Descripció del projecte

WebApp per consultar les firmes de llibres de Sant Jordi 2026 a Barcelona.
Permet veure quin autor firma, quin llibre presenta, on i a quina hora.

## Stack tecnològic

- **Frontend**: React 18 + Vite + TypeScript
- **Estilos**: Tailwind CSS 3
- **Mapa**: Leaflet + OpenStreetMap (gratuït)
- **Dades**: JSON estàtic (`src/data/firmes.json`)
- **Desplegament**: GitHub Pages / Vercel

## Comandes

```bash
npm install          # Instal·lar dependències
npm run dev          # Servidor de desenvolupament (port 5173)
npm run build        # Build de producció
npm run preview      # Preview del build
```

## Estructura del projecte

```
src/
├── components/      # Components React (Header, FirmaCard, FirmaList, Filters, MapView, SearchBar)
├── data/            # JSON amb les dades de firmes
├── types/           # Tipus TypeScript
├── hooks/           # Custom hooks (useFilters)
├── App.tsx          # Component principal
├── main.tsx         # Entry point
└── index.css        # Estilos globals + Tailwind
```

## Model de dades

Cada firma té: `id`, `autor`, `libro`, `editorial`, `ubicacion`, `direccion`, `coordenadas` (lat/lng), `horaInicio`, `horaFin`, `imagen` (opcional).

## Convencions

- Codi en TypeScript estricte
- Components funcionals amb hooks
- Mobile-first responsive design
- Noms de components en PascalCase
- Noms de hooks amb prefix `use`
