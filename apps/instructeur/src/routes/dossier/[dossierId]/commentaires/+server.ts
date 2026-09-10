import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import {
  addCommentaireFromCap,
  deleteCommentaireFromCap,
  getDossierCommentaires,
  updateCommentaireFromCap,
} from "@pitchou/server/database/commentaire.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CommentaireId } from "@pitchou/types/database/public/Commentaire.ts";

const createProperties = new Set(["content"]);
const updateProperties = new Set(["id", "content"]);
const deleteProperties = new Set(["id"]);

function parseCommentaireId(value: Record<string, unknown>): CommentaireId {
  if (
    typeof value.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)
  ) {
    error(400, "La propriété 'id' doit être un identifiant de commentaire UUID.");
  }
  return value.id as CommentaireId;
}

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
  const content = parseContent(body);
  const commentaire = await directDatabaseConnection.transaction(async (transaction) => {
    const commentaire = await addCommentaireFromCap(cap, dossierId, content, transaction);
    const author = await getPersonneByDossierCap(cap, transaction);
    await logDossierActions(
      [
        {
          dossier: dossierId,
          type: "commentaire_ajoute",
          data: { excerpt: commentaire.content.slice(0, 80) },
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );
    return commentaire;
  });
  return json(commentaire, { status: 201 });
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, updateProperties);
  const commentaireId = parseCommentaireId(body);
  const content = parseContent(body);
  await directDatabaseConnection.transaction(async (transaction) => {
    const updated = await updateCommentaireFromCap(
      cap,
      dossierId,
      commentaireId,
      content,
      transaction,
    );
    if (!updated) {
      error(403, "Seule l'autrice ou l'auteur d'un commentaire peut le modifier.");
    }
    const author = await getPersonneByDossierCap(cap, transaction);
    await logDossierActions(
      [
        {
          dossier: dossierId,
          type: "commentaire_modifie",
          data: { excerpt: content.slice(0, 80) },
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );
  });
  return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ params, url, request }) => {
  const cap = requireCap(url);
  const dossierId = await requireDossierAccessByCap(Number(params.dossierId!) as DossierId, cap);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, deleteProperties);
  const deleted = await deleteCommentaireFromCap(cap, dossierId, parseCommentaireId(body));
  if (!deleted) {
    error(403, "Seule l'autrice ou l'auteur d'un commentaire peut le supprimer.");
  }
  return new Response(null, { status: 204 });
};
