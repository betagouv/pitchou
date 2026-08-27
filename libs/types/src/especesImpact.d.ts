import type {
  ActiviteMenancante,
  ClassificationEtreVivant,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "./especes.d.ts";

export type CodeActiviteStandard =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "10"
  | "20"
  | "30"
  | "40"
  | "50"
  | "60"
  | "70"
  | "80"
  | "90";

export type CodeActivitePitchou =
  "4-1-pitchou-aires" | "4-2-pitchou-nids" | "4-3-pitchou-œufs" | "mix-1-10-3-30-6-40";

export type QuantifiedImpact =
  `Nombre d'individus` | "Nids" | "Œufs" | "Surface habitat détruit (m²)";

export interface EtreVivantAtteint {
  espèce: EspeceProtegee;
  nombreIndividus?: string;
  surfaceHabitatDétruit?: number;
}

export interface EtreVivantAtteintJSON {
  espèce: EspeceProtegee["CD_REF"];
  espece?: EspeceProtegee["CD_REF"];
  nombreIndividus?: string;
  surfaceHabitatDétruit?: number;
}

export interface FloreAtteinte extends EtreVivantAtteint {
  activité?: ActiviteMenancante;
}

export interface FloreAtteinteJSON extends EtreVivantAtteintJSON {
  activité?: string;
}

export interface FauneNonOiseauAtteinte extends EtreVivantAtteint {
  activité?: ActiviteMenancante;
  méthode?: MethodeMenancante;
  moyenDePoursuite?: MoyenDePoursuiteMenacant;
}

export interface FauneNonOiseauAtteinteJSON extends EtreVivantAtteintJSON {
  activité?: string;
  méthode?: string;
  moyenDePoursuite?: string;
}

export interface OiseauAtteint extends EtreVivantAtteint {
  activité?: ActiviteMenancante;
  méthode?: MethodeMenancante;
  moyenDePoursuite?: MoyenDePoursuiteMenacant;
  nombreNids?: number;
  nombreOeufs?: number;
}

export interface OiseauAtteintJSON extends EtreVivantAtteintJSON {
  activité?: string;
  méthode?: string;
  moyenDePoursuite?: string;
  nombreNids?: number;
  nombreOeufs?: number;
}

export interface DescriptionImpact {
  nombreIndividus?: string;
  surfaceHabitatDétruit?: number;
  activité?: ActiviteMenancante;
  méthode?: MethodeMenancante;
  moyenDePoursuite?: MoyenDePoursuiteMenacant;
  nombreNids?: number;
  nombreOeufs?: number;
}

export interface DescriptionMenacesEspeces {
  oiseau: OiseauAtteint[];
  "faune non-oiseau": FauneNonOiseauAtteinte[];
  flore: FloreAtteinte[];
}

export interface DescriptionMenaceEspeceJSON {
  classification: ClassificationEtreVivant;
  etresVivantsAtteints: (OiseauAtteintJSON | FauneNonOiseauAtteintJSON | FloreAtteinteJSON)[];
}

export interface SimplifiedEspece {
  CD_REF: EspeceProtegee["CD_REF"];
  nom: string;
}

export interface AnomalieFichierEspeces {
  classification?: ClassificationEtreVivant;
  /** Row number as the spreadsheet shows it, header included, so the message can point at it. */
  ligne?: number;
  /**
   * `false` when the ligne was imported and only one of its values ignored — it is displayed with
   * the others. Absent means the whole ligne was dropped, which is what most anomalies do.
   */
  ligneIgnoree?: boolean;
  /** French, shown as is to the instructrice. */
  message: string;
}

export interface ResultatImportFichierEspeces {
  description: DescriptionMenacesEspeces;
  anomalies: AnomalieFichierEspeces[];
}
