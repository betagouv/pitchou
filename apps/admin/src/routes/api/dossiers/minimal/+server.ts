import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";

import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import { parseMinimalCreationRelations } from "$lib/server/dossierValidation/minimalCreation.ts";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["name", "groupe_instructeurs", "porteur_de_projet"]));
  if (typeof body.name !== "string" || !body.name.trim()) {
    error(400, "Le nom du dossier est requis.");
  }
  const relations = parseMinimalCreationRelations(body);

  try {
    const { id } = await createDossierFromAdmin(
      {
        name: body.name.trim(),
        depot_date: new Date(),
        phase: "Accompagnement amont",
        relations,
      },
      locals.user!.email,
    );
    return json({ id }, { status: 201 });
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
