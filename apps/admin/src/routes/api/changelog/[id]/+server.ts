import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  deleteChangelogEntry,
  isValidIdParam,
  updateChangelogEntry,
  validateChangelogPayload,
} from "@pitchou/server/database/changelog.ts";

export const PUT: RequestHandler = async ({ request, params, locals }) => {
  const { id } = params;
  if (!id || !isValidIdParam(id)) {
    error(400, "Paramètre 'id' invalide");
  }

  const validation = validateChangelogPayload(await request.json());
  if (!validation.ok) {
    error(400, validation.message);
  }

  // `updated_by` is always the logged-in admin email, never trusted from the client.
  try {
    await withAdminWriteAccess(locals, "admin:changelog:update", (trx, actor) =>
      updateChangelogEntry(Number(id), { ...validation.value, updated_by: actor.email }, trx),
    );
  } catch (err) {
    // 23505 = unique_violation in PostgreSQL (version already taken).
    if ((err as { code?: unknown }).code === "23505") {
      const { version_major, version_minor, version_patch } = validation.value;
      error(409, `La version ${version_major}.${version_minor}.${version_patch} existe déjà.`);
    }
    throw err;
  }
  return json({ succès: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const { id } = params;
  if (!id || !isValidIdParam(id)) {
    error(400, "Paramètre 'id' invalide");
  }

  await withAdminWriteAccess(locals, "admin:changelog:delete", (trx) =>
    deleteChangelogEntry(Number(id), trx),
  );
  return new Response(null, { status: 204 });
};
