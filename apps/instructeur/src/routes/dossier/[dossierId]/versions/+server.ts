import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "#lib/server/auth.ts";
import {
  getDemandeVersion,
  listDemandeRevisions,
} from "@pitchou/server/database/demandeHistory.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const id = Number(params.dossierId) as DossierId;
  const userId = requireUserId(locals);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) error(400, "Demande invalide");
  const revision = url.searchParams.get("revision");
  if (
    revision &&
    revision !== "current" &&
    (!/^[1-9]\d{0,18}$/u.test(revision) || BigInt(revision) > 9223372036854775807n)
  )
    error(400, "État historique invalide");
  const result = revision
    ? await getDemandeVersion(id, revision === "current" ? null : revision, userId)
    : await listDemandeRevisions(id, userId);
  if (!result) error(404, "État inaccessible");
  return json(result);
};
