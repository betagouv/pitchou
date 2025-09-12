import {default as Dossier} from './database/public/Dossier.ts'
import {default as DécisionAdministrative} from './database/public/DécisionAdministrative.ts'

export type DossierPourGeoMCE = Dossier
    & Pick<DécisionAdministrative, 'date_signature'>
    & { instructeurs: GeoMceInstructeur[] }

export interface GeoMceMessage {
    projet: GeoMceProjet
    procedure: GeoMceProcedure
    mesures: GeoMceMesure[]
}

export interface GeoMceProjet {
    ref: string
    nom: string
    description: string
    localisations: string[] | null
    avancement: "Autorisé" | "Annulé" | "Cessation d’activité" | "Partiellement autorisé",
    typologies: GeoMceTypologies[] | null
    maitrise_ouvrage: GeoMceMaitriseOuvrage[] | null
    emprise: GeoMceEmprise[] | null
}

export interface GeoMceTypologies {
    typologie: string
    "sous-typologie": string
}

export interface GeoMceMaitriseOuvrage {
    siret: string
}

export type GeoMceEmprise = GeoJsonFeature;

export interface GeoJsonFeature {
    type: "Feature"
    geometry: GeoJsonGeometry
}

export type GeoJsonGeometry = GeoJsonPolygon;

export interface GeoJsonPolygon {
    type: "Polygon"
    coordinates: GeoJsonCoordinates[]
}

export type GeoJsonCoordinates = [ number, number ];

export interface GeoMceProcedure {
    num_dossier: string
    type: "En Attente de GeoMCE Dérogation Espèces Protégées"
    description: string
    references: string[]
    date_decision: string | null // ISO8601Date
    instructeurs: GeoMceInstructeur[]
    autorite_decisionnaire: "Préfet" | "Ministre" | "Autre" | null
    specimens_faunes: GeoMceSpecimenFaune[]
    specimens_flores: GeoMceSpecimenFlores[]
    emprises: GeoMceEmprise[]
}

export interface GeoMceInstructeur {
    email: string
    date_from: string
}

export interface GeoMceSpecimenFaune {
    nom_scientifique: string
    couples: number
    oeufs: number | null
    nids: number | null
    siteelevage: number | null
    airederepos: number | null
}

export interface GeoMceSpecimenFlores {
    nom_scientifique: string
    pieds: number | null
    stations: number | null
    surface: number | null
}

export interface GeoMceMesure {
    nom: string
    description: string
    categorie: string
    montant_prevu: number
    montant_reel: number
    cout_suivi: number
    duree_prescrite_realisation: string
    commentaire: string
    champ_cibles: ChampCible[]
    decision: string
    reference_etude_impact: string
    specimens_faunes: GeoMceSpecimenFaune[]
    specimens_flores: GeoMceSpecimenFlores[]
    emprises: GeoMceEmprise[]
}

type ChampCible = 1 | 4 | 5 | 8 | 9 | 12 | 13 | 99 | 7 | 10 | 14 | 6 | 2 | 11;
