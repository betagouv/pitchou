/** Validate a calendar day without accepting Date.parse's overflow into the next month. */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseCalendarDate(value: string): Date {
  const date = new Date(0);
  const [year, month, day] = value.split("-").map(Number);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function calendarDateLabel(value: Date): string {
  return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

/** SQL DATE values are local midnight. Serialize their day without a timezone conversion. */
export function withCalendarDateJSON(value: Date | null): Date | null {
  if (value) Object.defineProperty(value, "toJSON", { value: () => calendarDateLabel(value) });
  return value;
}
