import { dispatchArrivalEmailsAfterCommit } from "@pitchou/server/dossierNotificationEmails.ts";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { isValidDate } from "@pitchou/common/typeFormat.ts";
import {
  addDemarcheNumerique88444SynchronizationResult,
  closeDatabaseConnection,
  directDatabaseConnection,
} from "@pitchou/server/database.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { AnnotationsPriveesDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import { format, formatDistanceToNow, sub } from "date-fns";
import { fr } from "date-fns/locale";
import { parseArgs } from "node:util";
import { synchronizeDemarcheNumerique } from "./synchronization-ds/synchronizeDemarcheNumerique.ts";
import { synchronizationErrorMessage } from "./sync-demarche-numerique/error.ts";

const apiToken = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN;
if (!apiToken)
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
if (!process.env.DATABASE_URL)
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`);

const { values: args } = parseArgs({
  options: { IdSchemaDS: { type: "string" }, lastModified: { type: "string" } },
});
const schemaId = args.IdSchemaDS;
if (!schemaId) {
  const files = await readdir(join(import.meta.dirname, `../../data/demarche-numerique/schema-DS`));
  console.error(`
Aucun argument --IdSchemaDS n'a été fourni.
Voici la liste des ids des schémas DS disponibles :
  - ${files.map((file) => file.slice(0, -".json".length)).join("\n  - ")}
`);
  process.exit(1);
}
const lastModified =
  typeof args.lastModified === "string" && isValidDate(new Date(args.lastModified))
    ? new Date(args.lastModified)
    : sub(new Date(), { hours: 12 });
const schema: SchemaDemarcheSimplifiee = (
  await import(`../../data/demarche-numerique/schema-DS/${schemaId}.json`, {
    with: { type: "json" },
  })
).default;
console.info(
  `Synchronisation des dossiers de la démarche`,
  schema.number,
  "modifiés depuis le",
  format(lastModified, "d MMMM yyyy (HH:mm O) ", { locale: fr }),
  `(${formatDistanceToNow(lastModified, { locale: fr })})`,
);

const pitchouKeyToChampDS = new Map(
  schema.revision.champDescriptors.map(({ label, id }) => [label, id] as const),
) as Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>;
export const pitchouKeyToAnnotationDS = new Map(
  schema.revision.annotationDescriptors.map(({ label, id }) => [label, id] as const),
) as Map<keyof AnnotationsPriveesDemarcheNumerique88444, ChampDescriptor["id"]>;

let committed = false;
try {
  // The callback transaction rejects on both synchronization and commit failures.
  await directDatabaseConnection.transaction((transaction) =>
    synchronizeDemarcheNumerique({
      apiToken,
      demarcheNumber: schema.number,
      lastModified,
      pitchouKeyToChampDS,
      pitchouKeyToAnnotationDS,
      transaction,
    }),
  );
  committed = true;
  await addDemarcheNumerique88444SynchronizationResult({
    success: true,
    timestamp: new Date(),
    error: null,
  });
  console.log("Synchronisation terminée, transaction validée");
  await dispatchArrivalEmailsAfterCommit();
} catch (error) {
  process.exitCode = 1;
  const message = synchronizationErrorMessage(error);
  console.error(
    committed ? "Erreur après validation de la synchronisation" : "Synchronisation échouée",
    message,
  );
  // A status or dispatch failure after commit must not be reported as a rollback.
  if (!committed) {
    try {
      await addDemarcheNumerique88444SynchronizationResult({
        success: false,
        timestamp: new Date(),
        error: message,
      });
    } catch (statusError) {
      console.error(
        "Enregistrement de l'échec impossible",
        synchronizationErrorMessage(statusError),
      );
    }
  }
} finally {
  console.log("Fin de la synchronisation, cloture de la connexion avec la base de données");
  await closeDatabaseConnection();
}
