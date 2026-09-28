import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { parseUploadedFichier, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";
import {
  addOrUpdateAvisExpert,
  addOrUpdateAvisExpertWithFichiers,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import {
  logDossierActions,
  logDossierActionsAfterCommit,
} from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const avisExpertProperties = new Set([
  "dossier",
  "id",
  "expert",
  "avis",
  "saisine_date",
  "avis_date",
  "saisine_fichier_upload",
  "avis_fichier_upload",
]);

function parseOptionalDate(
  body: Record<string, unknown>,
  property: "saisine_date" | "avis_date",
): Date | undefined {
  const rawDate = body[property];
  if (rawDate === undefined || rawDate === null) return undefined;
  if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
    error(400, `Le champ '${property}' doit être une date valide.`);
  }
  return new Date(rawDate);
}

function parseOptionalString(body: Record<string, unknown>, property: string): string | undefined {
  const value = body[property];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    error(400, `Champ '${property}' invalide.`);
  }
  return value;
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, avisExpertProperties);

  if (typeof body.dossier !== "number" || !Number.isInteger(body.dossier)) {
    error(400, `Champ 'dossier' invalide.`);
  }
  const dossierId = body.dossier as DossierId;
  const id = parseOptionalString(body, "id");
  const expert = parseOptionalString(body, "expert");
  const avis = parseOptionalString(body, "avis");
  const dateSaisine = parseOptionalDate(body, "saisine_date");
  const dateAvis = parseOptionalDate(body, "avis_date");
  const fichierSaisine = parseUploadedFichier(
    body.saisine_fichier_upload,
    "saisine_fichier_upload",
  );
  const fichierAvis = parseUploadedFichier(body.avis_fichier_upload, "avis_fichier_upload");

  const baseAvisExpert = {
    dossier: dossierId,
    expert,
    avis,
    avis_date: dateAvis,
    saisine_date: dateSaisine,
  };
  const avisExpert = id ? { ...baseAvisExpert, id: id as AvisExpertId } : baseAvisExpert;

  const authorizedDossierId = await requireDossierAccessByCap(
    id ? await getDossierIdFromAvisExpert(id as AvisExpertId) : dossierId,
    cap,
  );

  if (fichierAvis || fichierSaisine) {
    try {
      await addOrUpdateAvisExpertWithFichiers(avisExpert, fichierSaisine, fichierAvis);
    } catch (err) {
      throwUploadedFichierHttpError(err);
    }
    await logDossierActionsAfterCommit(
      (async () => {
        const author = await getPersonneByDossierCap(cap);
        return [
          ...(fichierSaisine
            ? [
                {
                  dossier: authorizedDossierId,
                  type: "saisine_importee",
                  data: { expert: expert ?? null },
                  author_personne: author?.id ?? null,
                },
              ]
            : []),
          ...(fichierAvis
            ? [
                {
                  dossier: authorizedDossierId,
                  type: "avis_importe",
                  data: { avis: avis ?? null },
                  author_personne: author?.id ?? null,
                },
              ]
            : []),
        ];
      })(),
    );
  } else {
    await directDatabaseConnection.transaction(async (transaction) => {
      await addOrUpdateAvisExpert(avisExpert, transaction);
      if (id) {
        const author = await getPersonneByDossierCap(cap, transaction);
        await logDossierActions(
          [
            {
              dossier: authorizedDossierId,
              type: "avis_modifie",
              data: { expert: expert ?? null, avis: avis ?? null },
              author_personne: author?.id ?? null,
            },
          ],
          transaction,
        );
      }
    });
  }

  return new Response(null, { status: 204 });
};
