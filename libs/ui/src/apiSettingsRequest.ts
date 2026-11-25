export async function apiSettingsRequest(endpoint: string, method: string, body: object) {
  const response = await fetch(endpoint, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Action impossible. Réessayez.");
  }
  return response;
}
