import { buildCreationRelations } from "./creationRelations.ts";
import type { AdminDossierCreationPayload } from "#lib/actions/adminDossiers.ts";
import { communeDepartmentCode } from "#lib/dossierLocation.ts";

import { buildCreationColumns } from "./payloadColumns.ts";
import type { DossierCreationModel } from "./state.ts";
import { activiteDetailKind, showsRequestContext } from "./visibility.ts";

const nullable = (value: string) => value.trim() || null;

export function buildCreationPayload(model: DossierCreationModel): AdminDossierCreationPayload {
  const { departments, communes } = buildLocation(model);
  const requestContext = showsRequestContext(model.activiteCode)
    ? nullable(model.requestContext)
    : null;
  const detailKind = activiteDetailKind(model.activiteCode);
  const type =
    detailKind === "restauration" && model.activiteDetail === "Destruction de nids d'Hirondelles"
      ? "Hirondelle"
      : detailKind === "transport" && model.activiteDetail === "Destruction de nids de Cigognes"
        ? "Cigogne"
        : null;

  return {
    name: model.name.trim(),
    depot_date: model.depotDate || null,
    phase: model.phase,
    relations: buildCreationRelations(model),
    columns: {
      ...buildCreationColumns(model, type, requestContext),
      communes: model.locationScope === "communes" ? communes : [],
      departments,
      regions: model.locationScope === "regions" ? model.locationRegions : [],
      projet_map: model.projectMap,
    },
  };
}

function buildLocation(model: DossierCreationModel) {
  const communeDepartments = model.communes
    .map(communeDepartmentCode)
    .filter((value): value is string => !!value);
  const scopedDepartments =
    model.locationScope === "departements"
      ? model.locationDepartments
      : model.locationScope === "communes"
        ? communeDepartments
        : [];
  const departments = [...new Set(scopedDepartments)];
  const communes = model.communes.map(({ departmentCode: _, ...commune }) => commune);
  return { departments, communes };
}
