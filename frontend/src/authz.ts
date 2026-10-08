/** Frontend role gating — mirrors backend/app/auth.py + docs role matrix.
 *  Rendering convenience only: enforcement lives in the backend.
 */
export type Role = "sme" | "officer";

export type Capability =
  | "portfolio"
  | "smeList"
  | "smeDetail"
  | "health"
  | "cashflow"
  | "forecast"
  | "credit"
  | "accounts"
  | "simulate";

const SME_CAPS: Capability[] = ["smeDetail", "health", "cashflow", "forecast", "credit", "accounts"];

export function can(role: Role, cap: Capability): boolean {
  if (role === "officer") return true;
  if (role === "sme") return SME_CAPS.includes(cap);
  return false;
}
