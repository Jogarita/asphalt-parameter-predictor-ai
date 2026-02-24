# Asphalt Parameter Predictor

A client-side tool that predicts asphalt mix performance parameters (VMA, Rut Depth, CTIndex, I-FIT) using Centered Deviation regression models. See [MODEL_LOGIC.md](MODEL_LOGIC.md) for the full mathematical explanation.

## Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **TailwindCSS** — Styling via [Play CDN](https://tailwindcss.com/docs/installation/play-cdn) (not compiled PostCSS)
- **Recharts** — Gradation chart visualization
- **xlsx** — Excel export

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev       # Start dev server on port 3000
npm run build     # Production build
npm run preview   # Preview production build
```

## Project Structure

| File | Role |
|------|------|
| `index.tsx` | App entry point — mounts React root |
| `App.tsx` | Main orchestrator — manages central state (`columns`), dispatches predictions, handles file I/O (JSON save/load, Excel export), and composes the UI layout |
| `types.ts` | TypeScript interfaces (`MixColumn`, `PredictionResult`, `MixProperty`, etc.) |
| `constants.ts` | Sieve definitions (`SIEVES`), property definitions (`PROPERTIES`), and default sample data (`INITIAL_COLUMNS`) |
| `services/predictionModels.ts` | All 10 regression models, the `applyCenteredModel()` prediction engine, model selection logic, and input validation |
| `components/MixMatrix.tsx` | Data entry table — supports paste from spreadsheets, conditional cell activation, and reference/target toggle logic |
| `components/GradationChart.tsx` | 0.45 power chart visualization using Recharts — displays gradation curves and the identity line |
| `components/ResultsDashboard.tsx` | Displays prediction results with model info |
| `components/PremiumSelect.tsx` | Custom styled dropdown component |
| `components/InfoModal.tsx` | Help/information modal |
| `components/Toast.tsx` | Notification toast messages |

## Architecture

```
index.tsx → App.tsx (state) → [MixMatrix, GradationChart, ResultsDashboard]
                 ↓
         predictionModels.ts (models + validation)
```

## Data Flow

1. User enters gradation and mix property data via `MixMatrix`
2. `App.tsx` stores all trial data in `columns: MixColumn[]` state
3. User clicks "Run Model" → `handlePredict()` calls `runPrediction()` from `predictionModels.ts`
4. `runPrediction()` selects the appropriate model, validates inputs, runs centered deviation regression, and returns the predicted value
5. Result is stored back into the target column's state and displayed in `ResultsDashboard`

## Key Design Decisions

- **No backend** — all computation runs client-side in the browser
- **Coefficients hardcoded** — regression coefficients are empirical constants derived from laboratory research data, embedded directly in `predictionModels.ts`
- **Tailwind via Play CDN** — uses the CDN script tag rather than compiled PostCSS for simplicity
- **Predicted values tracked** — each `MixColumn` has a `predictedKeys` Set that tracks which values were predicted vs. measured, enabling visual differentiation in the UI
