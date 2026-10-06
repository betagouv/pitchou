import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import { DEPARTEMENT_VALUES } from "$lib/server/dossierValidation/columnAcceptedValues.ts";

import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["name", "primary_department"]));
  if (typeof body.name !== "string" || !body.name.trim()) {
    error(400, "Le nom du dossier est requis.");
  }
  if (
    typeof body.primary_department !== "string" ||
    !DEPARTEMENT_VALUES.has(body.primary_department)
  ) {
    error(400, "Le département principal est requis.");
  }

  try {
    const { id } = await createDossierFromAdmin(
      {
        name: body.name.trim(),
        columns: { primary_department: body.primary_department },
        depot_date: new Date(),
        phase: "Accompagnement amont",
        relations: {
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
