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

/** Champ labels of the historique, per identity type. */
const identiteTypeLabels: Record<string, string> = {
  demandeur: "Demandeur",
  mandataire: "Mandataire",
  representant: "Représentant de l'entreprise",
};

function identiteSnapshot(
  identites: (IdentiteDossierData | IdentiteDossier)[],
  type: string,
): string {
  const identite = identites.find((identite) => identite.type === type);
  if (!identite) return "";
  const { last_name, first_names, email, phone, role } = identite;
  return JSON.stringify([
    last_name ?? null,
    first_names ?? null,
    email ?? null,
    phone ?? null,
    role ?? null,
  ]);
}

/**
 * Diffs the incoming identities against the stored ones, producing pétitionnaire
 * historique actions. Dossiers without stored identities are being created: their
 * historique starts at the dépôt, so nothing is logged for them.
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
    const current = currentByDossier.get(dossier);
    if (!current?.length) continue;
    for (const [type, field] of Object.entries(identiteTypeLabels)) {
      if (identiteSnapshot(current, type) !== identiteSnapshot(incoming, type)) {
        actions.push({
          dossier,
          type: "champ_modifie",
          data: { field },
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
 */
export async function syncIdentitesDossier(
  identitesByDossierId: Map<DossierId, IdentiteDossierData[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossierIds = [...identitesByDossierId.keys()];

  if (dossierIds.length === 0) {
    return;
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
    return databaseConnection("identite_dossier").insert(identites);
  }
}
