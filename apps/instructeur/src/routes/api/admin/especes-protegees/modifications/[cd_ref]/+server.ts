import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAdmin } from "$lib/server/auth.ts";
import {
  upsertEspeceProtegeeModification,
  deleteEspeceProtegeeModification,
  validatePatchModification,
} from "@pitchou/server/especeProtegee.ts";

export const PUT: RequestHandler = async ({ url, request, params }) => {
  const email = await requireAdmin(url);
  const { cd_ref } = params;
  if (!cd_ref) {
    error(400, "Paramètre 'cd_ref' manquant");
  }

  const validation = validatePatchModification(await request.json());
  if (!validation.ok) {
    error(400, validation.message);
  }

  // `modifie_par` is always the resolved admin email, never trusted from the client.
  await upsertEspeceProtegeeModification(cd_ref, { ...validation.value, modifie_par: email });
  return json({ succès: true });
};

export const DELETE: RequestHandler = async ({ url, params }) => {
  await requireAdmin(url);
  const { cd_ref } = params;
  if (!cd_ref) {
    error(400, "Paramètre 'cd_ref' manquant");
  }

  await deleteEspeceProtegeeModification(cd_ref);
  return new Response(null, { status: 204 });
};
