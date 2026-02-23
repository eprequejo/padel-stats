# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server at http://localhost:4200 (auto-reloads)
- `npm run build` — production build (outputs to `docs/`)
- `npm test` — run unit tests with Karma/Jasmine
- `npm run deploy` — build for GitHub Pages and deploy via angular-cli-ghpages

## Architecture

Angular 19 standalone-component app that tracks padel player rankings and statistics for the OHU Padel women's team (multi-season: 24/25, 25/26). No routing — single-page app with season selector.

### Data Flow

All data comes from static JSON files in `src/assets/<season>/` (e.g., `src/assets/24-25/`, `src/assets/25-26/`):
- `players.json` — player master data (id, name, SNP ranking/points)
- `matches.json` — match results (players, sets, difficulty level 1-5, win/loss)
- `config.json` — app config (totalMatches count)

**DataService** fetches these via HTTP, parameterized by season. **SearchService** uses a BehaviorSubject to share search text reactively between AppComponent (input) and RankingComponent (filtering).

### Core Logic — RankingComponent

`src/app/ranking/ranking.component.ts` contains all business logic:

1. Loads players and matches from DataService (per season)
2. `calculateMetrics()` enriches each player with stats (won/lost/played), partner pair effectiveness, and the **Factor de Rendimiento (FR)** performance score
3. FR formula: `(VP × 0.70 + P_adj × 0.30) × 5 × confianza × bonusParticipación`
   - **VP (Victoria Ponderada):** `wonWeight / (played × 5)` [0,1] — solo victorias ponderadas por dificultad (`6 - pista`). Sin penalización por derrotas. Normalizado por máximo teórico para no penalizar jugar partidos difíciles.
   - **P_adj (Participación ajustada):** `(played / totalMatches) × min(1, VP / 0.4)` — participation only counts fully if VP ≥ 0.4; below that, it scales down proportionally
   - **Confianza:** `min(1, played / 3)` — minimum 3 matches for full FR
   - **Bonus participación:** escala de ×1.0 (2 partidos o menos) a ×1.75 (todos los partidos). Premia jugar más partidos.
4. FR levels: Muy Alto (≥3.5, dorado), Alto (≥2.5, verde), Medio (≥1.5, amarillo), Medio-Bajo (<1.5, naranja)
5. Players are ranked by FR and displayed in a sortable table (desktop) or card list (mobile)

### Key Files

- `src/app/models.ts` — TypeScript interfaces: Player, Match, Stats, FRGlobal, Pair
- `src/app/data.service.ts` — HTTP service for loading JSON data
- `src/app/search.service.ts` — reactive search state (BehaviorSubject)
- `src/app/ranking/` — main ranking component (table, cards, metrics)

## Conventions

- **Standalone components** — no NgModules; components import their dependencies directly
- **Dark theme** — black background (#000), white text, color-coded FR badges
- **Bootstrap 5** for layout (grid, responsive utilities); custom CSS per component
- **Responsive**: table view on desktop, card view on mobile (768px breakpoint)
- **TypeScript strict mode** enabled with strict Angular template checking
- **Spanish** used for domain terms (nombre, apellidos, jugador, ganados, perdidos, Factor de Rendimiento)
- **2-space indent**, single quotes (TS), UTF-8
