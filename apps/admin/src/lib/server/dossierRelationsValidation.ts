import { error } from "@sveltejs/kit";

import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type {
  AdminDemandeurPersonneMoraleRelations,
  AdminDemandeurPersonnePhysiqueRelations,
  AdminDossierIdentite,
  AdminDossierRelations,
  AdminIdentiteDossierType,
} from "@pitchou/server/database/dossier_admin_relations.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

import { rejectUnknownProperties } from "./requestValidation";

const RELATION_PROPERTIES = new Set([
  "groupe_instructeurs",
  "demandeur_type",
  "demandeur_personne_physique",
  "demandeur_personne_morale",
  "identites",
]);
const PERSONNE_PHYSIQUE_PROPERTIES = new Set([
  "last_name",
  "first_names",
  "email",
  "address",
  "phone",
  "role",
]);
const PERSONNE_MORALE_PROPERTIES = new Set([
  "siret",
  "legal_name",
  "address",
  "postal_code",
  "department",
  "region",
]);
const IDENTITE_PROPERTIES = new Set(["type", "last_name", "first_names", "email", "phone", "role"]);
const IDENTITE_TYPES = new Set<AdminIdentiteDossierType>([
  "demandeur",
  "mandataire",
  "representant",
]);

function parseExactObject(
  raw: unknown,
  property: string,
  properties: ReadonlySet<string>,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, `Property '${property}' must be an object.`);
  }
  const value = raw as Record<string, unknown>;
  rejectUnknownProperties(value, properties);
  const missing = [...properties].find((key) => !(key in value));
  if (missing) error(400, `Property '${property}.${missing}' is required.`);
  return value;
}

function parseString(value: Record<string, unknown>, property: string): string {
  const raw = value[property];
  if (typeof raw !== "string") {
    error(400, `Property '${property}' must be a string.`);
  }
  return raw;
}

function parseNullableString(value: Record<string, unknown>, property: string): string | null {
  const raw = value[property];
  if (raw !== null && typeof raw !== "string") {
    error(400, `Property '${property}' must be a string or null.`);
  }
  return raw;
}

function parseEmail(value: Record<string, unknown>, property: string): string | null {
  const email = parseNullableString(value, property);
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error(400, `Property '${property}' must be a valid email address or null.`);
  }
  return email === null ? null : normalizeEmail(email);
}

function parsePersonnePhysique(raw: unknown): AdminDemandeurPersonnePhysiqueRelations {
  const value = parseExactObject(raw, "demandeur_personne_physique", PERSONNE_PHYSIQUE_PROPERTIES);
  return {
    last_name: parseString(value, "last_name"),
    first_names: parseString(value, "first_names"),
    email: parseEmail(value, "email"),
    address: parseNullableString(value, "address"),
    phone: parseNullableString(value, "phone"),
    role: parseNullableString(value, "role"),
  };
}

function parsePersonneMorale(raw: unknown): AdminDemandeurPersonneMoraleRelations {
  const value = parseExactObject(raw, "demandeur_personne_morale", PERSONNE_MORALE_PROPERTIES);
  const siret = parseString(value, "siret");
  if (!/^\d{14}$/.test(siret)) {
    error(400, `Property 'siret' must contain exactly 14 digits.`);
  }
  return {
    siret: siret as EntrepriseSiret,
    legal_name: parseNullableString(value, "legal_name"),
    address: parseNullableString(value, "address"),
    postal_code: parseNullableString(value, "postal_code"),
    department: parseNullableString(value, "department"),
    region: parseNullableString(value, "region"),
  };
}

function parseIdentites(raw: unknown): AdminDossierIdentite[] {
  if (!Array.isArray(raw)) error(400, `Property 'identites' must be an array.`);
  const identites = raw.map((rawIdentite, index) => {
    const value = parseExactObject(rawIdentite, `identites[${index}]`, IDENTITE_PROPERTIES);
    const type = parseString(value, "type") as AdminIdentiteDossierType;
    if (!IDENTITE_TYPES.has(type)) error(400, `Identity type '${type}' is invalid.`);
    return {
      type,
      last_name: parseNullableString(value, "last_name"),
      first_names: parseNullableString(value, "first_names"),
      email: parseEmail(value, "email"),
      phone: parseNullableString(value, "phone"),
      role: parseNullableString(value, "role"),
    };
  });
  const types = identites.map(({ type }) => type);
  if (new Set(types).size !== types.length) error(400, `Identity types must be unique.`);
  if (!types.includes("demandeur")) error(400, `A demandeur identity is required.`);
  const demandeur = identites.find(({ type }) => type === "demandeur")!;
  if (!demandeur.last_name?.trim()) error(400, `The demandeur last_name is required.`);
  return identites;
}

export function parseDossierRelations(raw: unknown): AdminDossierRelations {
  const value = parseExactObject(raw, "relations", RELATION_PROPERTIES);
  const groupe = parseString(value, "groupe_instructeurs");
  if (!groupe) error(400, `Property 'groupe_instructeurs' cannot be empty.`);
  const demandeurType = parseString(value, "demandeur_type");
  const identites = parseIdentites(value.identites);

  if (demandeurType === "personne_physique") {
    if (value.demandeur_personne_morale !== null) {
      error(400, `Property 'demandeur_personne_morale' must be null for a physical demandeur.`);
    }
    return {
      groupe_instructeurs: groupe as GroupeInstructeursId,
      demandeur_type: demandeurType,
      demandeur_personne_physique: parsePersonnePhysique(value.demandeur_personne_physique),
      demandeur_personne_morale: null,
      identites,
    };
  }
  if (demandeurType !== "personne_morale") {
    error(400, `Property 'demandeur_type' is invalid.`);
  }
  if (value.demandeur_personne_physique !== null) {
    error(400, `Property 'demandeur_personne_physique' must be null for a legal demandeur.`);
  }
  return {
    groupe_instructeurs: groupe as GroupeInstructeursId,
    demandeur_type: demandeurType,
    demandeur_personne_physique: null,
    demandeur_personne_morale: parsePersonneMorale(value.demandeur_personne_morale),
    identites,
  };
}
