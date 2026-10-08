import { describe, expect, it } from "vitest";
import { can, type Capability } from "./authz";

const SME_VISIBLE: Capability[] = ["smeDetail", "health", "cashflow", "forecast", "credit", "accounts"];
const OFFICER_ONLY: Capability[] = ["portfolio", "smeList", "simulate"];

describe("role matrix (mirrors backend/app/auth.py)", () => {
  it("officer can do everything", () => {
    for (const cap of [...SME_VISIBLE, ...OFFICER_ONLY]) expect(can("officer", cap)).toBe(true);
  });

  it("SME sees review-only surface, never simulator/list/portfolio", () => {
    for (const cap of SME_VISIBLE) expect(can("sme", cap)).toBe(true);
    for (const cap of OFFICER_ONLY) expect(can("sme", cap)).toBe(false);
  });
});
