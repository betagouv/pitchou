import { loadGroupDirectory } from "./directory.server.ts";
import { fail } from "@sveltejs/kit";
import { saveGroup } from "@pitchou/server/administration.ts";
import { parseGroup } from "#lib/server/administration.ts";
import type { Actions, PageServerLoad } from "./$types";
export const load: PageServerLoad = () => loadGroupDirectory();
export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    try {
      if (!form.get("previewToken"))
        throw new TypeError("Vérifiez les affectations avant d’enregistrer");
      await saveGroup(
        locals.user!.id,
        parseGroup({
          id: form.get("id") || undefined,
          name: form.get("name"),
          active: form.get("active") === "on",
          rules: JSON.parse(String(form.get("rules") ?? "[]")),
          previewToken: form.get("previewToken") || undefined,
          members: form.getAll("members").map(Number),
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
