# Process Log

> Append after every meaningful checkpoint using the mandatory template.

### [2026-10-08 00:00] [ML] [SCAFFOLD]
Status: DONE
Goal: Create push-ready monorepo scaffold so backend/frontend teammates can plug in; ML owner implements forecast + credit
Changes: Initialised docs (PRD/ARCHITECTURE/API_CONTRACT/TEST_PLAN), root files, backend skeleton, ml package + tests, frontend skeleton, data/scripts placeholders
Files changed: docs/*, backend/*, ml/*, frontend/*, scripts/*, render.yaml, README.md, .gitignore
Tests run: none yet (scaffold only)
Test result: n/a
Decisions: Monorepo with frozen contract; ML pure functions (no DB/HTTP); backend thin routes; frontend mirrors contract
Blockers: None — repo was empty, greenfield scaffold
Next checkpoint: B. ML implementation complete (features/metrics/forecast/credit/simulation)
Time remaining: ~9h

### [2026-10-08 01:30] [ML] [ML-FORECAST + ML-CREDIT]
Status: PARTIAL
Goal: Implement forecast + credit ML package with leakage-safe features, chronological eval, frozen-weight scoring, simulation invariant, and full pytest coverage
Changes: Implemented ml/src/biznoria_ml/{features,metrics,forecast,credit,simulation}.py plus ml/tests/{test_features,test_metrics,test_forecast,test_credit,test_simulation}.py; all files py_compile clean; git repo initialised (uncommitted)
Files changed: ml/src/biznoria_ml/*.py, ml/tests/*.py, ml/conftest.py, ml/requirements.txt, scripts/generate_synthetic.py
Tests run: none yet — blocked on pip install (pandas/sklearn/pytest wheels; flaky DNS, background retry in progress)
Test result: n/a
Decisions: Past-only features via shift(1); baseline preferred on MAE ties; MAE not MAPE; neutral 50 for missing repayment history; amortised-payment simulation guarantees liquidity invariant by construction
Blockers: Network DNS failures stalling pip; retrying in background
Next checkpoint: C. Local tests pass (pytest ml/tests -q)
Time remaining: ~8.5h

### [2026-10-08 02:15] [ML] [ML-FORECAST + ML-CREDIT]
Status: DONE
Goal: Verify ML package — full pytest suite plus synthetic end-to-end pipeline smoke
Changes: Fixed 2 test-only bugs (shared fixtures moved to ml/conftest.py; disclaimer scan excludes verbatim contract disclaimer); no implementation changes needed. Pipeline smoke: generate_synthetic (5 SMEs/200d) → to_daily → metrics → forecast(90) → credit → simulate all OK (model=hgb, score=52.37 emerging)
Files changed: ml/conftest.py, ml/tests/test_metrics.py, ml/tests/test_credit.py, ml/tests/test_forecast.py
Tests run: python -m pytest ml/tests -q (pandas 3.0.6, sklearn 1.9.1, pytest 9.1.1)
Test result: 25 passed in ~29s
Decisions: Test bugs were harness-side (fixture scope, substring scan vs verbatim disclaimer) — implementation untouched, per minimal-change rule
Blockers: None remaining on ML lane
Next checkpoint: D. Integration complete — backend teammate imports biznoria_ml for forecast/credit/simulation routes per API_CONTRACT.md
Time remaining: ~8h

### [2026-10-08 02:30] [ML] [SCAFFOLD]
Status: DONE
Goal: Push monorepo to GitHub so backend/frontend teammates can collaborate
Changes: git remote add origin https://github.com/Strikertee/Biznoria.git; pushed master (commit 99ca4d7, 46 files)
Files changed: none (push only)
Tests run: none (no code change)
Test result: n/a
Decisions: master tracks origin/master; teammates branch per lane
Blockers: None
Next checkpoint: D. Integration complete (backend routes calling biznoria_ml)
Time remaining: ~8h

### [2026-10-08 03:00] [ML] [OPEN-BANKING-MOCK interface]
Status: DONE
Goal: Formalise the ALAT-for-Business consent lifecycle (prompt → approve → read-only time-boxed token → anytime revoke) in docs + adapter interface so backend/open-banking lanes build to one model
Changes: PRD rule 2 + ARCHITECTURE consent-lifecycle section; backend/app/adapters/openbanking.py now has AccessToken (read-only scopes, issued/expires/revoked), issue_token, SyntheticProvider consent store (request/approve/revoke), token-gated fetch_transactions (unknown/expired/revoked token → zero rows, never an error leak)
Files changed: docs/PRD.md, docs/ARCHITECTURE.md, backend/app/adapters/openbanking.py
Tests run: stdlib-only lifecycle smoke (no-consent→internal-only; approve→token+rows; no-token→no-rows; revoke→cut-off; expiry→cut-off)
Test result: CONSENT_SMOKE_OK
Decisions: Write/payment scopes excluded by design (READ_ONLY_SCOPES allowlist); token checked against server-side store, never trusted from the presented copy alone; no API contract change (no new endpoints/fields — additive backend internals only)
Blockers: None — OPEN-BANKING-MOCK lane owns the seeded-RNG data + consent-store wiring on top of this interface
Next checkpoint: D. Integration complete (backend routes calling biznoria_ml + adapter)
Time remaining: ~7.5h

### [2026-10-08 03:20] [ML] [ROLE-MODEL]
Status: DONE
Goal: Formalise the two-role visibility model (SME review-only surface vs officer simulation/combined view) without changing the frozen contract
Changes: PRD §11 (roles + hard rules), ARCHITECTURE role→surface matrix, API_CONTRACT authorization section (additive), new backend/app/auth.py stub with pure testable is_allowed() rule
Files changed: docs/PRD.md, docs/ARCHITECTURE.md, docs/API_CONTRACT.md, backend/app/auth.py
Tests run: stdlib auth smoke (own-data allow; cross-SME/POST/portfolio/list deny for sme; officer allow-all; unknown role deny)
Test result: AUTH_SMOKE_OK
Decisions: Contract unchanged (same paths/schemas) — enforcement is a backend guard + sme_id scoping, frontend renders per role but never enforces; consent/token gating applies on both roles; simulator + listing stay officer-only
Blockers: None — BACKEND-API lane owns real auth wiring on top of is_allowed()
Next checkpoint: D. Integration complete (backend routes calling biznoria_ml + adapter + auth)
Time remaining: ~7h

### [2026-10-08 17:55] [BACKEND-API] [BACKEND-API]
Status: DONE
Goal: Checkpoint A + B — inspect the whole repo (PRD.md, PRD .docx/.pdf, ARCHITECTURE, API_CONTRACT, TEST_PLAN, PROCESS_LOG, OpenCode master prompt, ml/, frontend/) and land the backend skeleton
Changes: Implemented the full backend behind the frozen contract. New: config.py (env-driven DATABASE_URL/FRONTEND_ORIGIN), database.py (engine/SessionLocal/Base/get_db), models.py (SME, Account, Transaction, Consent per ARCHITECTURE + PRD §8.2 CREDIT/DEBIT + category enum), schemas.py (frozen fields verbatim + additive P0 fields), deps.py, seed.py (deterministic loader + PRD §9 fixtures), services/{ml,consent,cashflow,analytics,forecast,credit,simulation,portfolio}.py, routers/{portfolio,smes,accounts,simulation}.py; main.py rewritten with lifespan (create_all → seed → consent hydrate), CORS, /healthz, /readyz and a {"detail": str} validation handler. auth.py extended with Principal + require_officer + scope_to_own_sme (is_allowed preserved). openbanking.py gained register_consent/token_for_consent (additive). Alembic: alembic.ini + backend/alembic/{env.py,script.py.mako,versions/2fbf6a4c1b91_initial_schema.py}
Files changed: backend/app/{config,database,models,schemas,deps,seed,main,auth}.py, backend/app/services/*.py, backend/app/routers/*.py, backend/app/adapters/openbanking.py, alembic.ini, backend/alembic/**, render.yaml, .gitignore, docs/DECISIONS.md (new)
Tests run: none yet at this checkpoint (schema + smoke only)
Test result: n/a
Decisions: DB is SQLAlchemy over DATABASE_URL, defaulting to SQLite locally and PostgreSQL on Render (same code path). CREDIT/DEBIT is stored per PRD §8.2 and mapped to inflow/outflow only at the ML boundary (services/cashflow.py). Consent gate applied once in cashflow._load_rows so every downstream metric inherits it. Additive response fields logged as CR-002; accounts consent-state behaviour logged as CR-003
Blockers: ml/src/biznoria_ml/metrics.py::growth_trend is insensitive — a 50x increase scores the same as flat (50.24). Filed as CR-001; NOT fixed here (would overwrite ML-lane work). Backend trend label derived independently so the §5.2 surface is correct
Next checkpoint: C. Local tests pass
Time remaining: ~6.5h

### [2026-10-08 18:10] [BACKEND-API] [BACKEND-API]
Status: DONE
Goal: Checkpoint C + D — backend contract tests, consent gate, role enforcement, ML integration, Alembic verified
Changes: Implemented backend/tests/{conftest,test_api_contract,test_auth}.py. conftest forces a throwaway SQLite DB + throwaway synthetic cache (assigns, never setdefault, so an exported DATABASE_URL cannot be clobbered) and a 12-SME/150-day fixture set for fast runs. Verified the Alembic initial migration on a fresh SQLite DB: `alembic upgrade head` creates smes/accounts/consents/transactions/alembic_version, then Base.metadata.create_all is a no-op and seeding + /readyz succeed. Fixed render.yaml (--app-dir backend, not backend/app; added healthCheckPath + PYTHON_VERSION + static rootDir). Added data/*.db to .gitignore
Files changed: backend/tests/conftest.py, backend/tests/test_api_contract.py, backend/tests/test_auth.py, backend/app/services/analytics.py (trend_label + always-4 insights), backend/app/seed.py (fixture archetypes rebuilt), render.yaml, .gitignore
Tests run: python -m pytest backend/tests -q; python -m pytest ml/tests -q
Test result: backend 59 passed in ~32s; ML 25 passed (untouched) — 84 green total
Decisions: Trend label (PRD §5.2) computed backend-side from a half-over-half mean-net comparison normalised by mean absolute net, so it does not inherit the CR-001 defect; direction is checked before volatility so a declining business reads "declining", not merely "volatile". Fixture archetypes rebuilt to synthesise the PRD §9 story around the generator's own per-SME mean inflow/outflow, so fixtures stay in the portfolio's scale. TestClient (httpx-backed, sync) used instead of AsyncClient for simpler fixtures — same transport. Simulation monotonicity asserted for both mean and min projected liquidity, plus a non-improving impact label
Blockers: CR-001 still open (ML lane). Consequence: the credit score cannot reach the "strong" band (>=75) because growth (20%) and repayment (20%) are pinned near 50 — Ade's Fashion Store lands at 71.13 "developing" rather than "strong"
Next checkpoint: E. Final smoke test complete
Time remaining: ~6h

### [2026-10-08 18:15] [BACKEND-API] [BACKEND-API]
Status: DONE
Goal: Checkpoint E — final smoke test + handoff
Changes: Ran the full P0 journey against the seeded 50-SME database (portfolio → sme → health → cashflow → forecast → credit → accounts → simulator) and confirmed the PRD §9 fixture stories: ADE_FASHION_001 healthy/growing/credit 71.13/forecast healthy; TOLA_PHARMACY_002 healthy/stable/credit 75.94 (strong); LAGOS_BISTRO_003 watch/volatile; KANO_ELECTRONICS_004 watch/moderate; MART_DECLINE_005 risk/declining/liquidity 0/forecast high_pressure. Consent states all four exercised (active/expired/revoked/not_connected). Loan simulator on ADE: 500k → manageable, 5m → manageable, with projected mean falling 58.5k → 53.9k → 44.5k as the repayment grows
Files changed: docs/PROCESS_LOG.md, docs/DECISIONS.md, backend/README.md, README.md
Tests run: python -m pytest backend/tests -q (59 passed); python -m pytest ml/tests -q (25 passed)
Test result: 84 passed, 0 failed
Decisions: Backend-API lane complete and self-contained. Seeding is idempotent (no-op when SMEs exist) and runs on startup, so a fresh Render deploy needs no manual step. Start command uses `alembic upgrade head; uvicorn ...` — the `;` keeps the API up if the migration step is ever skipped, since create_all is the safety net
Blockers: CR-001 (ML growth_trend) is the only open item affecting the demo narrative — one 4-line fix in ml/src/biznoria_ml/metrics.py would lift Ade's Fashion Store into the "strong" credit band
Next checkpoint: Team integration — FRONTEND-DASHBOARD consumes the contract; DEPLOY pushes to Render; ML owner actions CR-001
Time remaining: ~6h

### [2026-10-08 18:32] [BACKEND-API] [BACKEND-API]
Status: DONE
Goal: Close out two repo-hygiene defects found during final verification
Changes: (1) `.gitignore` had lost its `data/*.csv`, `data/*.parquet` and `data/synthetic/` rules — a 6.0 MB `data/biznoria.db` plus the generated CSV cache would have been committed. Restored those rules and added `data/*.db` / `data/*.sqlite3`. `git status data/` is now clean. (2) `pytest` could not collect `backend/tests` and `ml/tests` in one invocation: both are packages literally named `tests`, so the module names collided (ModuleNotFoundError: No module named 'tests.test_credit'). Added `backend/__init__.py` so the backend tests import as `backend.tests.*`, and a root `pytest.ini` with `testpaths = backend/tests ml/tests`
Files changed: .gitignore, pytest.ini (new), backend/__init__.py (new), docs/PROCESS_LOG.md
Tests run: python -m pytest -q   (both lanes, one invocation)
Test result: 84 passed (59 backend + 25 ML) in ~89s
Decisions: `backend/__init__.py` does not affect the running app — uvicorn uses `--app-dir backend`, so `app` is imported as a top-level package and the marker is never loaded. Verified: uvicorn boots, /healthz + /readyz green, 50 SMEs served
Blockers: None
Next checkpoint: Handoff complete for the BACKEND-API lane
Time remaining: ~5.5h
