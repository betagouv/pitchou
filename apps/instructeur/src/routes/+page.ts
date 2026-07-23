import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types.js";

// Home page is "Mes dossiers"
export const load: PageLoad = () => {
  redirect(307, "/mes-dossiers");
};
