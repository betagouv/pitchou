import type { FieldChange } from "@pitchou/types/notification.ts";
import { parseSpeciesImpactChangeField } from "@pitchou/common/especes/impactGroup.ts";

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
  const especesGroups = new Map<string | null, FieldChange>();
  for (const change of fields.values()) {
    const id = parseSpeciesImpactChangeField(change.field);
    if (id !== undefined) especesGroups.set(id, change);
  }
  const fieldDates = new Map(
    [...fields].filter(
      ([field]) =>
        !porteurDates.has(field) &&
        !field.startsWith("piece:") &&
        field !== "especes" &&
        parseSpeciesImpactChangeField(field) === undefined,
    ),
  );
  return { fieldDates, porteurDates, especes, especesGroups, piecesJointes };
}
