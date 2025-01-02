export interface BaseChampDS {
    id: string
    champDescriptorId: string
    __typename: string
    label: string
    stringValue: string
    updatedAt: string // ISO8601DateTime
    prefilled: boolean
}

interface BaseRepetitionChampsDS<ChampDSSpecific> extends BaseChampDS {
    rows: {
        champs: ChampDSSpecific[]
    }[]
}

export interface DemandeurDS {
    prenom: string
    nom: string
    email: string
}

export interface DémarchesSimpliféesCommune{
    name: string
    code: string
    postalCode: string
}

export interface DémarchesSimpliféesDépartement {
    name: string
    code: string
}


interface BaseChampDSCommune extends BaseChampDS {
    commune: DémarchesSimpliféesCommune
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSCommunes = BaseRepetitionChampsDS<BaseChampDSCommune>


export interface ChampDSDépartement extends BaseChampDS {
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSDépartements = BaseRepetitionChampsDS<ChampDSDépartement>

export interface BaseChampDSRégion extends BaseChampDS {
    region: {
        code: string
        name: string
    }
}

export type ChampDSRégions = BaseRepetitionChampsDS<ChampDSRégions>

interface DSPieceJustificative{
    filename: string,
    url: string, 
    contentType: string,
    createdAt: string, // ISO8601DateTime
    byteSize: string, // parseable as number, censé être déprécié
    byteSizeBigInt: string, // parseable as number
    checksum: string,
}

export interface ChampDSPieceJustificative extends BaseChampDS {
    files: DSPieceJustificative[]
}



export type DeletedDossier = any // PPP
export type PendingDeletedDossier = any // PPP

export interface Instructeur{
    id: string
    email: string
}

export interface GroupeInstructeurs{
    label: string
    instructeurs: Instructeur[]
}

export interface Message{
    id: string
    email: string
    body: string
    createdAt: string // représentant une date
    attachments: any[]
}

export interface Traitement{
    state: 'en_construction' | 'en_instruction' | 'accepte' | 'sans_suite' | 'refuse'
    emailAgentTraitant: string | null
    dateTraitement: string // représentant une date
    motivation: string | null
}


export interface Dossier<ChampDS> {
    id: string
    number: string
    dateDepot: Date 
    state: string
    demandeur: DemandeurDS
    groupeInstructeur: GroupeInstructeurs
    instructeurs: Instructeur[]
    messages: Message[]
    traitements: Traitement[]
    champs: ChampDS[]
    annotations: ChampDS[]
}
