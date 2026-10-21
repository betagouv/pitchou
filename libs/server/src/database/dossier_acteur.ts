import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { logActionsDossier } from "./action_dossier.ts";
import { savePorteursDeProjet } from "./porteur_de_projet.ts";
import { actionsFromActeursChanges, type ActeurValues } from "./dossier_acteur/history.ts";

import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type {
  default as PersonnePhysique,
  PersonnePhysiqueId,
} from "@pitchou/types/database/public/PersonnePhysique.ts";
import type { DossierActeurData } from "@pitchou/types/dossierActeur.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

const personneColumns = ["first_names", "last_name", "email", "address", "phone", "role"] as const;

type Personne = Omit<PersonnePhysique, "id">;
type CurrentActeur = {
  dossier: DossierId;
  involvement: string;
  personne_physique: PersonnePhysiqueId;
} & Personne;

function currentActeurs(dossierIds: DossierId[], databaseConnection: Knex.Transaction | Knex) {
  return databaseConnection("dossier_acteur")
    .join("personne_physique", "personne_physique.id", "dossier_acteur.personne_physique")
    .select<CurrentActeur[]>(
      "dossier_acteur.dossier",
      "dossier_acteur.involvement",
      "dossier_acteur.personne_physique",
      ...personneColumns.map((column) => `personne_physique.${column}`),
    )
    .whereIn("dossier_acteur.dossier", dossierIds);
}

function porteursPersonnePhysique(
  dossierIds: DossierId[],
  databaseConnection: Knex.Transaction | Knex,
) {
  return databaseConnection("dossier")
    .join("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .join("personne_physique", "personne_physique.id", "porteur_de_projet.personne_physique")
    .select<({ dossier: DossierId; id: PersonnePhysiqueId } & Personne)[]>(
      "dossier.id as dossier",
      "personne_physique.id",
      ...personneColumns.map((column) => `personne_physique.${column}`),
    )
    .whereIn("dossier.id", dossierIds);
}

const rowKey = ({
  involvement,
  personne_physique,
}: Pick<CurrentActeur, "involvement" | "personne_physique">) =>
  `${involvement}:${personne_physique}`;

type SavedActeur = ActeurValues & { personne_physique: PersonnePhysiqueId };

/** Updates the existing personne_physique in place when a value changed, otherwise creates one. */
async function savePersonne(
  personne: Partial<Personne>,
  existing: CurrentActeur | undefined,
  databaseConnection: Knex.Transaction | Knex,
): Promise<PersonnePhysiqueId> {
  if (!existing) {
    const [{ id }] = await databaseConnection("personne_physique").insert(personne).returning("id");
    return id;
  }
  if (personneColumns.some((column) => (existing[column] ?? null) !== (personne[column] ?? null))) {
    await databaseConnection("personne_physique")
      .where({ id: existing.personne_physique })
      .update(personne);
  }
  return existing.personne_physique;
}

/** Saves the personnes physiques of a dossier, then replaces its rows when they changed. */
async function saveDossierActeurs(
  dossier: DossierId,
  acteurs: DossierActeurData[],
  current: CurrentActeur[],
  porteur: ({ id: PersonnePhysiqueId } & Personne) | undefined,
  databaseConnection: Knex.Transaction | Knex,
): Promise<SavedActeur[]> {
  const used = new Set<PersonnePhysiqueId>();
  const after: SavedActeur[] = [];
  for (const acteur of acteurs) {
    let saved: { id: PersonnePhysiqueId; personne: Partial<Personne> } | undefined;
    if ("porteur" in acteur) {
      saved = porteur && { id: porteur.id, personne: porteur };
    } else {
      const existing = current.find(
        (row) =>
          row.involvement === acteur.involvements[0] &&
          row.personne_physique !== porteur?.id &&
          !used.has(row.personne_physique),
      );
      const id = await savePersonne(acteur.personne, existing, databaseConnection);
      saved = { id, personne: acteur.personne };
    }
    if (!saved) continue;
    used.add(saved.id);
    for (const involvement of acteur.involvements) {
      after.push({ involvement, personne_physique: saved.id, personne: saved.personne });
    }
  }

  if (after.map(rowKey).sort().join() !== current.map(rowKey).sort().join()) {
    await databaseConnection("dossier_acteur").where({ dossier }).delete();
    if (after.length > 0) {
      await databaseConnection("dossier_acteur").insert(
        after.map(({ involvement, personne_physique }) => ({
          dossier,
          involvement,
          personne_physique,
        })),
      );
    }
  }
  return after;
}

/**
 * Stores the porteur de projet and the acteurs of each dossier (Démarche Numérique
 * synchronization or admin). The acteurs are read before the porteur, which is updated
 * in place, so that its changes reach the historique.
 *
 * The personne_physique of an acteur is found by its first involvement and updated in
 * place, otherwise created; the one of the porteur is only changed by the porteur. An
 * involvement that disappeared loses its dossier_acteur rows, its personne_physique is kept.
 *
 * Returns the dossiers whose acteurs changed, so the synchronization can mark them unread;
 * the first acteurs of a dossier are a baseline, not a change. Without `historique` (admin
 * edits, which are not the pétitionnaire's), no action is logged.
 */
export async function savePorteursDeProjetAndActeurs(
  porteurByDossierId: Map<DossierId, PorteurDeProjetInitializer>,
  acteursByDossierId: Map<DossierId, DossierActeurData[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
  { historique = true }: { historique?: boolean } = {},
): Promise<Set<DossierId>> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      savePorteursDeProjetAndActeurs(porteurByDossierId, acteursByDossierId, trx, { historique }),
    );
  const dossierIds = [...acteursByDossierId.keys()];
  const currentByDossier = Map.groupBy(
    await currentActeurs(dossierIds, databaseConnection),
    ({ dossier }) => dossier,
  );
  await savePorteursDeProjet(porteurByDossierId, databaseConnection);
  const porteurByDossier = new Map(
    (await porteursPersonnePhysique(dossierIds, databaseConnection)).map((porteur) => [
      porteur.dossier,
      porteur,
    ]),
  );

  const actions: ActionDossierInitializer[] = [];
  for (const [dossier, acteurs] of acteursByDossierId) {
    const current = currentByDossier.get(dossier) ?? [];
    const porteur = porteurByDossier.get(dossier);
    const after = await saveDossierActeurs(dossier, acteurs, current, porteur, databaseConnection);
    const before = current.map((row) => ({ involvement: row.involvement, personne: row }));
    // A dossier without acteurs yet is filled for the first time (e.g. resync after the migration).
    actions.push(...actionsFromActeursChanges(dossier, before, after, current.length === 0));
  }
  if (!historique) return new Set();
  await logActionsDossier(actions, databaseConnection);
  return new Set(
    actions
      .filter(({ data }) => (data as { notification?: boolean }).notification)
      .map(({ dossier }) => dossier),
  );
}
