import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user?.groupes.length && locals.user.permissions.includes("dossier:read")) {
    redirect(303, "/mes-dossiers");
  }
  return {
    signedIn: Boolean(locals.user),
    disabled: url.searchParams.get("reason") === "disabled",
  };
};
