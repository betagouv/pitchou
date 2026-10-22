import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  createChangelogEntry,
  listChangelogEntries,
  validateChangelogPayload,
} from "@pitchou/server/database/changelog.ts";

// Auth is enforced upstream by hooks.server.ts (session and permissions).
export const GET: RequestHandler = async () => {
  return json(await listChangelogEntries());
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const validation = validateChangelogPayload(await request.json());
  if (!validation.ok) {
    error(400, validation.message);
  }
  if (validation.value.published && !locals.user!.permissions.includes("admin:changelog:update")) {
    error(403, "Vous n'avez pas le droit de publier une nouveauté.");
  }

  // `updated_by` is always the logged-in admin email, never trusted from the client.
  try {
    const id = await createChangelogEntry({
      ...validation.value,
      updated_by: locals.user!.email,
    });
    return json({ id }, { status: 201 });
  } catch (err) {
    // 23505 = unique_violation in PostgreSQL (version already taken).
    if ((err as { code?: unknown }).code === "23505") {
      const { version_major, version_minor, version_patch } = validation.value;
      error(409, `La version ${version_major}.${version_minor}.${version_patch} existe déjà.`);
    }
    throw err;
  }
};
