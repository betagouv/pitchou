import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { dispatchArrivalEmailsAfterCommit } from "@pitchou/server/dossierNotificationEmails.ts";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import { DEPARTEMENT_VALUES } from "#lib/server/dossierValidation/columnAcceptedValues.ts";

import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import { throwHttpErrorForAdminDossier } from "#lib/server/dossierValidation.ts";
import { parseMinimalCreationRelations } from "#lib/server/dossierValidation/minimalCreation.ts";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["name", "primary_department", "porteur_de_projet"]));
  if (typeof body.name !== "string" || !body.name.trim()) {
    error(400, "Le nom du dossier est requis.");
  }
  if (
    typeof body.primary_department !== "string" ||
    !DEPARTEMENT_VALUES.has(body.primary_department)
  ) {
    error(400, "Le département principal est requis.");
  }
  const name = body.name.trim();
  const primaryDepartment = body.primary_department;
  const relations = parseMinimalCreationRelations(body);

  try {
    const { id } = await withAdminWriteAccess(locals, "admin:dossiers:create", (trx, actor) =>
      createDossierFromAdmin(
        {
          name,
          columns: { primary_department: primaryDepartment },
          depot_date: new Date(),
          phase: "Accompagnement amont",
          relations,
        },
        actor.email,
        trx,
      ),
    );
    await dispatchArrivalEmailsAfterCommit(id);
    return json({ id }, { status: 201 });
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
