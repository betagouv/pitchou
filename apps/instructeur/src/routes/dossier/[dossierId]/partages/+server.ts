import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { createTransaction } from "@pitchou/server/database.ts";
import {
  listDossierPartageCandidates,
  updateDossierPartages,
} from "@pitchou/server/database/dossier.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";

const updateProperties = new Set(["groupeIds"]);

function parseDossierId(raw: string): DossierId {
  const dossierId = Number(raw);
  if (!Number.isInteger(dossierId) || dossierId <= 0) {
    error(400, "dossierId invalide");
  }
  return dossierId as DossierId;
}

function parseGroupeIds(value: Record<string, unknown>): GroupeInstructeurs["id"][] {
  rejectUnknownProperties(value, updateProperties);
  if (
    !Array.isArray(value.groupeIds) ||
    value.groupeIds.some((id) => typeof id !== "string" || id.length === 0)
  ) {
    error(400, "La propriété 'groupeIds' doit être un tableau d'identifiants de groupes.");
  }
  if (new Set(value.groupeIds).size !== value.groupeIds.length) {
    error(400, "La propriété 'groupeIds' ne doit pas contenir de doublons.");
  }
  // Checked against the actual candidates before anything is written.
  return value.groupeIds as GroupeInstructeurs["id"][];
}

export const GET: RequestHandler = async ({ params, url }) => {
  const candidates = await listDossierPartageCandidates(
    requireCap(url),
    parseDossierId(params.dossierId!),
  );
  // Undefined when the cap does not instruct this dossier — including when it
  // only reaches it through a read-only share of its own.
  if (!candidates) {
    error(403, "La capability ne permet pas de partager ce dossier.");
  }
  return json(candidates);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = parseDossierId(params.dossierId!);
  const groupeIds = parseGroupeIds(await readJsonObject(request));
  const transaction = await createTransaction();

  try {
    const updated = await updateDossierPartages(cap, dossierId, groupeIds, transaction);
    if (!updated) {
      await transaction.rollback();
      error(403, "La capability ne permet pas de partager ce dossier.");
    }

    const actor = await getPersonneByDossierCap(cap);
    await logDossierActions(
      [
        ...updated.added.map((groupe) => ({
          dossier: dossierId,
          type: "dossier_partage",
          data: { groupe },
          author_personne: actor?.id ?? null,
        })),
        ...updated.removed.map((groupe) => ({
          dossier: dossierId,
          type: "dossier_partage_termine",
          data: { groupe },
          author_personne: actor?.id ?? null,
        })),
      ],
      transaction,
      // Sharing with several services at once is a single act for the
      // instructeur, whatever the number of historique entries it produces.
      {
        type: "partagerDossier",
        details: {
          dossierId,
          groupeCount: groupeIds.length,
          addedGroupes: updated.added,
          removedGroupes: updated.removed,
        },
      },
    );
    await transaction.commit();
    return new Response(null, { status: 204 });
  } catch (err) {
    if (!transaction.isCompleted()) await transaction.rollback();
    throw err;
  }
};
