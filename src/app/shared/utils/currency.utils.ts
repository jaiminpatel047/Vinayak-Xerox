const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 125000 -> '₹1,25,000' */
export function formatInr(amount: number | null | undefined): string {
  return inrFormatter.format(amount ?? 0);
}

/**
 * Adds money values without floating point drift (0.1 + 0.2 problem)
 * by summing whole paise and converting back to rupees.
 */
export function sumAmounts(amounts: readonly number[]): number {
  const paise = amounts.reduce((total, amount) => total + Math.round(Number(amount) * 100), 0);
  return paise / 100;
}

export function subtractAmounts(a: number, b: number): number {
  return (Math.round(a * 100) - Math.round(b * 100)) / 100;
}
