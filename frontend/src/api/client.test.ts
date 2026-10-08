import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE, api } from "./client";

const ok = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

describe("frozen API paths (docs/API_CONTRACT.md)", () => {
  const seen: string[] = [];
  beforeEach(() => {
    seen.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        seen.push(`${init?.method ?? "GET"} ${url}`);
        return ok({});
      }),
    );
  });

  it("calls every P0 route with the exact frozen path", async () => {
    await api.portfolio();
    await api.smes();
    await api.sme("sme_001");
    await api.health("sme_001");
    await api.cashflow("sme_001");
    await api.forecast("sme_001", 30);
    await api.forecast("sme_001", 60);
    await api.forecast("sme_001", 90);
    await api.credit("sme_001");
    await api.accounts("sme_001");
    await api.simulate("sme_001", { amount: 1, annual_rate: 0.24, term_months: 12 });

    const B = API_BASE;
    expect(seen).toEqual([
      `GET ${B}/api/v1/portfolio/summary`,
      `GET ${B}/api/v1/smes`,
      `GET ${B}/api/v1/smes/sme_001`,
      `GET ${B}/api/v1/smes/sme_001/health`,
      `GET ${B}/api/v1/smes/sme_001/cashflow`,
      `GET ${B}/api/v1/smes/sme_001/forecast?horizon=30`,
      `GET ${B}/api/v1/smes/sme_001/forecast?horizon=60`,
      `GET ${B}/api/v1/smes/sme_001/forecast?horizon=90`,
      `GET ${B}/api/v1/smes/sme_001/credit-readiness`,
      `GET ${B}/api/v1/smes/sme_001/accounts`,
      `POST ${B}/api/v1/smes/sme_001/loan-simulation`,
    ]);
  });

  it("sends the simulation body as JSON", async () => {
    let body: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        body = JSON.parse(init?.body as string);
        return ok({});
      }),
    );
    await api.simulate("sme_002", { amount: 500000, annual_rate: 0.24, term_months: 12 });
    expect(body).toEqual({ amount: 500000, annual_rate: 0.24, term_months: 12 });
  });

  it("throws ApiError with the status on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fail(404)));
    await expect(api.sme("nope")).rejects.toMatchObject({ status: 404 });
  });
});
