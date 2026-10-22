/** A price in whole cents: a non-negative integer. Floats, strings and negatives never reach billing. */
export function isPriceCents(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
