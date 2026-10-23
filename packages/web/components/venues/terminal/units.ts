export type TerminalUnit = "usdc" | "credits";

export const PRESET_AMOUNTS: Record<TerminalUnit, number[]> = {
  usdc: [1, 5, 10, 20],
  credits: [10, 20, 50, 100],
};

/** "$5" for USDC, "50 CR" for venue credits. */
export function formatTerminalAmount(amount: number, unit: TerminalUnit) {
  const value = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return unit === "usdc" ? `$${value}` : `${value} CR`;
}
