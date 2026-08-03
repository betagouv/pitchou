import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["name", "groupe_instructeurs"]));
  if (typeof body.name !== "string" || !body.name.trim()) {
    error(400, "Le nom du dossier est requis.");
  }
  if (typeof body.groupe_instructeurs !== "string" || !body.groupe_instructeurs) {
    error(400, "Le groupe instructeurs est requis.");
  }

  try {
    const { id } = await createDossierFromAdmin(
      {
        name: body.name.trim(),
        depot_date: new Date(),
        phase: "Accompagnement amont",
        relations: {
          groupe_instructeurs: body.groupe_instructeurs as GroupeInstructeursId,
          demandeur_type: "personne_physique",
          demandeur_personne_physique: {
            last_name: "",
            first_names: "",
            email: null,
            address: null,
            phone: null,
            role: null,
          },
          demandeur_personne_morale: null,
          identites: [
            {
              type: "demandeur",
              last_name: "",
              first_names: "",
              email: null,
              phone: null,
              role: null,
            },
          ],
        },
      },
      locals.user!.email,
    );
    return json({ id }, { status: 201 });
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
