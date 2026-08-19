import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import {
  addCommentaireFromCap,
  getDossierCommentaires,
  updateCommentaireFromCap,
} from "@pitchou/server/database/commentaire.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CommentaireId } from "@pitchou/types/database/public/Commentaire.ts";

const createProperties = new Set(["content"]);
const updateProperties = new Set(["id", "content"]);

function parseContent(value: Record<string, unknown>): string {
  if (typeof value.content !== "string" || value.content.trim().length === 0) {
    error(400, "La propriété 'content' doit être un texte non vide.");
  }
  return value.content.trim();
}

export const GET: RequestHandler = async ({ params, url }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  return json(await getDossierCommentaires(dossierId));
};

export const POST: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, createProperties);
  return json(await addCommentaireFromCap(cap, dossierId, parseContent(body)), { status: 201 });
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, updateProperties);
  if (typeof body.id !== "string" || body.id.length === 0) {
    error(400, "La propriété 'id' doit être un identifiant de commentaire.");
  }
  const updated = await updateCommentaireFromCap(
    cap,
    dossierId,
    body.id as CommentaireId,
    parseContent(body),
  );
  if (!updated) {
    error(403, "Seule l'autrice ou l'auteur d'un commentaire peut le modifier.");
  }
  return new Response(null, { status: 204 });
};
