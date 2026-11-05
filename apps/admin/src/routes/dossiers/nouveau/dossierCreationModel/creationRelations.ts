import type { AdminDossierRelationsPayload } from "#lib/actions/adminDossiers.ts";
import { organisationPayload } from "../../organisation.ts";
import type { DossierCreationModel } from "./state.ts";

const nullable = (value: string) => value.trim() || null;

export function buildCreationRelations(model: DossierCreationModel): AdminDossierRelationsPayload {
  const isPhysical = model.demandeurType === "personne_physique";
  const lastName = (isPhysical ? model.physicalLastName : model.personneContactLastName).trim();
  const firstNames = (
    isPhysical ? model.physicalFirstNames : model.personneContactFirstNames
  ).trim();
  const email = nullable(model.contactEmail);
  const phone = nullable(model.contactPhone);
  const role = nullable(isPhysical ? model.physicalQualification : model.personneContactRole);
  const identity = {
    type: isPhysical ? ("demandeur" as const) : ("representant" as const),
    last_name: lastName,
    first_names: firstNames,
    email,
    phone,
    role,
  };
  if (model.demandeurType === "organisation") {
    return {
      demandeur_type: "organisation",
      demandeur_organisation: organisationPayload(model.organisation),
      demandeur_personne_physique: null,
      demandeur_personne_morale: null,
      identites: lastName || firstNames || email || phone || role ? [identity] : [],
    };
  }
  if (isPhysical) {
    return {
      demandeur_type: "personne_physique",
      demandeur_personne_physique: {
        last_name: lastName,
        first_names: firstNames,
        email,
        address: physicalAddress(model),
        phone,
        role,
      },
      demandeur_personne_morale: null,
      identites: [identity],
    };
  }
  return {
    demandeur_type: "personne_morale",
    demandeur_personne_physique: null,
    demandeur_personne_morale: {
      siret: model.legalSiret.replaceAll(" ", ""),
      legal_name: null,
      address: null,
      postal_code: null,
      department: null,
      region: null,
    },
    identites: [identity],
  };
}

function physicalAddress(model: DossierCreationModel): string | null {
  if (!model.physicalManualAddress) return nullable(model.physicalAddress);
  const street = [model.physicalStreet, model.physicalCity].filter(Boolean).join(", ");
  const country =
    model.physicalCountry === "Autre pays" ? model.physicalOtherCountry : model.physicalCountry;
  return nullable([street, country].filter(Boolean).join(", "));
}
