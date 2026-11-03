import { loadUserDirectory } from "./directory.server.ts";
import { fail } from "@sveltejs/kit";
import { saveUser } from "@pitchou/server/administration.ts";
import { parseUser } from "#lib/server/administration.ts";
import type { Actions, PageServerLoad } from "./$types";
export const load: PageServerLoad = ({ locals }) => loadUserDirectory(locals.user!.permissions);
export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      await saveUser(
        locals.user!.id,
        parseUser({
          id: form.get("id") ? Number(form.get("id")) : undefined,
          email: form.get("email"),
          active: form.get("active") === "on",
          bundles: form.getAll("bundles"),
          grants: form.getAll("grants"),
          exclusions: form.getAll("exclusions"),
          ...(form.has("updateGroups") ? { groupIds: form.getAll("groupIds") } : {}),
        }),
      );
      return { saved: true };
    } catch (cause) {
      return fail(400, {
        message: cause instanceof Error ? cause.message : "Enregistrement impossible",
      });
    }
  },
};
