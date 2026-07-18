import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  addOrUpdateAvisExpert,
  addOrUpdateAvisExpertWithFichiers,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";

type FichierUpload = { name: string; content: Buffer; media_type: string };

async function readFileField(file: File): Promise<FichierUpload> {
  const content = Buffer.from(await file.arrayBuffer());
  return { name: file.name, media_type: file.type, content };
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const form = await request.formData();

  const dossierField = form.get("dossier");
  if (typeof dossierField !== "string") {
    error(400, `Champ 'dossier' manquant`);
  }
  const dossier = JSON.parse(dossierField);

  const id = (form.get("id") as string | null) ?? undefined;
  const expert = (form.get("expert") as string | null) ?? undefined;
  const avis = (form.get("avis") as string | null) ?? undefined;
  const dateSaisineRaw = form.get("saisine_date") as string | null;
  const dateAvisRaw = form.get("avis_date") as string | null;
  const dateSaisine = dateSaisineRaw ? new Date(dateSaisineRaw) : undefined;
  const dateAvis = dateAvisRaw ? new Date(dateAvisRaw) : undefined;

  const baseAvisExpert = { dossier, expert, avis, avis_date: dateAvis, saisine_date: dateSaisine };
  const avisExpert = id ? { ...baseAvisExpert, id: id as AvisExpertId } : baseAvisExpert;

  const dossierIdForAuth = id ? await getDossierIdFromAvisExpert(id as AvisExpertId) : dossier;
  await requireDossierAccessByCap(dossierIdForAuth, cap);

  const blobFichierSaisine = form.get("blobFichierSaisine");
  const blobFichierAvis = form.get("blobFichierAvis");
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
