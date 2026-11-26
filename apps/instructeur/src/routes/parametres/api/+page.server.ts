import { requireUserId } from "#lib/server/auth.ts";
import { listApiKeys } from "@pitchou/server/database/externalApi/keys.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const userId = requireUserId(locals);
  setHeaders({ "Cache-Control": "no-store" });
  return {
    keys: await listApiKeys({ user_id: userId }),
    canReadDossiers: locals.user?.permissions.includes("dossier:read") ?? false,
  };
};
