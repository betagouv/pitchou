import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { isValidDate } from "@pitchou/common/typeFormat.ts";
import {
  addDemarcheNumerique88444SynchronizationResult,
  closeDatabaseConnection,
  createTransaction,
} from "@pitchou/server/database.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { AnnotationsPriveesDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type DemarcheNumerique88444SynchronizationResult from "@pitchou/types/database/public/DemarcheNumerique88444SynchronizationResult.ts";
import { format, formatDistanceToNow, sub } from "date-fns";
import { fr } from "date-fns/locale";
import parseArgs from "minimist";
import { synchronizeDemarcheNumerique } from "./synchronization-ds/synchronizeDemarcheNumerique.ts";

const apiToken = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN;
if (!apiToken)
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`);
if (!process.env.DATABASE_URL)
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`);

const args = parseArgs(process.argv);
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

const transaction = await createTransaction();
try {
  await synchronizeDemarcheNumerique({
    apiToken,
    demarcheNumber: schema.number,
    lastModified,
    pitchouKeyToChampDS,
    pitchouKeyToAnnotationDS,
    transaction,
  });
  console.log("Sync terminé avec succès, commit de la transaction");
  const result: DemarcheNumerique88444SynchronizationResult = {
    success: true,
    timestamp: new Date(),
    error: null,
  };
  await Promise.allSettled([
    addDemarcheNumerique88444SynchronizationResult(result),
    transaction.commit(),
  ]);
} catch (error) {
  console.error("Sync échoué", error, "rollback de la transaction");
  const result: DemarcheNumerique88444SynchronizationResult = {
    success: false,
    timestamp: new Date(),
    error: String(error),
  };
  await Promise.allSettled([
    addDemarcheNumerique88444SynchronizationResult(result),
    transaction.rollback(),
  ]);
} finally {
  console.log("Fin de la synchronisation, cloture de la connexion avec la base de données");
  await closeDatabaseConnection();
}
