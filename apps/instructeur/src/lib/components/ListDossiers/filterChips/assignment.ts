import type { FilterChip } from "../filterChips.ts";
import type { DossiersQuery } from "../query.ts";
import { WITHOUT_INSTRUCTEUR } from "../query.ts";
import { LOCALISATION_LABEL } from "../localisation.ts";
import { departementNameByCode } from "@pitchou/common/departements.ts";

export function appendAssignmentChips(
  chips: FilterChip[],
  query: DossiersQuery,
  withUpdates: (updates: Partial<DossiersQuery>) => DossiersQuery,
) {
  if (query.localisation === "france") {
    chips.push({
      key: "localisation",
      label: LOCALISATION_LABEL.france,
      next: withUpdates({ localisation: "assigned", departementSelection: "all", departement: [] }),
    });
  }
  if (query.departementSelection === "none") {
    chips.push({
      key: "departements:none",
      label: "Aucun département",
      next: withUpdates({ departementSelection: "all", departement: [] }),
    });
  }
  for (const code of query.departementSelection === "custom" ? query.departement : []) {
    const name = departementNameByCode.get(code);
    chips.push({
      key: `departement:${code}`,
      label: name ? `${code} — ${name}` : code,
      next: withUpdates({
        departement: query.departement.filter((value) => value !== code),
        departementSelection: query.departement.length === 1 ? "all" : "custom",
      }),
    });
  }
  for (const value of query.instructeur) {
    chips.push({
      key: `instructeur:${value}`,
      label: value === WITHOUT_INSTRUCTEUR ? "Sans instructeur·ice" : value,
      next: withUpdates({ instructeur: query.instructeur.filter((email) => email !== value) }),
    });
  }
}
