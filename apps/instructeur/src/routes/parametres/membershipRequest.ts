export async function changeMembership(groupId: string, method: "POST" | "DELETE", body: object) {
  const response = await fetch(`/parametres/groupes/${encodeURIComponent(groupId)}/membres`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.message ?? "La modification a échoué. Actualisez la page et réessayez.",
    );
  }
}
