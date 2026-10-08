# Decisions & Change Requests

> PRD §22: any change that touches an API field, schema, formula, ML feature,
> scoring weight, enum, endpoint, deployment variable or demo flow must be
> recorded here before it is implemented. Append-only.

---

## CR-001 — `growth_trend` is insensitive and effectively constant

Requested by: BACKEND-API lane
Date/time: 2026-10-08 18:00
Reason: `ml/src/biznoria_ml/metrics.py::growth_trend` normalises the slope of the
30-day rolling mean by the **daily** standard deviation of net flow. The slope is
per-day, so for any realistic series the ratio is tiny and the component pins to
~50 regardless of the actual trend. This breaks two things the PRD requires:
the "business trend: growing / stable / declining" surface (§5.2) and the
growth-trend credit component, which carries **20%** of the frozen credit score
(§10.3).

Current contract: `growth_trend = clip(50 + 25 * slope / std(net), 0, 100)`

Reproduced (365 daily points, zero noise, inflow == net):

| Series shape | `growth_trend` |
|---|---|
| flat | 50.00 |
| grows 10x over the window | **50.24** |
| grows 50x over the window | **50.24** |
| grows 50x + 1% daily noise | 50.23 |

A 50x increase scores the same as a flat line. Because 20% (growth) + 20%
(repayment, which is neutral 50 without a repayment feed) are pinned, the credit
score is compressed and can never reach the "strong" band (≥75) even for a
textbook-healthy business.

Proposed change (ML lane — one function, ~4 lines):
```python
def growth_trend(daily: pd.DataFrame) -> float:
    net = daily["net"].to_numpy(dtype=float)
    if len(net) < 8:
        return 50.0
    smooth = pd.Series(net).rolling(window=min(30, len(net)), min_periods=1).mean().to_numpy()
    half = len(smooth) // 2
    scale = float(np.mean(np.abs(net))) + _EPS          # level, not daily noise
    delta = (float(smooth[half:].mean()) - float(smooth[:half].mean())) / scale
    return _clip100(50.0 + 100.0 * delta)                # ±50% swing saturates
```
This keeps the 0–100 bounds, stays monotonic in the trend, and preserves the
existing test `test_growing_series_trend_above_flat` (it passes by a wider
margin). No other metric, weight or schema changes.

Why P0 value justifies it: the growth component is 20% of the headline credit
score and drives the PRD §9 fixture story ("Growing revenue" vs "Declining
inflows"). With the defect in place the score cannot separate a growing business
from a shrinking one on that component.

Affected files/teams: `ml/src/biznoria_ml/metrics.py` (ML lane);
`ml/tests/test_metrics.py` (add a "10x growth scores materially above flat"
assertion). No backend or frontend change required — the backend consumes
`compute_health_metrics` unchanged.

Tests required: `pytest ml/tests -q` (25 tests) plus a new magnitude assertion.

Decision: **PROPOSED — not implemented.** Requires the ML-lane owner or team lead.
The BACKEND-API lane deliberately did not edit `ml/` (OpenCode rule 9: do not
overwrite unrelated teammate work).

**Interim mitigation (implemented, BACKEND-API lane):** the PRD §5.2 *business
trend label* is computed in `backend/app/services/analytics.py::trend_label`
from a half-over-half comparison of mean net flow, normalised by mean absolute
net flow. It does not depend on `growth_trend`, so the growing/stable/declining/
volatile surface is correct today. The credit score's 20% growth component
remains affected until CR-001 is applied.

---

## CR-002 — additive response fields for P0 surfaces (no frozen field changed)

Requested by: BACKEND-API lane
Date/time: 2026-10-08 18:05
Reason: `docs/API_CONTRACT.md` freezes a deliberately minimal schema per
endpoint, but the PRD's P0 functional requirements need more data to render:
portfolio Healthy/Watch/High-Pressure counts (§5.1), business trend + top
expense categories + insights (§5.2), institution/masked id/account type/consent
status per account (§5.3, §8.1), forecast status + key drivers (§5.4), component
weights + positive/negative drivers (§5.5), and before/after impact
classification for the simulator (§5.6).

Current contract: the frozen schemas in `docs/API_CONTRACT.md`.

Proposed change: **purely additive** fields only. Every frozen field keeps its
exact name, type and meaning; no field is renamed, retyped or removed.

| Schema | Added (additive only) |
|---|---|
| `PortfolioSummary` | `healthy_count`, `watch_count`, `high_pressure_count` |
| `HealthMetrics` | `health_score`, `status`, `trend`, `avg_monthly_inflow`, `avg_monthly_outflow`, `top_expense_categories`, `insights` |
| `CashflowSeries` | `data_sources` (Wema-only vs unified authorised) |
| `Forecast` | `status`, `projected_mean_net`, `projected_min_net`, `drivers` |
| `CreditReadiness` | `band`, `weights`, `positive_drivers`, `negative_drivers` |
| `Account` | `institution_name`, `account_type`, `masked_account`, `is_primary`, `consent_status` |
| `LoanSimResult` | `baseline_min_liquidity`, `baseline_mean_liquidity`, `impact`, `impact_label`; `series[].baseline_net` |

Why P0 value justifies it: without these the frontend cannot satisfy PRD §5.1–§5.6
at all (there is no other endpoint that carries consent status, trend, drivers or
the before/after comparison). Additive fields cannot break a client that reads the
frozen fields.

Affected files/teams: `backend/app/schemas.py` (BACKEND-API); frontend types may
extend optionally. No migration, no endpoint, no enum and no weight change.

Tests required: covered by `backend/tests/test_api_contract.py` (asserts every
frozen field is present with the frozen name).

Decision: **IMPLEMENTED by BACKEND-API lane.** Additive only; flagged here for
team visibility and frontend awareness per PRD §25.6.

---

## CR-003 — `GET /smes/{id}/accounts` shows expired/revoked accounts

Requested by: BACKEND-API lane
Date/time: 2026-10-08 18:06
Reason: two requirements pull in opposite directions. TEST_PLAN says "no consent
→ no external rows"; PRD §5.3 says the accounts view must display "consent
status, consent timestamp and expiry", and the consent lifecycle (PRD rule 2)
defines four states including `expired` and `revoked`. Hiding an expired account
entirely makes the lifecycle invisible to the judge.

Proposed change: distinguish the **account record** from the **data**:
- no consent record on file → the external account is **not returned at all**
  (TEST_PLAN satisfied);
- a consent record exists but is expired/revoked → the account **is** returned,
  carrying `consent_status: "expired" | "revoked"`, but **contributes zero
  transaction rows** to cash flow, health, forecast, credit and simulation
  (consent gate in `backend/app/services/cashflow.py::_load_rows`).

Current contract: `Account.source` is `internal | authorised_external`.

Why P0 value justifies it: it makes the consent lifecycle demonstrable on stage
without ever letting lapsed authorisation influence a single number.

Affected files/teams: `backend/app/routers/accounts.py`, `backend/app/services/consent.py`.
No schema or endpoint change.

Tests required: `test_no_consent_means_no_external_rows`,
`test_expired_or_revoked_consent_serves_no_external_data`.

Decision: **IMPLEMENTED by BACKEND-API lane.** Flagged for team awareness.
