import type { Knex } from "knex";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import { createPersonne, type CreatedPersonne } from "./personne.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
  DEFAULT_NUMERO_DEMARCHE,
  type CreatedDossier,
} from "./dossier.ts";
import { attachCapToGroupe, createCapDossier } from "./cap.ts";

import { createFichierS3, type CreatedFile } from "./fichier.ts";

export { createPersonne } from "./personne.ts";
export type { CreatedPersonne } from "./personne.ts";
export { createFichierS3 } from "./fichier.ts";
export type { CreatedFile } from "./fichier.ts";
export {
  createDossier,
  createGroupeInstructeurs,
  attachDossierToGroupe,
  shareDossierWithGroupe,
  DEFAULT_NUMERO_DEMARCHE,
} from "./dossier.ts";
export { createCapDossier, attachCapToGroupe, createCapEvenementMetrique } from "./cap.ts";
export { createDossierSearch } from "./dossierSearch.ts";

export type InstructeurWithCap = CreatedPersonne & {
  cap: string;
  groupeId: GroupeInstructeurs["id"];
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

/**
 * A file stored on S3, attached to a dossier as an expert's avis, plus a cap that
 * reaches that dossier. The download routes authorize on the cap and on how the
 * file hangs off its dossier, so a test that fetches a file needs all three.
 */
export async function createFichierAvisAccessible(
  db: Knex,
  s3: Parameters<typeof createFichierS3>[1],
  overrides: { name?: string; bytes?: Buffer; expert?: string } = {},
): Promise<{ fichier: CreatedFile; cap: string; dossier: CreatedDossier; url: string }> {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  const fichier = await createFichierS3(db, s3, { name: overrides.name, bytes: overrides.bytes });
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: overrides.expert ?? "CNPN",
    avis_fichier: fichier.id,
  });
  return { fichier, cap, dossier, url: `/avis-expert/fichier/${fichier.id}?cap=${cap}` };
}
