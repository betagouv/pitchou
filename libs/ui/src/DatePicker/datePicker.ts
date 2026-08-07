import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const DATE_ISO_FORMAT = "yyyy-MM-dd";
export const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";
export const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function getCalendarDays(viewMonth: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });
}

export function isDateDisabled(day: Date, minDate?: Date, maxDate?: Date): boolean {
  return Boolean((minDate && isBefore(day, minDate)) || (maxDate && isAfter(day, maxDate)));
}

export function parseInputDate(input: string, minDate?: Date, maxDate?: Date): Date | undefined {
  const date = parse(input, DATE_DISPLAY_FORMAT, new Date());
  return isValid(date) &&
    format(date, DATE_DISPLAY_FORMAT) === input &&
    !isDateDisabled(date, minDate, maxDate)
    ? date
    : undefined;
}

export function formatInputDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
