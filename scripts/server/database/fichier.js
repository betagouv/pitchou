/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {DossierDS88444} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {Knex} from 'knex' */

import { directDatabaseConnection } from "../database.js";

/**
 * Fonction qui créé une clef unique pour la valeur de son argument
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier
 *
 * @param {Partial<Fichier>} fichier
 * @returns {string}
 */
export function makeFichierHash(fichier) {
  return [fichier.nom, fichier.media_type, fichier.DS_checksum].join("-");
}

/**
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier
 *
 * @param {Partial<Fichier>[]} descriptionsFichier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export function trouverFichiersExistants(
  descriptionsFichier,
  databaseConnection = directDatabaseConnection,
) {
  return databaseConnection("fichier")
    .select(["id", "DS_checksum", "nom", "media_type"])
    .whereIn(
      ["DS_checksum", "nom", "media_type"],
      // @ts-ignore
      descriptionsFichier.map(({ DS_checksum, nom, media_type }) => [DS_checksum, nom, media_type]),
    );
}

/**
 *
 * @param {Partial<Fichier>} f
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>>}
 */
export function ajouterFichier(f, databaseConnection = directDatabaseConnection) {
  return databaseConnection("fichier")
    .insert(f)
    .returning(["id", "DS_checksum", "DS_createdAt", "nom", "media_type"])
    .then((files) => files[0]);
}

/**
 * @param {Fichier['id']} fichierId
 * @param {Knex.Transaction | Knex} [databaseConnection]
 */
export function getFichier(fichierId, databaseConnection = directDatabaseConnection) {
  return databaseConnection("fichier").select("*").where("id", fichierId).first();
}

/**
 * @param {Fichier['id']} id
 * @param {Knex.Transaction | Knex} [databaseConnection]
 */
export function supprimerFichier(id, databaseConnection = directDatabaseConnection) {
  return databaseConnection("fichier").delete().where({ id });
}

// Toutes les tables/colonnes qui peuvent référencer un fichier (cf. les FK vers `fichier` dans les migrations).
// Centralisé ici pour que `supprimerFichiersSansAutresRéférences` reste exhaustive.
const FICHIER_REFERENCES = [
  { table: "arête_dossier__fichier_pièces_jointes_pétitionnaire", column: "fichier" },
  { table: "dossier", column: "espèces_impactées" },
  { table: "décision_administrative", column: "fichier" },
  { table: "avis_expert", column: "saisine_fichier" },
  { table: "avis_expert", column: "avis_fichier" },
];

/**
 * Supprime du `fichier` uniquement les IDs qui ne sont plus référencés par aucune autre table.
 * Préserve les fichiers partagés entre plusieurs usages (un même contenu peut être à la fois
 * une PJ pétitionnaire, un fichier espèces impactées, un avis expert, etc.).
 *
 * @param {Fichier['id'][]} fichierIds
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Fichier['id'][]>} les IDs effectivement supprimés
 */
export async function supprimerFichiersSansAutresRéférences(
  fichierIds,
  databaseConnection = directDatabaseConnection,
) {
  if (fichierIds.length === 0) return [];

  const stillReferenced = new Set();
  for (const { table, column } of FICHIER_REFERENCES) {
    const rows = await databaseConnection(table).select(column).whereIn(column, fichierIds);
    for (const r of rows) {
      if (r[column] !== null) stillReferenced.add(r[column]);
    }
  }

  const àSupprimer = fichierIds.filter((id) => !stillReferenced.has(id));

  if (àSupprimer.length >= 1) {
    await databaseConnection("fichier").delete().whereIn("id", àSupprimer);
  }

  return àSupprimer;
}
