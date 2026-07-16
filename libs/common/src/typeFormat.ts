import { parse as parseDate } from "date-fns";

export function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.valueOf());
}

export function isValidDateString(dateString: string): boolean {
  return !Number.isNaN(Date.parse(dateString));
}

export function recoverDate(d: string | Date | number | undefined): Date | undefined {
  if (typeof d === "number") {
    return undefined;
  }

  if (typeof d === "object") {
    if (isValidDate(d)) {
      return d;
    } else {
      return undefined;
    }
  }

  if (!d) return undefined;

  // typeof d === 'string'
  d = d.trim();

  let date = parseDate(d, "dd/MM/yyyy", new Date());

  if (!isValidDate(date)) {
    date = parseDate(d, "dd/MM/yy", new Date());
  }
  if (!isValidDate(date)) {
    date = parseDate(d, "yyyy", new Date());
  }

  // let's try the first chars in case there are several dates

  if (!isValidDate(date)) {
    date = parseDate(d.slice(0, "dd/MM/yyyy".length), "dd/MM/yyyy", new Date());
  }
  if (!isValidDate(date)) {
    date = parseDate(d.slice(0, "dd/MM/yy".length), "dd/MM/yy", new Date());
  }

  if (isValidDate(date)) {
    return date;
  } else {
    //console.warn(`Date non reconnue (${d})`)
    return undefined;
  }
}

export function normalizeCommuneName(communeName: string): string {
  return communeName
    .replace(/-|'/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase();
}

// https://stackoverflow.com/a/73974452
export const byteFormat = new Intl.NumberFormat(
  typeof document !== "undefined" ? document.documentElement.lang || "fr" : "fr",
  {
    notation: "compact",
    style: "unit",
    unit: "byte",
    unitDisplay: "narrow",
  },
);
