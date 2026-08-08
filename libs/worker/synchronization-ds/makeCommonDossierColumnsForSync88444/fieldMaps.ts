import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";

export type Dossier88444KeyMap = Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>;
export type Dossier88444ChampById = Map<string | undefined, any>;

export function indexDossier88444Champs(champs: DossierDS88444["champs"]): Dossier88444ChampById {
  return new Map(champs.map((champ) => [champ.id, champ]));
}
