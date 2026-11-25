import { json } from "@sveltejs/kit";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import { readExternalDossierStatus } from "@pitchou/server/database/externalApi.ts";
import { dossierStatusScope } from "@pitchou/types/externalApi.ts";
import { apiNotFound, apiProblem, apiUnavailable } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

const statusByPhase = {
  "Accompagnement amont": "accompagnement_amont",
  "Étude recevabilité": "etude_recevabilite",
  Instruction: "instruction",
  Contrôle: "controle",
  "Classé sans suite": "classe_sans_suite",
  "Obligations terminées": "obligations_terminees",
} as const satisfies Record<DossierPhase, string>;

export const GET: RequestHandler = async ({ params, locals }) => {
  const principal = locals.externalApi;
  if (!principal)
    return apiProblem(401, "Authentification requise", { "WWW-Authenticate": "Bearer" });
  if (!principal.scopes.has(dossierStatusScope)) {
    return apiProblem(403, "Portée du jeton insuffisante", {
      "WWW-Authenticate": `Bearer error="insufficient_scope", scope="${dossierStatusScope}"`,
    });
  }

  const id = Number(params.id);
  if (!/^[1-9]\d{0,9}$/u.test(params.id) || id > 2_147_483_647) {
    return apiProblem(400, "Identifiant de dossier invalide");
  }

  try {
    const dossier = await readExternalDossierStatus(principal, dossierStatusScope, id);
    if (!dossier) return apiNotFound();
    const statut = statusByPhase[dossier.phase ?? "Accompagnement amont"];
    if (typeof statut !== "string") return apiUnavailable();
    return json({
      id: dossier.id,
      statut,
      date_changement_statut: dossier.timestamp?.toISOString() ?? null,
    });
  } catch {
    return apiUnavailable();
  }
};
