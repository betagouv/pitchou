export function parseRecordIds(input: string): { recordIds: string[]; error: string | null } {
  const values = input
    .trim()
    .split(/[\s,;]+/u)
    .filter(Boolean);
  if (values.length === 0)
    return { recordIds: [], error: "Saisissez au moins un identifiant interne de demande." };
  if (values.some((value) => !/^[1-9]\d{0,9}$/u.test(value) || Number(value) > 2147483647))
    return {
      recordIds: [],
      error: "Utilisez les identifiants internes numériques des demandes Onagre.",
    };
  const recordIds = [...new Set(values)];
  if (recordIds.length > 10)
    return { recordIds: [], error: "Sélectionnez 10 demandes au maximum par aperçu." };
  return { recordIds, error: null };
}
