import { error } from "@sveltejs/kit";
import { loadUserDirectory } from "../directory.server.ts";
import type { PageServerLoad } from "./$types";
export const load: PageServerLoad = async ({ params, locals, url }) => {
  const { users, groups } = await loadUserDirectory(locals.user!.permissions);
  const current = users.find((user) => String(user.id) === params.userId);
  if (params.userId !== "nouveau" && !current) error(404, "Utilisateur introuvable");
  return { current, groups, returnTo: `/utilisateurs${url.search}` };
};
