import type { StringValues } from "./tools.d.ts";

export type * from "./especesImpact.d.ts";

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

export type ByClassification<T> = {
  oiseau: T;
  "faune non-oiseau": T;
  flore: T;
};

export interface TAXREF_ROW {
  CD_NOM: string;
  CD_REF: string;
  LB_NOM: string;
  NOM_VERN: string;
  CLASSE: Classe;
  REGNE: Regne;
}

export interface BDC_STATUT_ROW {
  CD_NOM: TAXREF_ROW["CD_NOM"];
  CD_REF: TAXREF_ROW["CD_REF"];
  CD_TYPE_STATUT: "POM" | "PD" | "PN" | "PR" | "Espèce manquante";
  LABEL_STATUT: string;
  CD_DOC: string;
  FULL_CITATION: string;
  DOC_URL: string;
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

export interface ESPECES_MINISTERIELLES_ROW {
  "Nom vernaculaire": string;
  "Nom scientifique": string;
}

export interface ESPECES_CNPN_ROW {
  "Nom vernaculaire": string;
  "Nom scientifique": string;
}

export interface EspeceProtegee {
  CD_REF: TAXREF_ROW["CD_REF"];
  nomsVernaculaires: Set<TAXREF_ROW["NOM_VERN"]>;
  nomsScientifiques: Set<TAXREF_ROW["LB_NOM"]>;
  classification: ClassificationEtreVivant;
  CD_TYPE_STATUTS: Set<BDC_STATUT_ROW["CD_TYPE_STATUT"]>;
  statutsProtection?: StatutProtection[];
  espèceMinistérielle: undefined | "O";
  espèceCNPN: undefined | "O";
}

export type EspeceProtegeeStrings = StringValues<EspeceProtegee>;

export interface ActiviteMenancante {
  "Code rapportage européen": string;
  "Identifiant Pitchou": string;
  "Libellé activité directive européenne": string;
  "Libellé Pitchou": string;
  Méthode: "Oui" | "Non";
  "Moyen de poursuite": "Oui" | "Non";
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
