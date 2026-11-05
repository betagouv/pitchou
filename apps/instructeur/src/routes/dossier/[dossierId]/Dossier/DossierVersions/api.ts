export async function fetchVersionData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error("Impossible de charger les demandes ou leurs états historiques.");
  return response.json();
}

export function versionDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "medium" }).format(
    new Date(value),
  );
}
