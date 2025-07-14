export interface BaseChampDS {
    id: string
    champDescriptorId: string
    __typename: string
    label: string
    stringValue: string
    updatedAt: string // ISO8601DateTime
    prefilled: boolean
}

export interface ChampDSCheckbox extends BaseChampDS{
    value: boolean
    checked: boolean
}
export interface ChampDSDate extends BaseChampDS{
    date: string // ISO8601Date
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

interface ChampDSCommune extends BaseChampDS {
    commune: DémarchesSimpliféesCommune
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSCommunes = BaseRepetitionChampsDS<ChampDSCommune>


export interface ChampDSDépartement extends BaseChampDS {
    departement: DémarchesSimpliféesDépartement
}

export type ChampDSDépartements = BaseRepetitionChampsDS<ChampDSDépartement>

export interface ChampDSRégion extends BaseChampDS {
    region: {
        code: string
        name: string
    }
}

export type ChampDSRégions = BaseRepetitionChampsDS<ChampDSRégion>

export type ChampScientifiqueIntervenants = BaseRepetitionChampsDS<BaseChampDS>

export interface DSPieceJustificative{
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
    event: 'accepte' | 'accepte_automatiquement' | 
        'classe_sans_suite' | 
        'depose' | 'depose_correction_instructeur' | 'depose_correction_usager' | 
        'passe_en_instruction' | 'passe_en_instruction_automatiquement' | 
        'refuse' | 'refuse_automatiquement' | 
        'repasse_en_construction' | 'repasse_en_instruction'
    emailAgentTraitant: string | null
    dateTraitement: string // représentant une date
    motivation: string | null
}

export type Champs88444 = BaseChampDS | ChampDSCheckbox | ChampDSCommune | ChampDSDépartement | ChampDSRégions | ChampDSPieceJustificative;
export type Annotations88444 = BaseChampDS | ChampDSCheckbox | ChampDSDate


export interface DossierDS<Champs, Annotations> {
    id: string
    number: number
    dateDepot: Date 
    state: string
    demandeur: DemandeurDS
    groupeInstructeur: GroupeInstructeurs
    instructeurs: Instructeur[]
    messages: Message[]
    traitements: Traitement[]
    champs: Champs[]
    annotations: Annotations[]
}

export type DossierDS88444 = DossierDS<Champs88444, Annotations88444>