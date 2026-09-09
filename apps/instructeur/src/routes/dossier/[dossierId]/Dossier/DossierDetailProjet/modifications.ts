import type { FieldChange } from "@pitchou/types/notification.ts";

export function nouvellesModifications(changes: FieldChange[]) {
  const fields = new Map(changes.map((change) => [change.field, change]));
  const porteurDates = new Map(
    [...fields].filter(
      ([field]) =>
        ["Entreprise", "Demandeur", "Mandataire", "Représentant de l'entreprise"].includes(field) ||
        /^(demandeur|mandataire|representant|entreprise)\./.test(field),
    ),
  );
  const piecesJointes = changes.filter(({ field }) => field.startsWith("piece:"));
  const especes = fields.get("especes");
  const fieldDates = new Map(
    [...fields].filter(
      ([field]) => !porteurDates.has(field) && !field.startsWith("piece:") && field !== "especes",
    ),
  );
  return { fieldDates, porteurDates, especes, piecesJointes };
}
