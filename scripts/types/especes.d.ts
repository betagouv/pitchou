export type StringValues<T> = {
    [K in keyof T]: string;
}

export type Règne = 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista'
export type Classe = 'Aves' | 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' 
export type ClassificationEtreVivant = "oiseau" | "faune non-oiseau" | "flore"

/**
 * Lignes du fichier TAXREF.txt (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 */
export interface TAXREF_ROW {
    CD_NOM: string,
    CD_REF: string,
    LB_NOM: string,
    NOM_VERN: string,
    CLASSE: Classe,
    REGNE: Règne,
    // incomplet
}

/**
 * Lignes du fichier BDC_STATUT.csv (INPN)
 * Il peut y avoir plusieurs lignes avec le même CD_NOM si l'espèce est protégées à plusieurs endroits
 */

export interface BDC_STATUT_ROW {
    CD_NOM: TAXREF_ROW['CD_NOM'],
    CD_REF: TAXREF_ROW['CD_REF'],
    CD_TYPE_STATUT: 'POM' | 'PD' | 'PN' | 'PR' | 'Protection Pitchou',
    LABEL_STATUT: string,
    // incomplet
}

/**
 * Lignes du fichier liste-espèces-protégées.csv
 * Il peut y avoir plusieurs lignes avec le même CD_REF (mais différents CD_NOM) si l'espèce a des synonymes 
 */
export interface EspèceProtégée {
    CD_REF: TAXREF_ROW['CD_REF'],
    // TAXREF_ROW['NOM_VERN'] contient parfois plusieurs noms. Ils sont séparés dans le set
    nomsVernaculaires: Set<TAXREF_ROW['NOM_VERN']>, 
    // plusieurs noms si plusieurs CD_NOM pour le même CD_REF
    nomsScientifiques: Set<TAXREF_ROW['LB_NOM']>,
    classification: ClassificationEtreVivant,
    // types de protection associées à cette espèce
    CD_TYPE_STATUTS: Set<BDC_STATUT_ROW['CD_TYPE_STATUT']>,
}

/** 
 * Les Set<string> deviennent des string séparés par des `,`
 */
export type EspèceProtégéeStrings = StringValues<EspèceProtégée>

export interface ActivitéMenançante {
    Code: string,
    Espèces: ClassificationEtreVivant,
    "Libellé long": string,
    "étiquette affichée": string,
    Méthode: 'o' | 'n',
    transport: 'o' | 'n',
}

export interface MéthodeMenançante {
    Code: string,
    Espèces: ClassificationEtreVivant,
    "Libellé long": string,
    "étiquette affichée": string,
}

export interface TransportMenançant {
    Code: string,
    Espèces: ClassificationEtreVivant,
    "Libellé long": string,
    "étiquette affichée": string,
}

export interface EtreVivantAtteint {
    espèce: EspèceProtégée,
    nombreIndividus?: string,
    surfaceHabitatDétruit?: number,
}

export interface EtreVivantAtteintJSON {
    espèce: EspèceProtégée['CD_REF'],
    espece?: EspèceProtégée['CD_REF'], // deprecated
    nombreIndividus?: string,
    surfaceHabitatDétruit?: number,
}

export interface FloreAtteinte extends EtreVivantAtteint {
    activité?: ActivitéMenançante,
}

export interface FloreAtteinteJSON extends EtreVivantAtteintJSON {
    activité?: string,
}

export interface FauneNonOiseauAtteinte extends EtreVivantAtteint {
    activité?: ActivitéMenançante,
    méthode?: MéthodeMenançante,
    transport?: TransportMenançant,
}

export interface FauneNonOiseauAtteinteJSON extends EtreVivantAtteintJSON {
    activité?: string,
    méthode?: string,
    transport?: string,
}

export interface OiseauAtteint extends EtreVivantAtteint {
    activité?: ActivitéMenançante,
    méthode?: MéthodeMenançante,
    transport?: TransportMenançant,
    nombreNids?: number,
    nombreOeufs?: number,
}

export interface OiseauAtteintJSON extends EtreVivantAtteintJSON {
    activité?: string,
    méthode?: string,
    transport?: string,
    nombreNids?: number,
    nombreOeufs?: number,
}

export interface DescriptionMenacesEspèces {
    oiseau: OiseauAtteint[],
    "faune non-oiseau": FauneNonOiseauAtteinte[],
    flore: FloreAtteinte[],
}

export interface DescriptionMenaceEspèceJSON {
    classification: ClassificationEtreVivant,
    etresVivantsAtteints: (OiseauAtteintJSON|FauneNonOiseauAtteinteJSON|FloreAtteinteJSON)[],
}

export type NomGroupeEspèces = string

export interface EspèceSimplifiée {
    CD_REF: EspèceProtégée['CD_REF'],
    nom: string
}

export type GroupesEspèces = Record<NomGroupeEspèces, (EspèceSimplifiée | string)[]>