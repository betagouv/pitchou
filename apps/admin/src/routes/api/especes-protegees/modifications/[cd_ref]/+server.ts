import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  upsertEspeceProtegeeModification,
  deleteEspeceProtegeeModification,
  validatePatchModification,
} from "@pitchou/server/especeProtegee.ts";

export const PUT: RequestHandler = async ({ request, params, locals }) => {
  const { cd_ref } = params;
  if (!cd_ref) {
    error(400, "Paramètre 'cd_ref' manquant");
  }

  const validation = validatePatchModification(await request.json());
  if (!validation.ok) {
    error(400, validation.message);
  }

  // `modified_by` is always the logged-in admin email, never trusted from the client.
  await withAdminWriteAccess(locals, "admin:especes:manage", (trx, actor) =>
    upsertEspeceProtegeeModification(
      cd_ref,
      {
        ...validation.value,
        modified_by: actor.email,
      },
      trx,
    ),
  );
  return json({ succès: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { cd_ref } = params;
  if (!cd_ref) {
    error(400, "Paramètre 'cd_ref' manquant");
  }

  await withAdminWriteAccess(locals, "admin:especes:manage", (trx) =>
    deleteEspeceProtegeeModification(cd_ref, trx),
  );
  return new Response(null, { status: 204 });
};
