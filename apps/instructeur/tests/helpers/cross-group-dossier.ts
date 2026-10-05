import { db } from "../setup/db.ts";
import {
  createFichierS3,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";

export const COMMENTAIRE = "Commentaire interne au service instructeur";
export const PRESCRIPTION = "Prescription interne au service instructeur";

async function createFile(name: string) {
  const { id } = await createFichierS3(db, await getTestS3(), { name });
  return id;
}

/** A dossier owned by one service and a reader from another service. */
export async function createDossierWithSecondService() {
  const {
    cap: capProprietaire,
    dossier,
    groupeId: groupeProprietaire,
  } = await createInstructeurWithDossier(db, {
    email: "instructeur@service-proprietaire.fr",
    nomGroupe: "Service propriétaire",
  });

  await db("commentaire").insert({
    dossier: dossier.id,
    personne: null,
    content: COMMENTAIRE,
    created_at: new Date(),
  });

  const saisine = await createFile("saisine-cnpn.pdf");
  const avis = await createFile("avis-cnpn.pdf");
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: "CNPN",
    avis: "Favorable",
    saisine_fichier: saisine,
    avis_fichier: avis,
  });

  const [decision] = await db("decision_administrative")
    .insert({
      dossier: dossier.id,
      type: "Arrêté dérogation",
      number: "AP-001",
      fichier: await createFile("arrete.pdf"),
    })
    .returning(["id"]);
  await db("prescription").insert({
    decision_administrative: decision.id,
    article_number: "2",
    description: PRESCRIPTION,
  });

  // The second service: its own groupe, holding no dossier of its own.
  const { cap: capLecture } = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@service-lecteur.fr",
    nomGroupe: "Service lecteur",
  });

  return {
    capProprietaire,
    capLecture,
    groupeProprietaire,
    dossierId: dossier.id,
    files: { saisine, avis },
  };
}
