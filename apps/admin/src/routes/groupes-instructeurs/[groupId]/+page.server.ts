import { error } from "@sveltejs/kit";
import { loadGroupDirectory } from "../directory.server.ts";
import type { PageServerLoad } from "./$types";
export const load: PageServerLoad = async ({ params }) => {
  const data = await loadGroupDirectory();
  const current = data.groups.find((group) => group.id === params.groupId);
  if (params.groupId !== "nouveau" && !current) error(404, "Groupe introuvable");
  return { ...data, current };
};
