import { error } from "@sveltejs/kit";
import { listApiIntegrations } from "@pitchou/server/database/externalApi/integrations.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({ "Cache-Control": "no-store" });
  try {
    return await listApiIntegrations();
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      (cause.code === "42P01" || cause.code === "42703")
    ) {
      error(
        503,
        "Les intégrations API sont temporairement indisponibles. Réessayez après la mise à jour de Pitchou.",
      );
    }
    throw cause;
  }
};
