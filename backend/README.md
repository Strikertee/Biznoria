# Backend (owner: BACKEND-API lane)
Implements the frozen contract in `docs/API_CONTRACT.md`.
Routes are thin: validate → load daily flows (internal + consented external) → call `biznoria_ml` → respond with Pydantic schemas.
