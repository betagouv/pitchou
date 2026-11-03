import { expect, test } from "vitest";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import { synchronizeDownloadedDossierFiles } from "../../../../libs/worker/synchronization-ds/synchronizeDossierFiles.ts";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createDossier } from "../factories/dossier.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { s3HasKey } from "../helpers/fileStorage.ts";

const speciesField =
  "Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes";
const attachmentFields: (keyof DossierDemarcheNumerique88444)[] = [
  "Dépot du dossier complet de demande de dérogation",
  "Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande",
  "Diagnostic écologique",
  "Déposez ici l'argumentaire précis vous ayant permis de conclure à l'absence de risque suffisament caractérisé pour les espèces protégées et leurs habitats.",
  "Joindre les pièces justifiant de la finalité de la demande",
  "Joindre le bilan des opérations antérieures",
  "Ajoutez un fichier décrivant ces mesures complémentaires :",
  "Plan des installations",
  "Joindre une carte du périmètre d'intervention si besoin",
  "Pièces jointes décrivant précisément le protocole qui sera mis en place",
];

test.each([
  { replacement: false, attachment: true },
  { replacement: true, attachment: true },
  { replacement: false, attachment: false },
])(
  "species replacement=$replacement preserves pending attachment=$attachment",
  async ({ replacement, attachment }) => {
    const s3 = await getTestS3();
    const oldFile = await createFichierS3(db, s3);
    const nextFile = replacement ? await createFichierS3(db, s3) : undefined;
    await db("file").where({ id: oldFile.id }).update({ demarche_numerique_checksum: "shared" });
    const source = (
      await createDossier(db, {
        demarche_numerique_number: "101",
        especes_impactees: oldFile.id,
      })
    ).id as DossierId;
    const destination = (await createDossier(db, { demarche_numerique_number: "102" }))
      .id as DossierId;
    const mapping = new Map<keyof DossierDemarcheNumerique88444, string>([
      [speciesField, "species"],
      ...attachmentFields.map((field, index) => [field, `attachment-${index}`] as const),
    ]);
    const descriptions = [
      {
        number: 101,
        champs: [
          { id: "species", label: "Espèces", files: nextFile ? [{ checksum: "next" }] : [] },
        ],
        annotations: [],
      },
      {
        number: 102,
        champs: [
          { id: "attachment-0", label: "PJ", files: attachment ? [{ checksum: "shared" }] : [] },
        ],
        annotations: [],
      },
    ] as unknown as DossierDS88444[];
    await db.transaction(async (trx) => {
      await synchronizeDownloadedDossierFiles(
        {
          especesImpactees: new Map(nextFile ? [[101, nextFile.id]] : []),
          piecesJointesPetitionnaire: new Map(attachment ? [[102, [oldFile.id]]] : []),
          preparedFiles: new Map(nextFile ? [[nextFile.id, { anomalies: [] }]] : []),
        },
        descriptions,
        new Map([
          [101, source],
          [102, destination],
        ]),
        mapping,
        trx,
      );
    });
    expect((await db("dossier").where({ id: source }).first())?.especes_impactees).toBe(
      nextFile?.id ?? null,
    );
    expect(await db("file").where({ id: oldFile.id })).toHaveLength(1);
    expect(await db("demande_revision_file").where({ fichier: oldFile.id })).not.toHaveLength(0);
    expect(
      await db("edge_dossier__fichier_pieces_jointes_petitionnaire").where({
        dossier: destination,
        fichier: oldFile.id,
      }),
    ).toHaveLength(attachment ? 1 : 0);
    expect(await s3HasKey(oldFile.key)).toBe(true);
  },
);
