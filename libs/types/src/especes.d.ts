import { StringValues } from "./tools.d.ts";

export type Regne = "Animalia" | "Plantae" | "Fungi" | "Chromista";
export type Classe =
  | "Aves"
  | "Amphibia"
  | "Actinopterygii"
  | "Malacostraca"
  | "Mammalia"
  | "Anthozoa"
  | "Equisetopsida"
  | "Gastropoda"
  | "Insecta"
  | "Bivalvia"
  | "Petromyzonti"
  | "Lecanoromycetes"
  | "Ulvophyceae"
  | "Holothuroidea"
  | "Elasmobranchii"
  | "Arachnida"
  | "Charophyceae"
  | "Cephalopoda"
  | "Echinoidea"
  | "Phaeophyceae";
export type ClassificationEtreVivant = "oiseau" | "faune non-oiseau" | "flore";

export type ParClassification<T> = {
  oiseau: T;
  "faune non-oiseau": T;
  flore: T;
};

/**
 * Rows of the TAXREF.txt file (INPN)
 * There may be several rows with the same CD_REF (but different CD_NOM) if the species has synonyms
 */
export interface TAXREF_ROW {
  CD_NOM: string;
  CD_REF: string;
  LB_NOM: string;
  NOM_VERN: string;
  CLASSE: Classe;
  REGNE: Regne;
  // incomplete
}

/**
 * Rows of the BDC_STATUT.csv file (INPN)
 * There may be several rows with the same CD_NOM if the species is protected in several places
 */

export interface BDC_STATUT_ROW {
  CD_NOM: TAXREF_ROW["CD_NOM"];
  CD_REF: TAXREF_ROW["CD_REF"];
  CD_TYPE_STATUT: "POM" | "PD" | "PN" | "PR" | "Espèce manquante";
  LABEL_STATUT: string;
  CD_DOC: string;
  FULL_CITATION: string;
  DOC_URL: string;
  // incomplete
}

export interface ProtectionDocument {
  cd_doc: string;
  full_citation: string;
  doc_url: string;
}

export interface StatutProtection {
  cd_type_statut: BDC_STATUT_ROW["CD_TYPE_STATUT"];
  documents: ProtectionDocument[];
}

/**
 * Rows of the Espèce Ministérielle sheet of the espèces_ministérielles_cnpn file (produced by Pitchou)
 */
export interface ESPECES_MINISTERIELLES_ROW {
  "Nom vernaculaire": string;
  "Nom scientifique": string;
}

/**
 * Rows of the Espèces CNPN sheet of the espèces_ministérielles_cnpn file (produced by Pitchou)
 */
export interface ESPECES_CNPN_ROW {
  "Nom vernaculaire": string;
  "Nom scientifique": string;
}

/**
 * Espèce protégée as stored in the `espece_protegee` table
 * (one entry per CD_REF, with aggregated names and statuses)
 */
export interface EspeceProtegee {
  CD_REF: TAXREF_ROW["CD_REF"];
  // TAXREF_ROW['NOM_VERN'] sometimes contains several names. They are separated in the set
  nomsVernaculaires: Set<TAXREF_ROW["NOM_VERN"]>;
  // several names if several CD_NOM for the same CD_REF
  nomsScientifiques: Set<TAXREF_ROW["LB_NOM"]>;
  classification: ClassificationEtreVivant;
  // types of protection associated with this species
  CD_TYPE_STATUTS: Set<BDC_STATUT_ROW["CD_TYPE_STATUT"]>;
  // links to the source documents by protection status
  statutsProtection?: StatutProtection[];
  // Espèce ministérielle
  espèceMinistérielle: undefined | "O";
  // Espèce CNPN
  espèceCNPN: undefined | "O";
}

/**
 * The Set<string> become strings separated by `,`
 */
export type EspeceProtegeeStrings = StringValues<EspeceProtegee>;

// based on the nomenclature for reporting to the European Commission
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

// for when we want to merge or split activities
export type CodeActivitePitchou =
  | "4-1-pitchou-aires"
  | "4-2-pitchou-nids"
  | "4-3-pitchou-œufs"
  | "mix-1-10-3-30-6-40";

export type ImpactQuantifie =
  | `Nombre d'individus`
  | "Nids"
  | "Œufs"
  | "Surface habitat détruit (m²)";

export interface ActiviteMenancante {
  "Code rapportage européen": string;
  "Identifiant Pitchou": string;
  "Libellé activité directive européenne": string;
  "Libellé Pitchou": string;
  Méthode: "Oui" | "Non";
  "Moyen de poursuite": "Oui" | "Non";
  // Secondary data
  "Nombre d'individus": "Oui" | "Non";
  Nids: "Oui" | "Non";
  Œufs: "Oui" | "Non";
  "Surface habitat détruit (m²)": "Oui" | "Non";
}

export interface MethodeMenancante {
  Code: string;
  Espèces: ClassificationEtreVivant;
  "Libellé activité directive européenne": string;
  "Libellé Pitchou": string;
}

export interface MoyenDePoursuiteMenacant {
  Code: string;
  Espèces: ClassificationEtreVivant;
  "Libellé activité directive européenne": string;
  "Libellé Pitchou": string;
}

export interface EtreVivantAtteint {
  espèce: EspeceProtegee;
  nombreIndividus?: string;
  surfaceHabitatDétruit?: number;
}

export interface EtreVivantAtteintJSON {
  espèce: EspeceProtegee["CD_REF"];
  espece?: EspeceProtegee["CD_REF"]; // deprecated
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
  etresVivantsAtteints: (OiseauAtteintJSON | FauneNonOiseauAtteinteJSON | FloreAtteinteJSON)[];
}

export interface EspeceSimplifiee {
  CD_REF: EspeceProtegee["CD_REF"];
  nom: string;
}
