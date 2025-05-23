import {StringValues} from '../types/tools.d.ts'

export type Règne = 'Animalia' | 'Plantae' | 'Fungi' | 'Chromista'
export type Classe = 'Aves' | 'Amphibia' | 'Actinopterygii' | 'Malacostraca' | 'Mammalia' | 'Anthozoa' | 'Equisetopsida' | 'Gastropoda' | 'Insecta' | 'Bivalvia' | 'Petromyzonti' | 'Lecanoromycetes' | 'Ulvophyceae' | 'Holothuroidea' | 'Elasmobranchii' | 'Arachnida' | 'Charophyceae' | 'Cephalopoda' | 'Echinoidea' | 'Phaeophyceae' 
export type ClassificationEtreVivant = "oiseau" | "faune non-oiseau" | "flore"

export type ParClassification<T> = {
    oiseau: T,
    "faune non-oiseau": T
    flore: T
}

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

// d'après la nomenclature pour le rapportage à la Commission Européenne
export type CodeActivitéStandard = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80' | '90'

// pour quand on veut réunir ou séparer des activités
export type CodeActivitéPitchou = '4-1-pitchou-aires' | '4-2-pitchou-nids' | '4-3-pitchou-œufs' | 'mix-1-10-3-30-6-40';




export interface ActivitéMenançante {
    Code: CodeActivitéStandard | CodeActivitéPitchou,
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
