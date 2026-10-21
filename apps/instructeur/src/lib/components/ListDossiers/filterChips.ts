import { PROCHAINE_ACTION_LABEL, DATE_FIELD_LABEL, type DossiersQuery } from "./query.ts";
import { appendAssignmentChips } from "./filterChips/assignment.ts";
import { appendStatusChips } from "./filterChips/status.ts";

/** A removable filter shown as a tag: its label and the query with that value removed */
export type FilterChip = {
  /** Stable key for the {#each} */
  key: string;
  label: string;
  /** Query with this single filter (value) removed and the page reset to the first one */
  next: DossiersQuery;
};

/** ISO date (yyyy-MM-dd) → dd/MM/yyyy for display */
function formatDateFr(iso: string): string {
  const [year, month, day] = iso.split("-");
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

function dateChipLabel(query: DossiersQuery): string {
  const fieldLabel = DATE_FIELD_LABEL[query.dateField];
  if (query.dateStart && query.dateEnd) {
    return `Date ${fieldLabel} : du ${formatDateFr(query.dateStart)} au ${formatDateFr(query.dateEnd)}`;
  }
  if (query.dateStart) return `Date ${fieldLabel} : depuis le ${formatDateFr(query.dateStart)}`;
  return `Date ${fieldLabel} : jusqu'au ${formatDateFr(query.dateEnd)}`;
}

/**
 * One removable tag per active filter (text search included). Clicking a tag applies its
 * `next` query, i.e. the same filters minus the removed value. Order follows the modal's.
 * `activiteLabelByCode` and `especeLabelByCD_REF` resolve codes to display names (filterOptions.ts).
 */
export function buildActiveFilterChips(
  query: DossiersQuery,
  activiteLabelByCode: ReadonlyMap<string, string> = new Map(),
  especeLabelByCD_REF: ReadonlyMap<string, string> = new Map(),
): FilterChip[] {
  const chips: FilterChip[] = [];
  // `next` is only ever read (serialized), so sharing the untouched arrays with `query` is safe.
  const withUpdates = (updates: Partial<DossiersQuery>): DossiersQuery => ({
    ...query,
    page: 1,
    ...updates,
  });

  if (query.text.trim()) {
    chips.push({ key: "text", label: query.text.trim(), next: withUpdates({ text: "" }) });
  }
  for (const phase of query.phase) {
    chips.push({
      key: `phase:${phase}`,
      label: phase,
      next: withUpdates({ phase: query.phase.filter((value) => value !== phase) }),
    });
  }
  for (const value of query.prochaineAction) {
    chips.push({
      key: `action:${value}`,
      label: `${PROCHAINE_ACTION_LABEL.get(value) ?? value} (en charge de la prochaine action)`,
      next: withUpdates({
        prochaineAction: query.prochaineAction.filter((action) => action !== value),
      }),
    });
  }
  for (const value of query.activite) {
    chips.push({
      key: `activite:${value}`,
      label: activiteLabelByCode.get(value) ?? value,
      next: withUpdates({ activite: query.activite.filter((activite) => activite !== value) }),
    });
  }
  appendAssignmentChips(chips, query, withUpdates);
  appendStatusChips(chips, query, withUpdates);
  for (const cdRef of query.espece) {
    chips.push({
      key: `espece:${cdRef}`,
      label: especeLabelByCD_REF.get(cdRef) ?? cdRef,
      next: withUpdates({ espece: query.espece.filter((value) => value !== cdRef) }),
    });
  }
  if (query.especesImpacteesAbsente) {
    chips.push({
      key: "especesAbsente",
      label: "Espèces impactées non-renseignées",
      next: withUpdates({ especesImpacteesAbsente: false }),
    });
  }
  if (query.dateStart || query.dateEnd) {
    chips.push({
      key: "date",
      label: dateChipLabel(query),
      next: withUpdates({ dateField: "deposit", dateStart: "", dateEnd: "" }),
    });
  }

  return chips;
}

/**
 * Number of active filters from the Filtrer panel (text search excluded). Multi-valued
 * filters count once per value, so this matches the number of removable tags shown.
 */
export function countActiveFilters(query: DossiersQuery): number {
  return (
    query.phase.length +
    query.activite.length +
    query.espece.length +
    query.prochaineAction.length +
    (query.localisation === "france" ? 1 : 0) +
    (query.departementSelection === "none"
      ? 1
      : query.departementSelection === "custom"
        ? query.departement.length
        : 0) +
    query.instructeur.length +
    (query.nouveaute ? 1 : 0) +
    (query.dateStart || query.dateEnd ? 1 : 0) +
    (query.actionInstructeur ? 1 : 0) +
    (query.enjeu ? 1 : 0) +
    (query.decisionText.trim() ? 1 : 0) +
    (query.decisionAbsente ? 1 : 0) +
    (query.avisExpertManquant ? 1 : 0) +
    (query.especesImpacteesAbsente ? 1 : 0)
  );
}
