import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { createTransaction } from "@pitchou/server/database.ts";
import {
  listDossierFollowerCandidatesFromCap,
  updateDossierFollowersFromCap,
} from "@pitchou/server/database/relation_suivi.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const updateProperties = new Set(["personneEmails"]);

function parseDossierId(raw: string): DossierId {
  const dossierId = Number(raw);
  if (!Number.isInteger(dossierId) || dossierId <= 0) {
    error(400, "dossierId invalide");
  }
  return dossierId as DossierId;
}

function parsePersonneEmails(value: Record<string, unknown>): string[] {
  rejectUnknownProperties(value, updateProperties);
  if (
    !Array.isArray(value.personneEmails) ||
    value.personneEmails.some((email) => typeof email !== "string" || email.length === 0)
  ) {
    error(400, "La propriété 'personneEmails' doit être un tableau d'adresses email.");
  }
  if (new Set(value.personneEmails).size !== value.personneEmails.length) {
    error(400, "La propriété 'personneEmails' ne doit pas contenir de doublons.");
  }
  return value.personneEmails;
}

export const GET: RequestHandler = async ({ params, url }) => {
  const candidates = await listDossierFollowerCandidatesFromCap(
    requireCap(url),
    parseDossierId(params.dossierId!),
  );
  if (!candidates) {
    error(403, "La capability ne permet pas d'accéder à ce dossier.");
  }
  return json(candidates);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = parseDossierId(params.dossierId!);
  const personneEmails = parsePersonneEmails(await readJsonObject(request));
  const transaction = await createTransaction();

  try {
    const updated = await updateDossierFollowersFromCap(
      cap,
      dossierId,
      personneEmails,
      transaction,
    );
    if (!updated) {
      await transaction.rollback();
      error(403, "Une personne sélectionnée n'appartient pas au groupe instructeur du dossier.");
    }
    await transaction.commit();
    return new Response(null, { status: 204 });
  } catch (err) {
    if (!transaction.isCompleted()) await transaction.rollback();
    throw err;
  }
};
