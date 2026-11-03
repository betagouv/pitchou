import { canReadDossiers } from "#lib/server/dossierEntry.ts";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (await canReadDossiers(locals.user)) {
    redirect(303, "/mes-dossiers");
  }
  return {
    signedIn: Boolean(locals.user),
    disabled: url.searchParams.get("reason") === "disabled",
  };
};
