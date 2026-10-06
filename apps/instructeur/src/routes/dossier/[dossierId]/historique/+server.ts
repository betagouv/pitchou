import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierAccess } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { getDossierActions, logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const GET: RequestHandler = async ({ params, locals }) => {
  const userId = requireUserId(locals);
  const dossierId = await requireDossierAccess(Number(params.dossierId!) as DossierId, userId);
  return json(await getDossierActions(dossierId));
};

/**
 * Records the generation of a document. Documents are assembled in the browser,
 * from templates it downloads, so this is the one act the server cannot observe
 * on its own — hence the narrow endpoint: the caller only names the document, the
 * type of the action is not up to it.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  const userId = requireUserId(locals);
  const dossierId = await requireDossierAccess(Number(params.dossierId!) as DossierId, userId);

  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["documents"]));
  if (
    !Array.isArray(body.documents) ||
    body.documents.length === 0 ||
    body.documents.some((name) => typeof name !== "string" || name.trim().length === 0)
  ) {
    error(400, "La propriété 'documents' doit être un tableau de noms de documents.");
  }

  const author = await getUserById(userId);
  await logDossierActions(
    (body.documents as string[]).map((name) => ({
      dossier: dossierId,
      type: "document_genere",
      data: { name: name.trim().slice(0, 200) },
      author_personne: author?.id ?? null,
    })),
  );
  return new Response(null, { status: 204 });
};
