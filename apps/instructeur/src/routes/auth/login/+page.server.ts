import { canReadDossiers } from "#lib/server/dossierEntry.ts";
import { redirect } from "@sveltejs/kit";

import { sanitizeInternalPath } from "#lib/server/redirect.ts";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const redirectTo = sanitizeInternalPath(url.searchParams.get("redirectTo"));

  // Already signed in: skip the wall.
  if (locals.user) {
    if (!(await canReadDossiers(locals.user))) {
      redirect(303, "/auth/acces-refuse");
    }
    redirect(303, redirectTo);
  }

  return { redirectTo };
};
