import type { Knex } from "knex";
import { createPersonne, type CreatedPersonne } from "./personne.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
  DEFAULT_NUMERO_DEMARCHE,
  type CreatedDossier,
} from "./dossier.ts";
import { attachCapToGroupe, createCapDossier } from "./cap.ts";

export { createPersonne } from "./personne.ts";
export type { CreatedPersonne } from "./personne.ts";
export {
  createDossier,
  createGroupeInstructeurs,
  attachDossierToGroupe,
  DEFAULT_NUMERO_DEMARCHE,
} from "./dossier.ts";
export { createCapDossier, attachCapToGroupe } from "./cap.ts";

export type InstructeurWithCap = CreatedPersonne & {
  cap: string;
  groupeId: string;
};

/**
 * Creates a personne + a cap_dossier owned by their code d'accès + a groupe
 * d'instructeurs + the cap → groupe link. No dossier attached.
 */
export async function createInstructeurWithCapToGroup(
  db: Knex,
  overrides: {
    email?: string;
    codeAcces?: string;
    nomGroupe?: string;
    demarcheNumber?: number;
  } = {},
): Promise<InstructeurWithCap> {
  const personne = await createPersonne(db, {
    email: overrides.email,
    access_code: overrides.codeAcces,
  });
  const groupe = await createGroupeInstructeurs(db, {
    name: overrides.nomGroupe,
    demarche_number: overrides.demarcheNumber,
  });
  const { cap } = await createCapDossier(db, personne.codeAcces);
  await attachCapToGroupe(db, cap, groupe.id);
  return { ...personne, cap, groupeId: groupe.id };
}

export type InstructeurWithDossier = InstructeurWithCap & {
  dossier: CreatedDossier;
};

/**
 * Like createInstructeurWithCapToGroup, plus a dossier attached to the same
 * groupe so the instructeur can list/access it via their cap.
 */
export async function createInstructeurWithDossier(
  db: Knex,
  overrides: {
    email?: string;
    codeAcces?: string;
    nomGroupe?: string;
    dossierNom?: string;
    demarcheNumber?: number;
  } = {},
): Promise<InstructeurWithDossier> {
  const demarcheNumber = overrides.demarcheNumber ?? DEFAULT_NUMERO_DEMARCHE;
  const base = await createInstructeurWithCapToGroup(db, {
    email: overrides.email,
    codeAcces: overrides.codeAcces,
    nomGroupe: overrides.nomGroupe,
    demarcheNumber,
  });
  const dossier = await createDossier(db, {
    name: overrides.dossierNom ?? "Dossier de test",
    demarche_number: demarcheNumber,
  });
  await attachDossierToGroupe(db, dossier.id, base.groupeId);
  return { ...base, dossier };
}
