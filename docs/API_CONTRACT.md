# API Contract (FROZEN after Hour 1 — change only for genuine defects)

Base URL: `{API_BASE}/api/v1`. All responses JSON. Errors: `{ "detail": str }`.

## Endpoints
| Method | Path | Query/Body | Response |
|---|---|---|---|
| GET | `/api/v1/portfolio/summary` | — | `PortfolioSummary` |
| GET | `/api/v1/smes` | — | `SME[]` |
| GET | `/api/v1/smes/{id}` | — | `SME` |
| GET | `/api/v1/smes/{id}/health` | — | `HealthMetrics` |
| GET | `/api/v1/smes/{id}/cashflow` | `?from=&to=` optional ISO dates | `CashflowSeries` |
| GET | `/api/v1/smes/{id}/forecast` | `?horizon=30\|60\|90` (default 90) | `Forecast` |
| GET | `/api/v1/smes/{id}/credit-readiness` | — | `CreditReadiness` |
| GET | `/api/v1/smes/{id}/accounts` | — | `Account[]` (consent metadata) |
| POST | `/api/v1/smes/{id}/loan-simulation` | `LoanSimRequest` | `LoanSimResult` |
| GET | `/healthz` | — | `{ "status": "ok" }` |
| GET | `/readyz` | — | `{ "ready": bool, "checks": {...} }` |

## Schemas (authoritative field names)
```json
// SME
{ "id": "sme_001", "name": "Acme Foods", "sector": "retail", "size_band": "small", "region": "lagos", "joined_on": "2024-01-15" }

// PortfolioSummary
{ "sme_count": 50, "total_inflow_30d": 1200000.0, "total_outflow_30d": 900000.0,
  "net_flow_30d": 300000.0, "median_health_score": 62.5, "at_risk_count": 7 }

// HealthMetrics
{ "sme_id": "sme_001", "stability": 70.0, "growth": 55.0, "liquidity": 64.0,
  "expense_ratio": 0.72, "revenue_consistency": 68.0, "repayment_score": 50.0,
  "updated_at": "2026-10-08T00:00:00Z" }

// CashflowSeries
{ "sme_id": "sme_001", "grain": "daily",
  "points": [{ "date": "2026-07-01", "inflow": 100.0, "outflow": 80.0, "net": 20.0 }] }

// Forecast
{ "sme_id": "sme_001", "horizon": 90, "history_len": 365, "model_used": "baseline|hgb",
  "mae_val": 123.4, "points": [{ "date": "2026-10-09", "yhat": 25.0 }] }

// CreditReadiness
{ "sme_id": "sme_001", "score": 64.5,
  "components": { "stability": 70.0, "revenue_consistency": 68.0, "growth": 55.0, "repayment": 50.0, "liquidity": 64.0 },
  "reasons": ["Stable cash flow over 90d.", "..."],
  "disclaimer": "Prototype decision support only — not Wema underwriting. Not an approval or decline.",
  "updated_at": "..." }

// Account
{ "id": "acc_1", "sme_id": "sme_001", "provider": "wema|external_mock", "label": "Wema Current ****1234",
  "consent_id": null, "consent_expires_at": null, "source": "internal|authorised_external" }

// LoanSimRequest / LoanSimResult
// Request:  { "amount": 500000.0, "annual_rate": 0.24, "term_months": 12 }
// Result:   { "sme_id": "...", "monthly_repayment": 47194.6,
//             "projected_min_liquidity": 12000.0, "projected_mean_liquidity": 45000.0,
//             "series": [{ "date": "...", "projected_net": 20.0 }],
//             "disclaimer": "Decision support only — not a credit decision." }
```

## Rules
- `horizon` must be one of 30/60/90; otherwise 422.
- Unknown `sme_id` → 404 with `{ "detail": "SME not found" }`.
- Scores are 0–100 floats. Money: Naira (NGN) floats, 2dp in UI.
- `source` is mandatory on account-scoped transaction data.
- Credit/loan responses MUST carry their disclaimer strings verbatim.
