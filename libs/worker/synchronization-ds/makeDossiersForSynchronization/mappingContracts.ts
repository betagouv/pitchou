import type { PersonnesEntreprisesDataInitializer } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierInitializer, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";

export type MakeCommonDossierColumnsForSync = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
  pitchouKeyToAnnotationDS: Map<string, ChampDescriptor["id"]>,
) => DossierInitializer | DossierMutator;

export type GetPersonnesEntreprisesData = (
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<string, ChampDescriptor["id"]>,
) => PersonnesEntreprisesDataInitializer;
