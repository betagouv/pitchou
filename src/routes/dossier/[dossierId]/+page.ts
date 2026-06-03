import { error, redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { getDossierComplet, chargerMessagesDossier } from "$front/actions/dossier.ts";
import {
  chargerNotificationParDossierPourInstructeurActuel,
  chargerRelationSuivi,
} from "$front/actions/main.ts";
import type { DossierId } from "$types/database/public/Dossier.ts";

export const load: PageLoad = async ({ params, parent }) => {
  const dossierId = Number(params.dossierId);
  if (!Number.isFinite(dossierId)) {
    error(400, "dossierId invalide");
  }
  const id = dossierId as DossierId;

  await parent();

  chargerNotificationParDossierPourInstructeurActuel();

  const [dossier] = await Promise.all([
    getDossierComplet(id),
    chargerMessagesDossier(id),
    chargerRelationSuivi(),
  ]);

  if (!dossier) {
    redirect(307, "/");
  }

  return { dossierId: id };
};
