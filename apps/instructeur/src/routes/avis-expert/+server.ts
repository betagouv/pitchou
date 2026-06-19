import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import {
  ajouterOuModifierAvisExpert,
  ajouterOuModifierAvisExpertAvecFichiers,
  getDossierIdFromAvisExpert,
} from "@pitchou/server/database/avis_expert.ts";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";
import type Fichier from "@pitchou/types/database/public/Fichier.ts";
import type { PickNonNullable } from "@pitchou/types/tools.d.ts";

const ONE_MB = 1_048_576;
const MAX_UPLOAD_FILE_SIZE = 20 * ONE_MB;

type FichierUpload = PickNonNullable<Fichier, "nom" | "contenu" | "media_type">;

async function readFileField(file: File): Promise<FichierUpload> {
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    error(413, `Fichier '${file.name}' trop volumineux (max ${MAX_UPLOAD_FILE_SIZE} octets)`);
  }
  const contenu = Buffer.from(await file.arrayBuffer());
  return { nom: file.name, media_type: file.type, contenu };
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
  const dateSaisineRaw = form.get("date_saisine") as string | null;
  const dateAvisRaw = form.get("date_avis") as string | null;
  const dateSaisine = dateSaisineRaw ? new Date(dateSaisineRaw) : undefined;
  const dateAvis = dateAvisRaw ? new Date(dateAvisRaw) : undefined;

  const baseAvisExpert = { dossier, expert, avis, date_avis: dateAvis, date_saisine: dateSaisine };
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
    await ajouterOuModifierAvisExpertAvecFichiers(avisExpert, fichierSaisine, fichierAvis);
  } else {
    await ajouterOuModifierAvisExpert(avisExpert);
  }

  return new Response(null, { status: 204 });
};
