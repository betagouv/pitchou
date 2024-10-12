export interface BaseChampDS {
    id: string
    champDescriptorId: string
    __typename: string
    label: string
    stringValue: string
    updatedAt: string
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

interface BaseChampDSCommune extends BaseChampDS {
    commune: DémarchesSimpliféesCommune
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSCommunes = BaseRepetitionChampsDS<BaseChampDSCommune>

export interface DémarchesSimpliféesDépartement {
    name: string
    code: string
}

interface BaseChampDSDépartement extends BaseChampDS {
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSDépartements = BaseRepetitionChampsDS<BaseChampDSDépartement>

export interface BaseChampDSRégion extends BaseChampDS {
    region: {
        code: string
        name: string
    }
}

export type ChampDSRégions = BaseRepetitionChampsDS<ChampDSRégions>

export interface BaseDossierDS<ChampDS> {
    id: number
    number: number
    dateDepot: string 
    state: string
    demandeur: DemandeurDS
    champs: ChampDS[]
    annotations: ChampDS[]
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


export interface Dossier{
    groupeInstructeur: GroupeInstructeurs
    instructeurs: Instructeur[]
    champs: any[]
    annotations: any[]
    messages: Message[]
}
