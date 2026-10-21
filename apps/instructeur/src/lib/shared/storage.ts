// Preserve the existing storage format: plain strings for secrets, JSON for filters.
export async function readStorage<T = unknown>(key: string): Promise<T | string | undefined> {
  const value = localStorage.getItem(key);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

export async function writeStorage(key: string, value: string | object): Promise<void> {
  localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}

export async function removeStorage(key: string): Promise<void> {
  localStorage.removeItem(key);
}
