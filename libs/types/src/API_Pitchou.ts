export type * from "./apiPitchou/aarri.ts";
export type * from "./apiPitchou/dossierBase.ts";
export type * from "./apiPitchou/dossierDetails.ts";
export type * from "./apiPitchou/stats.ts";

import type { DossierDemarcheNumerique88444 } from "./demarche-numerique/Demarche88444.ts";

export type ChampFormulaire88444 = keyof DossierDemarcheNumerique88444;
