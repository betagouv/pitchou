import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import type { ActivityOption, ActivityWorksheetRow } from "@pitchou/types/onagreActivities.ts";
export const ACTIVITY_WORKBOOK_HASH =
  "19518931227c63fc6b6726f135344800562b2df9f9fc33518a9ea4ad70fc5063";
export const activityMapping = (mapping: Pick<OnagreMapping, "section" | "key">) =>
  mapping.section === "objet" && !mapping.key.startsWith("field:");
export const worksheetKey = (rowNumber: number) =>
  `worksheet:objet:${ACTIVITY_WORKBOOK_HASH.slice(0, 12)}:${rowNumber}`;
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/gu, "");
export function linkWorksheetRows(
  rows: { row_number: number; cells: string[] }[],
  mappings: OnagreMapping[],
): ActivityWorksheetRow[] {
  return rows
    .filter((row) => row.row_number > 1)
    .map((row) => {
      const [tracking = "", source = "", proposal = "", note = ""] = row.cells;
      const matching = mappings.filter((mapping) => {
        if (!mapping.key.startsWith("reference:objet:")) return false;
        const label = mapping.label.replace(/^\d+\s*·\s*/u, "");
        if (source && normalize(source) === normalize(label)) return true;
        // The worksheet splits energy types, while the dump has one generic object.
        return (
          normalize(label) === "productionenergierenouvelable" &&
          normalize(source).startsWith("productionenergierenouvelable") &&
          !!proposal &&
          normalize(proposal) === normalize(mapping.proposal)
        );
      });
      return {
        rowNumber: row.row_number,
        tracking,
        source,
        proposal,
        note,
        mappingKeys:
          matching.length > 0
            ? matching.map((mapping) => mapping.key)
            : [worksheetKey(row.row_number)],
      };
    });
}
export function suggestedActivity(mapping: OnagreMapping, activities: ActivityOption[]): string {
  if (mapping.activity_code !== null && mapping.activity_code !== undefined)
    return mapping.activity_code;
  if (mapping.status === "excluded") return "";
  const quoted = activities.filter((activity) => mapping.rule.includes(`« ${activity.code} »`));
  if (quoted.length === 1) return quoted[0].code;
  const labels = activities.filter(
    (activity) => normalize(activity.label) === normalize(mapping.proposal),
  );
  return labels.length === 1 ? labels[0].code : "";
}
