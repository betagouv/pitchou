import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  addOrUpdateAvisExpert,
  addOrUpdateAvisExpertWithFichiers,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

type FichierUpload = { name: string; content: Buffer; media_type: string };

const avisExpertProperties = new Set([
  "dossier",
  "id",
  "expert",
  "avis",
  "saisine_date",
  "avis_date",
  "blobFichierSaisine",
  "blobFichierAvis",
]);

function parseOptionalDate(form: FormData, property: "saisine_date" | "avis_date") {
  const rawDate = form.get(property);
  if (rawDate === null) return undefined;
  if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
    error(400, `Le champ '${property}' doit être une date valide.`);
  }
  return new Date(rawDate);
}

async function readFileField(file: File): Promise<FichierUpload> {
  const content = Buffer.from(await file.arrayBuffer());
  return { name: file.name, media_type: file.type, content };
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const form = await request.formData();

  const unknownProperty = [...form.keys()].find((property) => !avisExpertProperties.has(property));
  if (unknownProperty) {
    error(400, `Champ non reconnu '${unknownProperty}'.`);
  }

  const dossierField = form.get("dossier");
  if (typeof dossierField !== "string") {
    error(400, `Champ 'dossier' manquant`);
  }
  let dossier: unknown;
  try {
    dossier = JSON.parse(dossierField);
  } catch {
    error(400, `Champ 'dossier' invalide.`);
  }
  if (typeof dossier !== "number" || !Number.isInteger(dossier)) {
    error(400, `Champ 'dossier' invalide.`);
  }
  const dossierId = dossier as DossierId;

  const idField = form.get("id");
  const expertField = form.get("expert");
  const avisField = form.get("avis");
  for (const [property, field] of [
    ["id", idField],
    ["expert", expertField],
    ["avis", avisField],
  ] as const) {
    if (field !== null && typeof field !== "string") {
      error(400, `Champ '${property}' invalide.`);
    }
  }

  const id = (idField as string | null) ?? undefined;
  const expert = (expertField as string | null) ?? undefined;
  const avis = (avisField as string | null) ?? undefined;
  const dateSaisine = parseOptionalDate(form, "saisine_date");
  const dateAvis = parseOptionalDate(form, "avis_date");

  const baseAvisExpert = {
    dossier: dossierId,
    expert,
    avis,
    avis_date: dateAvis,
    saisine_date: dateSaisine,
  };
  const avisExpert = id ? { ...baseAvisExpert, id: id as AvisExpertId } : baseAvisExpert;

  const dossierIdForAuth = id ? await getDossierIdFromAvisExpert(id as AvisExpertId) : dossierId;
  await requireDossierAccessByCap(dossierIdForAuth, cap);

  const blobFichierSaisine = form.get("blobFichierSaisine");
  const blobFichierAvis = form.get("blobFichierAvis");
  if (blobFichierSaisine !== null && !(blobFichierSaisine instanceof File)) {
    error(400, `Champ 'blobFichierSaisine' invalide.`);
  }
  if (blobFichierAvis !== null && !(blobFichierAvis instanceof File)) {
    error(400, `Champ 'blobFichierAvis' invalide.`);
  }
  const fichierSaisine =
    blobFichierSaisine instanceof File ? await readFileField(blobFichierSaisine) : undefined;
  const fichierAvis =
    blobFichierAvis instanceof File ? await readFileField(blobFichierAvis) : undefined;

  if (fichierAvis || fichierSaisine) {
    await addOrUpdateAvisExpertWithFichiers(avisExpert, fichierSaisine, fichierAvis);
  } else {
    await addOrUpdateAvisExpert(avisExpert);
  }

  return new Response(null, { status: 204 });
};
