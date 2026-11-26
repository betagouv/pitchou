import { parseUicnFilter } from "@pitchou/common/especes/listeRouge.ts";
import { searchBdcStatut } from "@pitchou/server/bdcStatut.ts";
import { searchTaxref } from "@pitchou/server/taxref.ts";
import { apiProblem } from "./responses.ts";

const taxrefSortFields = new Map([
  ["scientific_name", "nomScientifique"],
  ["common_name", "nomVernaculaire"],
  ["cd_nom", "cdnom"],
  ["cd_ref", "cdref"],
]);
const bdcSortFields = new Map([
  ["cd_nom", "cdnom"],
  ["cd_ref", "cdref"],
  ["status_type", "typeStatut"],
]);
const commonParameters = ["q", "page", "sort", "order"];

function parseSearch(params: URLSearchParams, filters: string[], sortFields: Map<string, string>) {
  const allowed = new Set([...commonParameters, ...filters]);
  for (const name of params.keys()) if (!allowed.has(name)) return;
  const page = Number(params.get("page") ?? "1");
  const text = params.get("q") ?? "";
  const order = params.get("order") ?? "";
  const sortParameter = params.get("sort");
  const sort = sortParameter === null ? "" : sortFields.get(sortParameter);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    sort === undefined ||
    (order !== "" && order !== "asc" && order !== "desc")
  )
    return;
  return { text, page, sort, order };
}

export async function readTaxref(params: URLSearchParams) {
  const search = parseSearch(params, ["kingdom", "class"], taxrefSortFields);
  if (!search) return apiProblem(400, "Filtres de référentiel invalides");
  const { rows, ...page } = await searchTaxref({
    ...search,
    regne: params.get("kingdom") ?? "",
    classe: params.get("class") ?? "",
  });
  return {
    ...page,
    rows: rows.map(
      ({ lb_nom: scientificName, nom_vern: commonName, regne: kingdom, classe, ...row }) => ({
        ...row,
        scientific_name: scientificName,
        common_name: commonName,
        kingdom,
        class: classe,
      }),
    ),
  };
}

export async function readBdcStatuts(params: URLSearchParams) {
  const search = parseSearch(params, ["status", "iucn"], bdcSortFields);
  if (!search) return apiProblem(400, "Filtres de référentiel invalides");
  const category = params.get("iucn");
  const uicn = parseUicnFilter(category);
  if (category !== null && !uicn) return apiProblem(400, "Catégorie UICN invalide");
  const { rows, ...page } = await searchBdcStatut({
    ...search,
    statut: params.get("status") ?? "",
    uicn,
  });
  return {
    ...page,
    rows: rows.map(
      ({
        cd_type_statut: statusTypeCode,
        label_statut: statusLabel,
        cd_doc: documentCode,
        nom_scientifique: scientificName,
        nom_vernaculaire: commonName,
        statutListeRouge: redListStatus,
        ...row
      }) => ({
        ...row,
        status_type_code: statusTypeCode,
        status_label: statusLabel,
        document_code: documentCode,
        scientific_name: scientificName,
        common_name: commonName,
        red_list_status: redListStatus,
      }),
    ),
  };
}
