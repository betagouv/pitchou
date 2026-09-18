import { error, redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { getDossierFull } from "$lib/dossier/dossier.ts";
import {
  loadNotificationByDossierForCurrentInstructeur,
  loadRelationSuivi,
} from "$lib/shared/main.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const load: PageLoad = async ({ params, parent, url }) => {
  const dossierId = Number(params.dossierId);
  if (!Number.isFinite(dossierId)) {
    error(400, "dossierId invalide");
  }
  const id = dossierId as DossierId;

  await parent();

  loadNotificationByDossierForCurrentInstructeur();

  // Reading the parameter here is what makes SvelteKit re-run this load when the
  // mode changes — and the mode decides which payload the server sends.
  const readOnly = url.searchParams.get("lecture") === "1";

  const [dossier] = await Promise.all([getDossierFull(id, { readOnly }), loadRelationSuivi()]);

  if (!dossier) {
    redirect(307, "/");
  }

  return { dossierId: id, readOnly, fullWidth: true };
};
