import { error, json } from "@sveltejs/kit";

import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { getDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { markDossiersUnreadForFollowers } from "@pitchou/server/database/notification.ts";

import { parseDossierId } from "$lib/server/dossierValidation";
import { simulatableChamps, simulationAllowed } from "$lib/server/simulation.ts";

import type { RequestHandler } from "./$types";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

/**
 * Replays what a Démarche Numérique synchronization would do to a dossier when the
 * pétitionnaire edits a champ, through the real code path: the same diff, the same
 * historique entries, the same unread badge. Useful to see what instructeurs will
 * be shown without waiting for a real modification.
 *
 * Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
 */
export const POST: RequestHandler = async ({ params, request }) => {
  if (!simulationAllowed()) error(404);

  const dossierId = parseDossierId(params.dossierId);
  const body = await request.json();
  const column = body?.champ;
  const value = body?.valeur;

  if (!simulatableChamps.some((champ) => champ.column === column)) {
    error(400, "Champ non simulable.");
  }
  if (typeof value !== "string") {
    error(400, "La valeur doit être une chaîne.");
  }

  const dossier = await directDatabaseConnection("dossier")
    .select(["id", "demarche_numerique_number", "source"])
    .where({ id: dossierId })
    .first();
  if (!dossier) error(404, "Dossier introuvable.");
  if (dossier.source !== "demarche_numerique" || !dossier.demarche_numerique_number) {
    error(400, "Seul un dossier venu de Démarches Numériques peut être synchronisé.");
  }

  const update = {
    dossier: {
      demarche_numerique_number: dossier.demarche_numerique_number,
      [column]: value.trim() || null,
    },
    evenement_phase_dossier: [],
    decision_administrative: [],
  } as unknown as DossierForUpdate;

  const changedDossiers = await dumpDossiers([], [update], directDatabaseConnection);
  // A real synchronization notifies the followers of what it found changed.
  await markDossiersUnreadForFollowers(
    new Map([...changedDossiers].map((id) => [id, new Date()])),
    directDatabaseConnection,
  );

  const actions = await getDossierActions(dossierId);
  return json({
    changed: changedDossiers.has(dossierId),
    actions: actions.slice(0, 10),
  });
};
