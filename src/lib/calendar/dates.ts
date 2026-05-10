// Date helpers for the month-grid calendar. All calculations happen on
// local-timezone Date objects but we serialise to YYYY-MM-DD strings when
// matching against database dates (which are stored as DATE, not timestamp).

export type IsoDate = string; // "YYYY-MM-DD"

const pad = (n: number) => n.toString().padStart(2, "0");

export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function parseMonthParam(monthParam: string | undefined): Date {
  // monthParam looks like "2026-05". Returns a Date at the 1st of that month.
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function toMonthParam(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Returns 6 weeks (42 days) covering the month, starting on Sunday.
// Days outside the month are included so the grid is always 6×7.
export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const startDayOfWeek = first.getDay(); // 0 = Sunday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export const DAY_OF_WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isValidIsoDate(s: string | undefined | null): s is IsoDate {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
