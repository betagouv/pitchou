import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject } from "$lib/server/requestValidation";
import { createTransaction } from "@pitchou/server/database.ts";
import { getDossierInstructionState, updateDossier } from "@pitchou/server/database/dossier.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import { getDossierReviewSnapshot } from "@pitchou/server/database/notification/snapshot.ts";
import { actionsFromDossierUpdate } from "./updateActions.ts";
import { parseDossierId, parseDossierUpdate } from "./updatePayload.ts";

// 23505 = unique_violation in PostgreSQL.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = parseDossierId(params.dossierId!);

  const dossier = await getDossierReviewSnapshot(
    dossierId,
    cap,
    url.searchParams.get("lecture") === "1",
  );
  if (!dossier) {
    error(403, `Aucun dossier trouvé avec id '${dossierId}'`);
  }

  return json(dossier);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(parseDossierId(params.dossierId!), cap);

  const capPersonne = await getPersonneByDossierCap(cap);
  if (!capPersonne) {
    error(403, "Personne associée à la cap introuvable");
  }

  const dossierUpdate = parseDossierUpdate(await readJsonObject(request), dossierId);
  const transaction = await createTransaction();
  try {
    // Read before writing: the historique labels the update against the state
    // it replaces.
    const before = await getDossierInstructionState(dossierId, transaction);
    const updated = await updateDossier(dossierId, dossierUpdate, capPersonne.id, transaction);
    await logDossierActions(
      actionsFromDossierUpdate(dossierUpdate, dossierId, capPersonne.id, before),
      transaction,
    );
    await transaction.commit();
    return json(updated);
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    // Re-submitting an identical phase event hits the (dossier, phase, timestamp)
    // unique constraint. That is an expected conflict (double submit / replayed
    // sync), not a server bug, so surface it as a handled error: the whole update
    // is still rolled back above, but SvelteKit no longer logs/reports it as an
    // unexpected crash.
    if (isUniqueViolation(err)) {
      error(500, "Un évènement de phase identique existe déjà pour ce dossier.");
    }
    throw err;
  }
};
