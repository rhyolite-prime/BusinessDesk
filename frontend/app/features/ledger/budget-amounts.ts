// Decimal-string contract: exact numeric(20,6), never binary floating-point arithmetic.
export function budgetMicros(value: string): bigint | null {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d{0,13})(\.\d{1,6})?$/.test(value)
  )
    return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, "0"));
}
export function budgetDecimal(micros: bigint): string {
  return `${micros / 1000000n}.${String(micros % 1000000n).padStart(6, "0")}`;
}
export function budgetTotal(amounts: string[]): string {
  let sum = 0n;
  for (const value of amounts) {
    const amount = budgetMicros(value);
    if (amount === null) return "Invalid";
    sum += amount;
  }
  return budgetDecimal(sum);
}
export function displayBudgetAmount(value: string): string {
  // Totals may exceed a single period's 14-digit integer limit; formatting is still exact.
  const [whole, fraction = ""] = value.split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction.replace(/0+$/, "") ? "." + fraction.replace(/0+$/, "") : ""}`;
}
export function allocateBudgetTotal(
  value: string,
  count: number,
): string[] | null {
  const total = budgetMicros(value);
  if (total === null || !Number.isInteger(count) || count < 1 || count > 60)
    return null;
  const divisor = BigInt(count),
    each = total / divisor,
    remainder = total % divisor;
  return Array.from({ length: count }, (_, i) =>
    budgetDecimal(each + (BigInt(i) < remainder ? 1n : 0n)),
  );
}
export function budgetPeriods(
  begin: string,
  end: string,
): { year: number; month: number }[] {
  const parse = (s: string) => {
    if (!/^\d{4}-\d{2}$/.test(s)) return -1;
    const [year, month] = s.split("-").map(Number);
    return year >= 1900 && year <= 2999 && month >= 1 && month <= 12
      ? year * 12 + month - 1
      : -1;
  };
  const a = parse(begin),
    b = parse(end);
  if (a < 0 || b < a || b - a >= 60) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => ({
    year: Math.floor((a + i) / 12),
    month: ((a + i) % 12) + 1,
  }));
}

export function percentBudgetAmount(
  value: string,
  percentage: string,
): string | null {
  const amount = budgetMicros(value),
    percent = budgetMicros(percentage);
  if (amount === null || percent === null) return null;
  // Round half up once, at the database's 6-decimal precision.
  const result = budgetDecimal((amount * percent + 50000000n) / 100000000n);
  return budgetMicros(result) === null ? null : result;
}
