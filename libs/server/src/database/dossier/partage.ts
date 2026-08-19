import type { Knex } from "knex";

import { directDatabaseConnection } from "../../database.ts";

import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { DossierPartageCandidate } from "@pitchou/types/capabilities.ts";

/**
 * The groupe instructing the dossier, if this cap belongs to it. Sharing is the
 * instructing service's call, so a cap that only reaches the dossier through a
 * read-only share gets nothing.
 */
async function owningGroupeForCap(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<GroupeInstructeurs["id"] | undefined> {
  const row = await databaseConnection("edge_groupe_instructeurs__dossier")
    .select("edge_groupe_instructeurs__dossier.groupe_instructeurs as id")
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .where({
      "edge_groupe_instructeurs__dossier.dossier": dossierId,
      "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap,
    })
    .first();
  return row?.id;
}

/**
 * Every service the dossier could be shared with — the other groupes of its
 * démarche — and whether it already is. Undefined when the cap does not instruct
 * the dossier.
 */
export async function listDossierPartageCandidates(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierPartageCandidate[] | undefined> {
  const owningGroupe = await owningGroupeForCap(cap, dossierId, databaseConnection);
  if (!owningGroupe) return undefined;

  const dossier = await databaseConnection("dossier")
    .select("demarche_number")
    .where({ id: dossierId })
    .first();

  const shared = new Set<GroupeInstructeurs["id"]>(
    await databaseConnection("edge_groupe_instructeurs__dossier_lecture")
      .select("groupe_instructeurs")
      .where({ dossier: dossierId })
      .then((rows) => rows.map(({ groupe_instructeurs }) => groupe_instructeurs)),
  );

  const groupes = await databaseConnection("groupe_instructeurs")
    .select(["id", "name"])
    .where({ demarche_number: dossier?.demarche_number })
    // A service does not share a dossier with itself.
    .andWhereNot({ id: owningGroupe })
    .orderBy("name");

  return groupes.map(({ id, name }) => ({ id, name, sharesDossier: shared.has(id) }));
}

/**
 * Replaces the set of groupes the dossier is shared with in read-only mode.
 * Returns the names of what changed, for the historique, or false when the cap
 * does not instruct the dossier.
 */
export async function updateDossierPartages(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  groupeIds: GroupeInstructeurs["id"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ added: string[]; removed: string[] } | false> {
  const candidates = await listDossierPartageCandidates(cap, dossierId, databaseConnection);
  if (!candidates) return false;

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  // Sharing with the instructing groupe, or with a groupe of another démarche,
  // is not a candidate — refuse rather than silently ignore it.
  if (groupeIds.some((id) => !candidateById.has(id))) return false;

  const wanted = new Set(groupeIds);
  const added = candidates.filter(({ id, sharesDossier }) => wanted.has(id) && !sharesDossier);
  const removed = candidates.filter(({ id, sharesDossier }) => !wanted.has(id) && sharesDossier);

  if (removed.length) {
    await databaseConnection("edge_groupe_instructeurs__dossier_lecture")
      .where({ dossier: dossierId })
      .whereIn(
        "groupe_instructeurs",
        removed.map(({ id }) => id),
      )
      .delete();
  }
  if (added.length) {
    await databaseConnection("edge_groupe_instructeurs__dossier_lecture")
      .insert(added.map(({ id }) => ({ dossier: dossierId, groupe_instructeurs: id })))
      .onConflict(["dossier", "groupe_instructeurs"])
      .ignore();
  }

  return { added: added.map(({ name }) => name), removed: removed.map(({ name }) => name) };
}
