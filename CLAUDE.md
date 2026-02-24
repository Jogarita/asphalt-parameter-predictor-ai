# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build (Vite)
- `npm run preview` — Preview production build

No test runner or linter is configured.

## Architecture

This is a single-page React 19 + TypeScript app (Vite bundled, TailwindCSS via Play CDN) that predicts asphalt mix performance parameters using statistical regression models. There is no backend — all computation runs client-side.

### Core Data Flow

1. **`App.tsx`** — Orchestrator. Manages all state (`columns: MixColumn[]`), handles prediction triggering, file save/load (JSON), and Excel export (via `xlsx`).
2. **`constants.ts`** — Defines `SIEVES` (11 sieve sizes), `PROPERTIES` (inputs: Gsb, FAA; outputs: VMA, CTIndex, FI, Rut Depth), and `INITIAL_COLUMNS` (default sample data).
3. **`types.ts`** — Core interfaces: `MixColumn` (a trial's data keyed by sieve/property IDs), `PredictionResult`.
4. **`services/predictionModels.ts`** — The prediction engine. Contains all 10 regression model coefficient sets (hardcoded empirical constants) and the Centered Deviation prediction algorithm.

### Prediction Logic (Critical to Understand)

The app uses **"Centered Deviation"** regression — see `MODEL_LOGIC.md` for the full mathematical explanation. Key points:

- **Model selection** depends on the target parameter and input characteristics:
  - **VMA**: Identity Line check on 0.45 Power Chart determines Model 1 (above) vs Model 2 (below). Model 2 has FAA and No-FAA variants.
  - **Rut Depth / CTIndex / I-FIT**: Each has FAA and No-FAA variants (selected based on whether all trials provide FAA).
- **`applyCenteredModel()`**: Computes deviations of target inputs from the global mean (across target + all valid references), multiplies by coefficients.
- **Reconstruction formula**: `P_final = (regOut * N + sumMeasuredRefs) / (N - 1)` where N = total trial count.
- **Derived ratios**: VMA Model 1 uses `new_ca_ratio` (from sieves #8/#16/#30) and `new_fac_ratio` (from sieves #100/#30) instead of raw sieve values.
- Coefficients are empirical constants derived from laboratory research data — do not modify without re-deriving from research data.

### Project Layout

- Root-level `App.tsx`, `index.tsx`, `types.ts`, `constants.ts` (no `src/` directory)
- `components/` — UI components (MixMatrix for data entry, GradationChart for 0.45 power chart visualization, ResultsDashboard, InfoModal, PremiumSelect, Toast)
- `services/predictionModels.ts` — All prediction math
- `@/*` path alias maps to project root
