import type { Knex } from "knex";
import { directDatabaseConnection } from "./database.ts";
import type {
  default as EspeceProtegeeModification,
  EspeceProtegeeModificationCdRef,
  EspeceProtegeeModificationInitializer,
} from "@pitchou/types/database/public/EspeceProtegeeModification.ts";

export function getEspecesProtegeesModifications(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeModification[]> {
  return databaseConnection("espece_protegee_modification").select("*");
}

export type EspeceProtegeeModificationAdmin = EspeceProtegeeModification & {
  reference_noms_scientifiques: string[] | null;
  reference_classification: string | null;
  reference_cd_type_statuts: string[] | null;
  reference_noms_vernaculaires: string[] | null;
};

export function listEspeceProtegeeModifications(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EspeceProtegeeModificationAdmin[]> {
  return databaseConnection("espece_protegee_modification as m")
    .leftJoin("espece_protegee_reference as r", "m.cd_ref", "r.cd_ref")
    .select(
      "m.*",
      databaseConnection.raw("r.noms_scientifiques as reference_noms_scientifiques"),
      databaseConnection.raw("r.classification as reference_classification"),
      databaseConnection.raw("r.cd_type_statuts as reference_cd_type_statuts"),
      databaseConnection.raw("r.noms_vernaculaires as reference_noms_vernaculaires"),
    )
    .orderBy("m.updated_at", "desc");
}

const VALID_CLASSIFICATIONS = new Set(["oiseau", "faune non-oiseau", "flore"]);
const VALID_STATUTS = new Set(["PN", "PR", "PD", "POM", "Espèce manquante"]);
const PATCH_PROPERTIES = new Set([
  "classification",
  "noms_scientifiques",
  "noms_vernaculaires",
  "cd_type_statuts",
  "espece_ministerielle",
  "espece_cnpn",
  "excluded",
]);

export type PatchModification = {
  classification?: string | null;
  noms_scientifiques?: string[] | null;
  noms_vernaculaires?: string[] | null;
  cd_type_statuts?: string[] | null;
  espece_ministerielle?: boolean | null;
  espece_cnpn?: boolean | null;
  excluded?: boolean;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function validatePatchModification(
  patch: unknown,
): { ok: true; value: PatchModification } | { ok: false; message: string } {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return { ok: false, message: "Le patch doit être un objet." };
  }
  const value = patch as Record<string, unknown>;
  const unknownProperty = Object.keys(value).find((property) => !PATCH_PROPERTIES.has(property));
  if (unknownProperty)
    return { ok: false, message: `Propriété non reconnue : '${unknownProperty}'.` };
  if (
    "classification" in value &&
    value.classification !== null &&
    (typeof value.classification !== "string" || !VALID_CLASSIFICATIONS.has(value.classification))
  ) {
    return {
      ok: false,
      message: `classification invalide : ${JSON.stringify(value.classification)}`,
    };
  }
  for (const field of ["noms_scientifiques", "noms_vernaculaires"] as const) {
    if (field in value && value[field] !== null && !isStringArray(value[field])) {
      return { ok: false, message: `${field} doit être un tableau de chaînes ou null.` };
    }
  }
  if (
    "cd_type_statuts" in value &&
    value.cd_type_statuts !== null &&
    (!isStringArray(value.cd_type_statuts) ||
      !value.cd_type_statuts.every((s) => VALID_STATUTS.has(s)))
  ) {
    return { ok: false, message: "cd_type_statuts contient une valeur invalide." };
  }
  for (const field of ["espece_ministerielle", "espece_cnpn"] as const) {
    if (field in value && value[field] !== null && typeof value[field] !== "boolean") {
      return { ok: false, message: `${field} doit être un booléen ou null.` };
    }
  }
  if ("excluded" in value && typeof value.excluded !== "boolean") {
    return { ok: false, message: "`excluded` doit être un booléen." };
  }
  return { ok: true, value: value as PatchModification };
}

export async function upsertEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  patch: Omit<EspeceProtegeeModificationInitializer, "cd_ref">,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification")
    .insert({ ...patch, cd_ref: cd_ref as EspeceProtegeeModificationCdRef })
    .onConflict("cd_ref")
    .merge({ ...patch, updated_at: databaseConnection.fn.now() });
}

export async function deleteEspeceProtegeeModification(
  cd_ref: EspeceProtegeeModificationCdRef | string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("espece_protegee_modification").where({ cd_ref }).delete();
}
