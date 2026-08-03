import type {
  AdminDossierDetail,
  AdminDossierIdentite,
  AdminDossierRelationsPayload,
  AdminIdentiteDossierType,
} from "$lib/actions/adminDossiers.ts";

export type DemandeurType = "personne_physique" | "personne_morale";
export type IdentityFormModel = {
  lastName: string;
  firstNames: string;
  email: string;
  phone: string;
  role: string;
};

type DossierAdminRelationsModel = ReturnType<typeof createDossierAdminRelationsModel>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const nullableText = (value: string) => value.trim() || null;

const emptyIdentity = (): IdentityFormModel => ({
  lastName: "",
  firstNames: "",
  email: "",
  phone: "",
  role: "",
});

function identity(value: AdminDossierIdentite | undefined): IdentityFormModel {
  if (!value) return emptyIdentity();
  return {
    lastName: text(value.last_name),
    firstNames: text(value.first_names),
    email: text(value.email),
    phone: text(value.phone),
    role: text(value.role),
  };
}

function findIdentity(detail: AdminDossierDetail, type: AdminIdentiteDossierType) {
  return Array.isArray(detail.identites)
    ? detail.identites.find((item) => item?.type === type)
    : undefined;
}

export function createDossierAdminRelationsModel(detail: AdminDossierDetail) {
  const personnePhysique = detail.demandeur_personne_physique;
  const personneMorale = detail.demandeur_personne_morale;
  const demandeurIdentity =
    findIdentity(detail, "demandeur") ??
    (personnePhysique
      ? {
          type: "demandeur" as const,
          last_name: personnePhysique.last_name,
          first_names: personnePhysique.first_names,
          email: personnePhysique.email,
          phone: null,
          role: null,
        }
      : undefined);
  const mandataire = findIdentity(detail, "mandataire");
  const representant = findIdentity(detail, "representant");
  const demandeurType: DemandeurType = personneMorale ? "personne_morale" : "personne_physique";

  return {
    groupeInstructeurs: detail.groupe?.id ?? "",
    demandeurType,
    hasDemandeurIdentity: !!demandeurIdentity,
    demandeurIdentity: identity(demandeurIdentity),
    personnePhysique: {
      address: text(personnePhysique?.address),
      phone: text(personnePhysique?.phone),
      role: text(personnePhysique?.role),
    },
    personneMorale: {
      siret: text(personneMorale?.siret),
      legalName: text(personneMorale?.legal_name),
      address: text(personneMorale?.address),
      postalCode: text(personneMorale?.postal_code),
      department: text(personneMorale?.department),
      region: text(personneMorale?.region),
    },
    hasMandataire: !!mandataire,
    mandataire: identity(mandataire),
    hasRepresentant: !!representant,
    representant: identity(representant),
  };
}

function buildIdentity(
  type: AdminIdentiteDossierType,
  value: IdentityFormModel,
): AdminDossierIdentite {
  return {
    type,
    last_name: nullableText(value.lastName),
    first_names: nullableText(value.firstNames),
    email: nullableText(value.email),
    phone: nullableText(value.phone),
    role: nullableText(value.role),
  };
}

export function buildDossierRelations(
  model: DossierAdminRelationsModel,
): AdminDossierRelationsPayload {
  const identites: AdminDossierIdentite[] = [];
  if (model.demandeurType === "personne_physique" || model.hasDemandeurIdentity) {
    identites.push(buildIdentity("demandeur", model.demandeurIdentity));
  }
  if (model.hasMandataire) identites.push(buildIdentity("mandataire", model.mandataire));
  if (model.demandeurType === "personne_morale" && model.hasRepresentant) {
    identites.push(buildIdentity("representant", model.representant));
  }

  const base = {
    groupe_instructeurs: model.groupeInstructeurs.trim(),
    identites,
  };
  if (model.demandeurType === "personne_physique") {
    return {
      ...base,
      demandeur_type: "personne_physique",
      demandeur_personne_physique: {
        last_name: model.demandeurIdentity.lastName.trim(),
        first_names: model.demandeurIdentity.firstNames.trim(),
        email: nullableText(model.demandeurIdentity.email),
        address: nullableText(model.personnePhysique.address),
        phone: nullableText(model.personnePhysique.phone),
        role: nullableText(model.personnePhysique.role),
      },
      demandeur_personne_morale: null,
    };
  }

  return {
    ...base,
    demandeur_type: "personne_morale",
    demandeur_personne_physique: null,
    demandeur_personne_morale: {
      siret: model.personneMorale.siret.trim(),
      legal_name: nullableText(model.personneMorale.legalName),
      address: nullableText(model.personneMorale.address),
      postal_code: nullableText(model.personneMorale.postalCode),
      department: nullableText(model.personneMorale.department),
      region: nullableText(model.personneMorale.region),
    },
  };
}
