import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { readDossierSourceFilter } from "@pitchou/types/dossierSource.ts";

/** Keep the URL defaults identical to the list controls. Unknown categorical values match nothing. */
export function readParams(params: URLSearchParams) {
  const departments = [...new Set(params.getAll("departement").filter(Boolean))];
  const selection = params.get("departements");
  const departmentSelection =
    selection === "all" || selection === "none"
      ? selection
      : departments.length > 0
        ? "custom"
        : selection === "custom"
          ? "none"
          : "all";
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));
  const dateField = params.get("dateField");
  const sort = params.get("sort");
  return {
    source: readDossierSourceFilter(params.get("source")),
    terms: [
      ...new Set(
        removeAccents(params.get("q") ?? "")
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter(Boolean),
      ),
    ],
    phase: params.getAll("phase"),
    activite: params.getAll("activite"),
    espece: params.getAll("espece"),
    action: params.getAll("action"),
    departments,
    departmentSelection,
    france: params.get("localisation") === "france",
    instructeur: params.getAll("instructeur"),
    nouveaute: params.get("nouveaute"),
    actionInstructeur: params.get("actionInstructeur") === "1",
    enjeu: params.get("enjeu") === "1",
    decision: removeAccents(params.get("decision")?.trim() ?? "").toLowerCase(),
    decisionAbsente: params.get("decisionAbsente") === "1",
    avisManquant: params.get("avisManquant") === "1",
    especesAbsente: params.get("especesAbsente") === "1",
    dateField: ["phaseStart", "lastModified", "nextDue"].includes(dateField ?? "")
      ? dateField!
      : "deposit",
    dateStart: params.get("from") ?? "",
    dateEnd: params.get("to") ?? "",
    timeZone: readTimeZone(params.get("timeZone")),
    sort: ["lastModified", "nextDueDate"].includes(sort ?? "") ? sort! : "depositDate",
    // Without an explicit sort, readDossiersQuery always uses the default descending order.
    order: params.has("sort") && params.get("order") === "asc" ? "asc" : "desc",
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    pageSize: [10, 25, 50, 100].includes(pageSize) ? pageSize : 10,
  };
}

function readTimeZone(value: string | null) {
  try {
    const zone = new Intl.DateTimeFormat("en", { timeZone: value ?? "UTC" }).resolvedOptions()
      .timeZone;
    return /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/u.test(zone) ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

export type ListParams = ReturnType<typeof readParams>;

/** PostgreSQL's NFD decomposition matches removeAccents without requiring an extension. */
export function normalizedSql(expression: string) {
  return `lower(regexp_replace(normalize(coalesce(${expression}, ''), NFD), '[\u0300-\u036F]', '', 'g'))`;
}
