# Frontend (owner: FRONTEND-DASHBOARD lane — IMPLEMENTED)
React + TypeScript + Vite + Tailwind + Recharts + TanStack Query against the
frozen contract (`docs/API_CONTRACT.md`, client in `src/api/client.ts`).
Wema purple (`wema` Tailwind palette, primary `#5c2d91`) on white.

## Pages
- Portfolio (officer): summary cards + SME table → drill-down.
- SME detail: health metrics, cash-flow chart, 30/60/90 forecast chart, credit
  readiness (components + reasons + disclaimer), connected accounts with
  internal vs authorised-external badges, loan simulator (officer only).
- Header role switch (demo): SME customer gets the review-only surface for
  their own business; simulator/portfolio stay officer-only. Rendering aid
  only — enforcement lives in the backend (`backend/app/auth.py`).

## Run
```bash
npm install
npm run dev      # http://localhost:5173, VITE_API_BASE points at the API
npm test         # vitest: contract paths + role matrix
npm run build
```
