export const INCEPTION_DATE = new Date("2024-01-01T00:00:00+01:00");

export const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600 * 1000);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const shortcuts = [
  { label: "12 dernières heures", date: () => hoursAgo(12) },
  { label: "24 dernières heures", date: () => hoursAgo(24) },
  { label: "7 derniers jours", date: () => hoursAgo(7 * 24) },
  { label: "Depuis le lancement (1ᵉʳ janvier 2024)", date: () => INCEPTION_DATE },
];
