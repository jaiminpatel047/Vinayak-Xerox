// Transaction dates are business dates stored as 'YYYY-MM-DD' strings.
// Everything here works on local calendar parts and plain strings, never
// through UTC conversion, so '2026-09-15' can never turn into '2026-09-14'.

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface DateRange {
  from: string;
  to: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Builds 'YYYY-MM-DD' from a year and 1-based month and day. */
export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today's date in the user's local timezone, as 'YYYY-MM-DD'. */
export function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Checks whether a date ('YYYY-MM-DD') is in the future. */
export function isFutureDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return iso > todayIso();
}

export function currentYear(): number {
  return new Date().getFullYear();
}

/** 1-based current month. */
export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month = last day of this month (local time, no UTC).
  return new Date(year, month, 0).getDate();
}

/** month is 1-based. */
export function monthRange(year: number, month: number): DateRange {
  return {
    from: toIsoDate(year, month, 1),
    to: toIsoDate(year, month, daysInMonth(year, month)),
  };
}

export function yearRange(year: number): DateRange {
  return { from: toIsoDate(year, 1, 1), to: toIsoDate(year, 12, 31) };
}

export function todayRange(): DateRange {
  const today = todayIso();
  return { from: today, to: today };
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** '2026-09-15' -> '15 Sep 2026' */
export function formatDisplayDate(iso: string | null | undefined): string {
  const parts = iso ? parseIso(iso) : null;
  if (!parts) return '';
  return `${pad(parts.day)} ${MONTH_NAMES[parts.month - 1].slice(0, 3)} ${parts.year}`;
}

/** '2026-09-15' -> '15/09/26' */
export function formatShortDate(iso: string): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  return `${pad(parts.day)}/${pad(parts.month)}/${String(parts.year).slice(-2)}`;
}

/** (2026, 9) -> 'September 2026' */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Recent years for dropdowns, newest first. */
export function yearOptions(count = 6): number[] {
  const year = currentYear();
  return Array.from({ length: count }, (_, i) => year - i);
}
