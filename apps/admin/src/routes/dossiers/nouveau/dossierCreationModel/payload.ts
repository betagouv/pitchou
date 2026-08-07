import type { AdminDossierCreationPayload } from "$lib/actions/adminDossiers.ts";
import { communeDepartmentCode } from "$lib/dossierLocation.ts";

import { buildCreationColumns } from "./payloadColumns.ts";
import type { DossierCreationModel } from "./state.ts";
import { activiteDetailKind, showsRequestContext } from "./visibility.ts";

const nullable = (value: string) => value.trim() || null;

export function buildCreationPayload(model: DossierCreationModel): AdminDossierCreationPayload {
  const contactEmail = nullable(model.contactEmail);
  const contactPhone = nullable(model.contactPhone);
  const isPhysical = model.demandeurType === "personne_physique";
  const lastName = isPhysical ? model.physicalLastName.trim() : model.representativeLastName.trim();
  const firstNames = isPhysical
    ? model.physicalFirstNames.trim()
    : model.representativeFirstNames.trim();
  const role = nullable(isPhysical ? model.physicalQualification : model.representativeRole);
  const manualAddress = [model.physicalStreet, model.physicalCity].filter(Boolean).join(", ");
  const physicalCountry =
    model.physicalCountry === "Autre pays" ? model.physicalOtherCountry : model.physicalCountry;
  const physicalAddress = model.physicalManualAddress
    ? nullable([manualAddress, physicalCountry].filter(Boolean).join(", "))
    : nullable(model.physicalAddress);
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
  const identity = {
    type: "demandeur" as const,
    last_name: lastName,
    first_names: firstNames,
    email: contactEmail,
    phone: contactPhone,
    role,
  };
  const identites = isPhysical ? [identity] : [{ ...identity, type: "representant" as const }];
  const requestContext = showsRequestContext(model.mainActivite)
    ? nullable(model.requestContext)
    : null;
  const detailKind = activiteDetailKind(model.mainActivite);
  const type =
    detailKind === "restauration" && model.activiteDetail === "Destruction de nids d'Hirondelles"
      ? "Hirondelle"
      : detailKind === "transport" && model.activiteDetail === "Destruction de nids de Cigognes"
        ? "Cigogne"
        : null;

  return {
    name: model.name.trim(),
    depot_date: model.depotDate,
    phase: model.phase,
    relations: {
      groupe_instructeurs: model.groupeInstructeurs,
      demandeur_type: isPhysical ? "personne_physique" : "personne_morale",
      demandeur_personne_physique: isPhysical
        ? {
            last_name: lastName,
            first_names: firstNames,
            email: contactEmail,
            address: physicalAddress,
            phone: contactPhone,
            role,
          }
        : null,
      demandeur_personne_morale: isPhysical
        ? null
        : {
            siret: model.legalSiret.replaceAll(" ", ""),
            legal_name: null,
            address: null,
            postal_code: null,
            department: null,
            region: null,
          },
      identites,
    } as AdminDossierCreationPayload["relations"],
    columns: {
      ...buildCreationColumns(model, type, requestContext),
      communes: model.locationScope === "communes" ? communes : [],
      departments,
      regions: model.locationScope === "regions" ? model.locationRegions : [],
      projet_map: model.projectMap,
    },
  };
}
