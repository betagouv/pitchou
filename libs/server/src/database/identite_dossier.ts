import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { logActionsDossier } from "./action_dossier.ts";

import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type {
  default as IdentiteDossier,
  IdentiteDossierInitializer,
} from "@pitchou/types/database/public/IdentiteDossier.ts";
import type { IdentiteDossierData } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import { identityPropertyLabels, identityTypeLabels } from "@pitchou/types/notification.ts";

/**
 * Diffs the incoming identities against the stored ones, producing pétitionnaire
 * historique actions. The worker marks the first synchronized snapshot as a
 * baseline; an identity added to an existing dossier is a genuine revision.
 */
async function actionsFromIdentitesChanges(
  identitesByDossierId: Map<DossierId, IdentiteDossierData[]>,
  databaseConnection: Knex.Transaction | Knex,
): Promise<ActionDossierInitializer[]> {
  const currentIdentites: IdentiteDossier[] = await databaseConnection("identite_dossier")
    .select("*")
    .whereIn("dossier", [...identitesByDossierId.keys()]);
  const currentByDossier = Map.groupBy(currentIdentites, (identite) => identite.dossier);

  const actions: ActionDossierInitializer[] = [];
  for (const [dossier, incoming] of identitesByDossierId) {
    const current = currentByDossier.get(dossier) ?? [];
    for (const [type, typeLabel] of Object.entries(identityTypeLabels)) {
      const before = current.find((identity) => identity.type === type);
      const after = incoming.find((identity) => identity.type === type);
      for (const property of Object.keys(
        identityPropertyLabels,
      ) as (keyof typeof identityPropertyLabels)[]) {
        const from = before?.[property] || null;
        const to = after?.[property] || null;
        if (from === to) continue;
        const label = `${typeLabel} : ${identityPropertyLabels[property]}`;
        actions.push({
          dossier,
          type: "champ_modifie",
          data: {
            field: label,
            label,
            notification_field: `${type}.${property}`,
            from,
            to,
            notification: true,
          },
          author_petitionnaire: true,
        });
      }
    }
  }
  return actions;
}

/**
 * Replace the identities (demandeur, mandataire, representant) of each dossier with the
 * ones freshly extracted from Démarche Numérique. An identity that disappeared in DN
 * (e.g. a mandataire removed) is removed here as well.
 *
 * Returns the dossiers whose identities actually changed, so the synchronization
 * can mark them unread for their followers.
 */
export async function syncIdentitesDossier(
  identitesByDossierId: Map<DossierId, IdentiteDossierData[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Set<DossierId>> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) => syncIdentitesDossier(identitesByDossierId, trx));
  const dossierIds = [...identitesByDossierId.keys()];

  if (dossierIds.length === 0) {
    return new Set();
  }

  // Diffed against the current rows before they are replaced, so the historique
  // records what the pétitionnaire changed.
  const actions = await actionsFromIdentitesChanges(identitesByDossierId, databaseConnection);
  await logActionsDossier(actions, databaseConnection);

  await databaseConnection("identite_dossier").whereIn("dossier", dossierIds).delete();

  const identites: IdentiteDossierInitializer[] = [...identitesByDossierId].flatMap(
    ([dossier, identitesDossier]) => identitesDossier.map((identite) => ({ ...identite, dossier })),
  );

  if (identites.length >= 1) {
    await databaseConnection("identite_dossier").insert(identites);
  }

  // One action per changed champ, so several can point at the same dossier.
  return new Set(actions.map(({ dossier }) => dossier));
}
