import type { FilterChip } from "../filterChips.ts";
import type { DossiersQuery } from "../query.ts";

export function appendStatusChips(
  chips: FilterChip[],
  query: DossiersQuery,
  withUpdates: (updates: Partial<DossiersQuery>) => DossiersQuery,
) {
  if (query.nouveaute === "oui") {
    chips.push({
      key: "nouveaute",
      label: "Nouvelles modifications",
      next: withUpdates({ nouveaute: "" }),
    });
  } else if (query.nouveaute === "non") {
    chips.push({
      key: "nouveaute",
      label: "Sans nouvelle modification",
      next: withUpdates({ nouveaute: "" }),
    });
  }
  if (query.actionInstructeur) {
    chips.push({
      key: "actionInstructeur",
      label: "Dossiers où je dois agir",
      next: withUpdates({ actionInstructeur: false }),
    });
  }
  if (query.enjeu) {
    chips.push({ key: "enjeu", label: "À enjeu", next: withUpdates({ enjeu: false }) });
  }
  if (query.decisionText.trim()) {
    chips.push({
      key: "decision",
      label: `Décision : ${query.decisionText.trim()}`,
      next: withUpdates({ decisionText: "" }),
    });
  }
  if (query.decisionAbsente) {
    chips.push({
      key: "decisionAbsente",
      label: "Décision administrative non renseignée",
      next: withUpdates({ decisionAbsente: false }),
    });
  }
  if (query.avisExpertManquant) {
    chips.push({
      key: "avisManquant",
      label: "Avis CNPN/CSRPN non renseigné",
      next: withUpdates({ avisExpertManquant: false }),
    });
  }
}
