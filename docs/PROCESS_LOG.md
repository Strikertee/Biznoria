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
